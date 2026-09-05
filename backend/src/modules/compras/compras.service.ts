import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import prisma from '../../shared/lib/prisma'
import { ComprasRequest } from './compras.schema'

// Utilizador placeholder para faturas cujo email não corresponde a nenhuma
// conta registada — evita atribuir a compra a um utilizador real ao acaso
// (ou rebentar se esse id não existir). Password aleatória: ninguém consegue
// entrar com esta conta, é só um "dono" válido para os registos.
const SYSTEM_USER_EMAIL = 'sistema@carrinho-compras.local'

async function getOrCreateSystemUser(): Promise<{ id: number }> {
  const existing = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
  })
  if (existing) return existing

  try {
    return await prisma.user.create({
      data: {
        email: SYSTEM_USER_EMAIL,
        name: 'Sistema (importação automática)',
        password: await bcrypt.hash(randomUUID(), 12),
        role: 'USER',
      },
    })
  } catch (err) {
    // outro pedido concorrente já criou o utilizador entretanto
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const created = await prisma.user.findUnique({
        where: { email: SYSTEM_USER_EMAIL },
      })
      if (created) return created
    }
    throw err
  }
}

// Os nomes vêm do texto da fatura e são comparados sem distinguir maiúsculas,
// tal como as queries fazem com `mode: 'insensitive'`. Esta chave é o
// equivalente do lado do JavaScript, para os mapas casarem com o que a base
// de dados devolveu.
function chave(nome: string) {
  return nome.toLowerCase()
}

// Produto + variante a que uma linha da fatura vai ser atribuída. `name` é o
// nome tal como está na base de dados (que pode diferir do da fatura só nas
// maiúsculas), porque é esse que vai na resposta.
type Alvo = { productId: number; variantId: number; name: string }

