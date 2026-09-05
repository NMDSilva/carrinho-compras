import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'

// O processamento da fatura corre dentro de prisma.$transaction — o mock
// invoca o callback com o próprio prismaMock, para os mocks por-model
// (supermarket/product/priceRecord) funcionarem como esperado.
//
// Prepara também a verificação de idempotência (`priceRecord.findMany` pelo
// invoiceRef) a responder "fatura ainda não importada", que é o caminho normal
// de quase todos os testes. Como é um `mockResolvedValue` (e não `...Once`), um
// teste que precise do caminho contrário só tem de acrescentar um
// `mockResolvedValueOnce` — os "once" são consumidos primeiro.
function mockTransaction() {
  prismaMock.$transaction.mockImplementation((cb) =>
    (cb as (tx: typeof prismaMock) => unknown)(prismaMock)
  )
  prismaMock.priceRecord.findMany.mockResolvedValue([] as never)
}

// A ingestão trabalha em lote: uma query para procurar todos os nomes da
// fatura, e depois um createManyAndReturn para produtos, outro para variantes
// e outro para preços. Estes helpers montam essas respostas com ids
// previsíveis (produto i → id i+1, variante i → id 100+i) para os testes não
// repetirem o andaime todo.
function mockProdutosExistentes(
  produtos: { id: number; name: string; variants: { id: number }[] }[]
) {
  prismaMock.product.findMany.mockResolvedValueOnce(produtos as never)
}

function mockProdutosCriados(nomes: string[]) {
  prismaMock.product.createManyAndReturn.mockResolvedValueOnce(
    nomes.map((name, i) => ({ id: i + 1, name })) as never
  )
  prismaMock.productVariant.createManyAndReturn.mockResolvedValueOnce(
    nomes.map((_, i) => ({ id: 100 + i, productId: i + 1 })) as never
  )
}

function mockPrecosCriados(quantidade: number) {
  prismaMock.priceRecord.createManyAndReturn.mockResolvedValueOnce(
    Array.from({ length: quantidade }, (_, i) => ({
      id: i + 1,
      invoiceLine: i,
    })) as never
  )
}

// O caso mais comum: fatura nova, nenhum dos produtos existe ainda.
function mockFaturaNova(nomes: string[]) {
  mockProdutosExistentes([])
  mockProdutosCriados(nomes)
  mockPrecosCriados(nomes.length)
}

