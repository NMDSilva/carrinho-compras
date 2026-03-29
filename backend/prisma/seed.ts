import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

  async function upsertProduct(data: { name: string; brand: string | null; unit: string; category: string }) {
    const existing = await prisma.product.findFirst({ where: { name: data.name, brand: data.brand, unit: data.unit } })
    if (existing) return existing
    return prisma.product.create({ data })
  }

  const products = await Promise.all([
    upsertProduct({ name: 'Leite Meio-Gordo', brand: 'Mimosa', unit: 'L', category: 'Lacticínios' }),
    upsertProduct({ name: 'Pão de Forma', brand: null, unit: 'un', category: 'Padaria' }),
    upsertProduct({ name: 'Azeite Virgem Extra', brand: 'Gallo', unit: 'L', category: 'Óleos' }),
  ])

  await prisma.priceRecord.createMany({
    data: [
      { productId: products[0].id, supermarketId: supermarkets[0].id, price: 0.89, date: new Date('2024-11-01') },
      { productId: products[0].id, supermarketId: supermarkets[1].id, price: 0.85, date: new Date('2024-11-01') },
      { productId: products[0].id, supermarketId: supermarkets[2].id, price: 0.79, date: new Date('2024-11-01') },
      { productId: products[0].id, supermarketId: supermarkets[0].id, price: 0.92, date: new Date('2024-12-01') },
      { productId: products[0].id, supermarketId: supermarkets[1].id, price: 0.88, date: new Date('2024-12-01') },
      { productId: products[1].id, supermarketId: supermarkets[0].id, price: 1.29, date: new Date('2024-11-15') },
      { productId: products[1].id, supermarketId: supermarkets[1].id, price: 1.19, date: new Date('2024-11-15') },
      { productId: products[2].id, supermarketId: supermarkets[0].id, price: 4.99, date: new Date('2024-11-20') },
      { productId: products[2].id, supermarketId: supermarkets[1].id, price: 4.79, date: new Date('2024-11-20') },
    ],
  })

  console.log('Seed concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
