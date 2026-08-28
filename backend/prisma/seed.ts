import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Prisma 7 exige um driver adapter explícito (ver backend/src/shared/lib/prisma.ts) —
// sem isto, `new PrismaClient()` falha com PrismaClientInitializationError.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const supermarkets = await Promise.all([
    prisma.supermarket.upsert({
      where: { name: 'Continente' },
      update: {},
      create: { name: 'Continente', location: 'Lisboa' },
    }),
    prisma.supermarket.upsert({
      where: { name: 'Pingo Doce' },
      update: {},
      create: { name: 'Pingo Doce', location: 'Lisboa' },
    }),
    prisma.supermarket.upsert({
      where: { name: 'Lidl' },
      update: {},
      create: { name: 'Lidl', location: 'Lisboa' },
    }),
    prisma.supermarket.upsert({
      where: { name: 'Aldi' },
      update: {},
      create: { name: 'Aldi', location: 'Lisboa' },
    }),
  ])

  // Cria (ou reutiliza) o produto genérico e uma variante marca+unidade —
  // devolve a variante, que é o que os preços passam a referenciar.
  async function upsertVariant(data: {
    productName: string
    category: string
    brand: string | null
    unit: string
  }) {
    let product = await prisma.product.findFirst({ where: { name: data.productName } })
    if (!product) {
      product = await prisma.product.create({ data: { name: data.productName, category: data.category } })
    }

    const existing = await prisma.productVariant.findFirst({
      where: { productId: product.id, brand: data.brand, unit: data.unit },
    })
    if (existing) return existing

    return prisma.productVariant.create({
      data: { productId: product.id, brand: data.brand, unit: data.unit },
    })
  }

  const variants = await Promise.all([
    upsertVariant({ productName: 'Leite Meio-Gordo', brand: 'Mimosa', unit: 'L', category: 'Lacticínios' }),
    upsertVariant({ productName: 'Pão de Forma', brand: null, unit: 'un', category: 'Padaria' }),
    upsertVariant({ productName: 'Azeite Virgem Extra', brand: 'Gallo', unit: 'L', category: 'Óleos' }),
  ])

  await prisma.priceRecord.createMany({
    data: [
      { variantId: variants[0].id, supermarketId: supermarkets[0].id, price: 0.89, date: new Date('2024-11-01') },
      { variantId: variants[0].id, supermarketId: supermarkets[1].id, price: 0.85, date: new Date('2024-11-01') },
      { variantId: variants[0].id, supermarketId: supermarkets[2].id, price: 0.79, date: new Date('2024-11-01') },
      { variantId: variants[0].id, supermarketId: supermarkets[0].id, price: 0.92, date: new Date('2024-12-01') },
      { variantId: variants[0].id, supermarketId: supermarkets[1].id, price: 0.88, date: new Date('2024-12-01') },
      { variantId: variants[1].id, supermarketId: supermarkets[0].id, price: 1.29, date: new Date('2024-11-15') },
      { variantId: variants[1].id, supermarketId: supermarkets[1].id, price: 1.19, date: new Date('2024-11-15') },
      { variantId: variants[2].id, supermarketId: supermarkets[0].id, price: 4.99, date: new Date('2024-11-20') },
      { variantId: variants[2].id, supermarketId: supermarkets[1].id, price: 4.79, date: new Date('2024-11-20') },
    ],
  })

  console.log('Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