describe('compras routes (N8N)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    process.env.N8N_API_KEY = 'test-api-key'
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  const payload = {
    fatura: 'FAT-001',
    data: '15/06/2026',
    local: 'Continente',
    email: 'ana@example.com',
    total: 3.5,
    produtos: [{ produto: 'Leite', valor: 1.5 }],
  }

  it('rejeita pedido sem api key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      payload,
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejeita api key errada, com o mesmo comprimento da esperada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-kez' },
      payload,
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejeita api key errada, com comprimento diferente da esperada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'errada' },
      payload,
    })
    expect(res.statusCode).toBe(401)
  })

  it('regista compra com api key válida', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({
      id: 1,
      name: 'Continente',
    } as never)
    mockFaturaNova(['Leite'])

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload,
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({
      supermarketId: 1,
      productsCreated: 1,
      pricesCreated: 1,
      records: [{ product: 'Leite', price: 1.5, priceRecordId: 1 }],
    })
  })

  it('só associa a fatura a um utilizador com email confirmado (evita sequestro por troca de email)', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({
      id: 1,
      name: 'Continente',
    } as never)
    mockFaturaNova(['Leite'])

    await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload,
    })

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ emailVerified: true }),
      })
    )
  })

  it('usa o utilizador Sistema quando o email da fatura é desconhecido', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 99,
      email: 'sistema@carrinho-compras.local',
    } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({
      id: 1,
      name: 'Continente',
    } as never)
    mockFaturaNova(['Leite'])

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: { ...payload, email: 'desconhecido@example.com' },
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'sistema@carrinho-compras.local',
        }),
      })
    )
  })

  it('reutiliza o utilizador Sistema já existente em vez de recriar', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 99,
      email: 'sistema@carrinho-compras.local',
    } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({
      id: 1,
      name: 'Continente',
    } as never)
    mockFaturaNova(['Leite'])

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: { ...payload, email: 'desconhecido@example.com' },
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('recupera de uma criação concorrente do utilizador Sistema', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 99,
        email: 'sistema@carrinho-compras.local',
      } as never)
    prismaMock.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
      })
    )
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({
      id: 1,
      name: 'Continente',
    } as never)
    mockFaturaNova(['Leite'])

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: { ...payload, email: 'desconhecido@example.com' },
    })

    expect(res.statusCode).toBe(201)
  })

  describe('escolha do produto e da variante', () => {
    it('reutiliza a variante quando o produto encontrado já tem exatamente uma', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      mockProdutosExistentes([{ id: 7, name: 'Leite', variants: [{ id: 42 }] }])
      mockPrecosCriados(1)

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload,
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ productsCreated: 0 })
      expect(prismaMock.product.createManyAndReturn).not.toHaveBeenCalled()
      expect(prismaMock.priceRecord.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ variantId: 42 })],
        })
      )
    })

    it('cria um novo placeholder quando o produto encontrado já tem 2+ variantes (nunca adivinha qual)', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      mockProdutosExistentes([
        { id: 7, name: 'Leite', variants: [{ id: 1 }, { id: 2 }] },
      ])
      mockProdutosCriados(['Leite'])
      mockPrecosCriados(1)

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload,
      })

      expect(res.statusCode).toBe(201)
      expect(prismaMock.product.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ needsReview: true })],
        })
      )
      expect(prismaMock.priceRecord.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ variantId: 100 })],
        })
      )
    })

    it('prefere o placeholder de uma variante a criar mais um duplicado, havendo outro produto com o mesmo nome já curado', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      // O de id mais baixo foi curado à mão (2 variantes) e não serve; o
      // segundo é o placeholder de uma importação anterior e serve.
      mockProdutosExistentes([
        { id: 7, name: 'Leite', variants: [{ id: 1 }, { id: 2 }] },
        { id: 9, name: 'leite', variants: [{ id: 42 }] },
      ])
      mockPrecosCriados(1)

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload,
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ productsCreated: 0 })
      expect(prismaMock.product.createManyAndReturn).not.toHaveBeenCalled()
      expect(prismaMock.priceRecord.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ variantId: 42 })],
        })
      )
    })

    it('trata duas linhas com o mesmo produto como um só produto, mas dois preços', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      mockProdutosExistentes([])
      mockProdutosCriados(['Leite'])
      mockPrecosCriados(2)

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload: {
          ...payload,
          produtos: [
            { produto: 'Leite', valor: 1.5 },
            { produto: 'leite', valor: 1.5 },
          ],
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({
        productsCreated: 1,
        pricesCreated: 2,
      })
      expect(prismaMock.product.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ name: 'Leite' })],
        })
      )
      expect(prismaMock.priceRecord.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ variantId: 100, invoiceLine: 0 }),
            expect.objectContaining({ variantId: 100, invoiceLine: 1 }),
          ],
        })
      )
    })
  })

  it('propaga o erro (sem responder 201) se a gravação dos preços falhar', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({
      id: 1,
      name: 'Continente',
    } as never)
    mockProdutosExistentes([])
    mockProdutosCriados(['Leite', 'Pão'])
    prismaMock.priceRecord.createManyAndReturn.mockRejectedValueOnce(
      new Error('falha a gravar os preços da fatura')
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: {
        ...payload,
        produtos: [
          { produto: 'Leite', valor: 1.5 },
          { produto: 'Pão', valor: 2 },
        ],
      },
    })

    expect(res.statusCode).toBe(500)
  })

  describe('transação', () => {
    // Regressão do P2028 de 05/09/2026: uma fatura de 30 produtos levou 15,7s
    // na VM e rebentou contra o limite de 5s por omissão do Prisma.
    it('dá um timeout explícito à transação, bem acima do valor por omissão do Prisma', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      mockFaturaNova(['Leite'])

      await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload,
      })

      expect(prismaMock.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ timeout: 20_000 })
      )
    })

    it('responde 503 (e não 500 mudo) quando a transação expira', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      mockProdutosExistentes([])
      mockProdutosCriados(['Leite'])
      prismaMock.priceRecord.createManyAndReturn.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          'Transaction API error: A query cannot be executed on an expired transaction.',
          { code: 'P2028', clientVersion: '7.10.0' }
        )
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload,
      })

      expect(res.statusCode).toBe(503)
    })

    it('faz uma mão-cheia de queries, e não três por produto', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      const nomes = Array.from({ length: 30 }, (_, i) => `Produto ${i}`)
      mockFaturaNova(nomes)

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload: {
          ...payload,
          produtos: nomes.map((produto) => ({ produto, valor: 1 })),
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({
        productsCreated: 30,
        pricesCreated: 30,
      })
      // Uma query para procurar os 30 nomes, uma para os criar, uma para as
      // variantes, uma para os preços — não 30 de cada.
      expect(prismaMock.product.findMany).toHaveBeenCalledTimes(1)
      expect(prismaMock.product.createManyAndReturn).toHaveBeenCalledTimes(1)
      expect(
        prismaMock.productVariant.createManyAndReturn
      ).toHaveBeenCalledTimes(1)
      expect(prismaMock.priceRecord.createManyAndReturn).toHaveBeenCalledTimes(
        1
      )
    })
  })

  describe('idempotência', () => {
    it('grava o número e a linha da fatura em cada preço', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      mockFaturaNova(['Leite', 'Pão'])

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload: {
          ...payload,
          produtos: [
            { produto: 'Leite', valor: 1.5 },
            { produto: 'Pão', valor: 2 },
          ],
        },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({
        alreadyImported: false,
        pricesCreated: 2,
      })
      expect(prismaMock.priceRecord.createManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ invoiceRef: 'FAT-001', invoiceLine: 0 }),
            expect.objectContaining({ invoiceRef: 'FAT-001', invoiceLine: 1 }),
          ],
        })
      )
    })

    it('não volta a criar nada quando a fatura já foi importada', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      prismaMock.priceRecord.findMany.mockResolvedValueOnce([
        { id: 7, price: 1.5, invoiceLine: 0, product: { name: 'Leite' } },
      ] as never)

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload,
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({
        alreadyImported: true,
        productsCreated: 0,
        pricesCreated: 0,
        records: [{ product: 'Leite', price: 1.5, priceRecordId: 7 }],
      })
      expect(prismaMock.priceRecord.createManyAndReturn).not.toHaveBeenCalled()
      expect(prismaMock.product.createManyAndReturn).not.toHaveBeenCalled()
    })

    it('procura a fatura já importada pelo número e pelo supermercado', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 42,
        name: 'Continente',
      } as never)
      mockFaturaNova(['Leite'])

      await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload,
      })

      expect(prismaMock.priceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { invoiceRef: 'FAT-001', supermarketId: 42 },
        })
      )
    })
  })

  describe('validação do payload', () => {
    it('rejeita uma data com formato válido mas inexistente no calendário', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload: { ...payload, data: '32/13/2026' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('aceita o 29 de fevereiro num ano bissexto', async () => {
      mockTransaction()
      prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
      prismaMock.supermarket.findFirst.mockResolvedValueOnce({
        id: 1,
        name: 'Continente',
      } as never)
      mockFaturaNova(['Leite'])

      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload: { ...payload, data: '29/02/2024' },
      })

      expect(res.statusCode).toBe(201)
    })

    it('rejeita o 29 de fevereiro num ano não bissexto', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload: { ...payload, data: '29/02/2026' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('rejeita uma fatura com produtos a mais', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/compras',
        headers: { 'x-api-key': 'test-api-key' },
        payload: {
          ...payload,
          produtos: Array.from({ length: 501 }, (_, i) => ({
            produto: `P${i}`,
            valor: 1,
          })),
        },
      })

      expect(res.statusCode).toBe(400)
    })
  })
})