export async function registarCompra(body: ComprasRequest) {
  const [day, month, year] = body.data.split('/')
  const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`)

  // emailVerified: true é obrigatório aqui — sem isto, mudar o próprio email
  // para o de outra pessoa (mesmo sem o confirmar) bastaria para sequestrar
  // as faturas dela assim que chegassem via n8n.
  const user = await prisma.user.findFirst({
    where: {
      email: { equals: body.email, mode: 'insensitive' },
      emailVerified: true,
    },
  })

  const userId = user ? user.id : (await getOrCreateSystemUser()).id

  // Uma fatura pode ter vários produtos — se um falhar a meio (ex: produto
  // duplicado, FK inválida), a transação garante que não ficam preços
  // registados sem os produtos correspondentes nem vice-versa.
  //
  // O `timeout` explícito é uma rede de segurança: o valor por omissão do
  // Prisma são 5s e uma fatura de 30 produtos chegou a levar 15,7s na VM,
  // rebentando com P2028 (05/09/2026). O trabalho aqui dentro passou a ser
  // feito em lote — meia dúzia de queries em vez de três por produto —, mas
  // numa VM lenta e com uma fatura no limite dos 500 produtos a margem
  // continua a ser precisa.
  return prisma.$transaction(
    async (tx) => {
      let supermarket = await tx.supermarket.findFirst({
        where: { name: { equals: body.local, mode: 'insensitive' } },
      })
      if (!supermarket) {
        supermarket = await tx.supermarket.create({
          data: { name: body.local, createdById: userId },
        })
      }

      // Idempotência: uma repetição do workflow n8n (timeout seguido de retry)
      // não pode voltar a criar os preços todos da mesma fatura. Se já cá está,
      // devolve-se o resultado da importação original em vez de duplicar.
      // A verificação prévia resolve o caso real (retries sequenciais); o
      // @@unique([invoiceRef, supermarketId, invoiceLine]) é a rede de segurança
      // se dois pedidos iguais correrem em paralelo — o segundo aborta com P2002
      // (409) em vez de duplicar.
      const jaImportada = await tx.priceRecord.findMany({
        where: { invoiceRef: body.fatura, supermarketId: supermarket.id },
        orderBy: { invoiceLine: 'asc' },
        include: { product: { select: { name: true } } },
      })

      if (jaImportada.length > 0) {
        return {
          supermarketId: supermarket.id,
          productsCreated: 0,
          pricesCreated: 0,
          alreadyImported: true,
          records: jaImportada.map((r) => ({
            product: r.product?.name ?? '(produto entretanto removido)',
            price: r.price,
            priceRecordId: r.id,
          })),
        }
      }

      // A mesma linha de fatura pode repetir-se (duas embalagens do mesmo
      // artigo). Trata-se cada nome distinto uma só vez — é o que o antigo
      // ciclo já fazia na prática, porque a segunda passagem encontrava o
      // produto criado na primeira. Fica a primeira grafia vista na fatura,
      // pela mesma razão: era essa que dava o nome ao produto criado.
      const vistos = new Set<string>()
      const nomesDistintos = body.produtos
        .map((p) => p.produto)
        .filter((nome) => {
          if (vistos.has(chave(nome))) return false
          vistos.add(chave(nome))
          return true
        })

      // Uma query para todos os nomes da fatura, em vez de um findFirst por
      // linha. `orderBy: id` torna determinística a escolha quando há vários
      // produtos com o mesmo nome (o findFirst devolvia um qualquer).
      const existentes = await tx.product.findMany({
        where: { name: { in: nomesDistintos, mode: 'insensitive' } },
        orderBy: { id: 'asc' },
        select: { id: true, name: true, variants: { select: { id: true } } },
      })

      const alvos = new Map<string, Alvo>()
      for (const produto of existentes) {
        // Um produto já curado à mão, com 0 ou 2+ variantes, não tem variante
        // inequívoca a que atribuir o preço — nunca se adivinha, salta-se.
        // Continua-se a procurar: se existir outro produto com o mesmo nome e
        // uma só variante (tipicamente o placeholder de uma importação
        // anterior), é esse que serve. O findFirst antigo não fazia isto —
        // devolvia um produto qualquer com aquele nome e, se calhasse no
        // curado, criava mais um placeholder duplicado a cada importação da
        // mesma linha de fatura. Entre os candidatos válidos ganha o de id
        // mais baixo, o que torna a escolha determinística.
        if (alvos.has(chave(produto.name)) || produto.variants.length !== 1)
          continue
        alvos.set(chave(produto.name), {
          productId: produto.id,
          variantId: produto.variants[0].id,
          name: produto.name,
        })
      }

      const porCriar = nomesDistintos.filter((nome) => !alvos.has(chave(nome)))

      if (porCriar.length > 0) {
        const criados = await tx.product.createManyAndReturn({
          data: porCriar.map((name) => ({
            name,
            needsReview: true,
            createdById: userId,
          })),
          select: { id: true, name: true },
        })
        const variantes = await tx.productVariant.createManyAndReturn({
          data: criados.map((p) => ({
            productId: p.id,
            unit: 'un',
            createdById: userId,
          })),
          select: { id: true, productId: true },
        })

        const variantePorProduto = new Map(
          variantes.map((v) => [v.productId, v.id])
        )
        for (const produto of criados) {
          const variantId = variantePorProduto.get(produto.id)
          if (variantId === undefined) {
            throw new Error(`Variante não criada para o produto ${produto.id}`)
          }
          alvos.set(chave(produto.name), {
            productId: produto.id,
            variantId,
            name: produto.name,
          })
        }
      }

      const alvoDaLinha = body.produtos.map((item) => {
        const alvo = alvos.get(chave(item.produto))
        if (!alvo)
          throw new Error(`Produto não resolvido na fatura: ${item.produto}`)
        return alvo
      })

      const precos = await tx.priceRecord.createManyAndReturn({
        data: body.produtos.map((item, linha) => ({
          productId: alvoDaLinha[linha].productId,
          variantId: alvoDaLinha[linha].variantId,
          supermarketId: supermarket.id,
          price: item.valor,
          quantity: 1,
          notes: `Registado através da importação da fatura ${body.fatura}`,
          invoiceRef: body.fatura,
          invoiceLine: linha,
          date,
          createdById: userId,
        })),
        select: { id: true, invoiceLine: true },
      })

      const idPorLinha = new Map(precos.map((p) => [p.invoiceLine, p.id]))

      return {
        supermarketId: supermarket.id,
        productsCreated: porCriar.length,
        pricesCreated: precos.length,
        alreadyImported: false,
        records: body.produtos.map((item, linha) => {
          const priceRecordId = idPorLinha.get(linha)
          if (priceRecordId === undefined) {
            throw new Error(`Preço não criado para a linha ${linha} da fatura`)
          }
          return {
            product: alvoDaLinha[linha].name,
            price: item.valor,
            priceRecordId,
          }
        }),
      }
    },
    // A VM de produção chegou a levar 170ms por ida-e-volta ao Postgres; 20s
    // dá folga larga para a fatura maior que o schema permite, mesmo aí.
    { timeout: 20_000, maxWait: 10_000 }
  )
}
