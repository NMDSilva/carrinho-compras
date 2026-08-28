import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

describe('products routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lista produtos publicamente', async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([
      { id: 1, name: 'Leite', category: null, needsReview: false, variants: [] } as never,
    ])

    const res = await app.inject({ method: 'GET', url: '/api/products' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('filtra produtos por rever', async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([
      { id: 2, name: 'ACUCAR BR SIDUL EMB PAPEL 1KG', category: null, needsReview: true, variants: [] } as never,
    ])

    const res = await app.inject({ method: 'GET', url: '/api/products?needsReview=true' })

    expect(res.statusCode).toBe(200)
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.arrayContaining([{ needsReview: true }]) }),
      })
    )
  })

  it('devolve 404 para produto inexistente', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null)

    const res = await app.inject({ method: 'GET', url: '/api/products/999' })

    expect(res.statusCode).toBe(404)
  })

  it('cria produto autenticado', async () => {
    prismaMock.product.create.mockResolvedValueOnce({
      id: 1,
      name: 'Leite',
      category: null,
      needsReview: false,
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: 'Leite' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('rejeita criação sem autenticação', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { name: 'Leite' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('valida payload inválido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: '' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('elimina produto próprio', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, createdById: 1 } as never)
    prismaMock.product.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/products/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(204)
  })

  it('rejeita eliminação de produto de outro utilizador', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/products/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(403)
  })

  it('admin elimina produto de outro utilizador', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)
    prismaMock.product.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/products/1',
      headers: authHeader(app, { sub: 99, role: 'ADMIN' }),
    })

    expect(res.statusCode).toBe(204)
  })

  it('rejeita atualização de produto de outro utilizador', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)

    const res = await app.inject({
      method: 'PUT',
      url: '/api/products/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: 'Leite meio gordo' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('marca produto como revisto', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, createdById: 1 } as never)
    prismaMock.product.update.mockResolvedValueOnce({ id: 1, needsReview: false } as never)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/products/1/review',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ needsReview: false })
  })

  it('rejeita marcar como revisto produto de outro utilizador', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/products/1/review',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(403)
  })

  describe('variantes', () => {
    it('lista variantes de um produto', async () => {
      prismaMock.productVariant.findMany.mockResolvedValueOnce([
        { id: 1, productId: 1, brand: 'Sidul', packageSize: 1, unit: 'kg' } as never,
      ])

      const res = await app.inject({ method: 'GET', url: '/api/products/1/variants' })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveLength(1)
    })

    it('cria variante autenticado', async () => {
      prismaMock.productVariant.create.mockResolvedValueOnce({
        id: 1,
        productId: 1,
        brand: 'Sidul',
        packageSize: 1,
        unit: 'kg',
      } as never)

      const res = await app.inject({
        method: 'POST',
        url: '/api/products/1/variants',
        headers: authHeader(app, { sub: 1, role: 'USER' }),
        payload: { brand: 'Sidul', packageSize: 1, unit: 'kg' },
      })

      expect(res.statusCode).toBe(201)
    })

    it('rejeita criação de variante sem autenticação', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products/1/variants',
        payload: { brand: 'Sidul', packageSize: 1, unit: 'kg' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('devolve 404 para variante inexistente', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValueOnce(null)

      const res = await app.inject({ method: 'GET', url: '/api/variants/999' })

      expect(res.statusCode).toBe(404)
    })

    it('rejeita atualização de variante de outro utilizador', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)

      const res = await app.inject({
        method: 'PUT',
        url: '/api/variants/1',
        headers: authHeader(app, { sub: 1, role: 'USER' }),
        payload: { brand: 'Continente' },
      })

      expect(res.statusCode).toBe(403)
    })

    it('elimina variante própria', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValueOnce({ id: 1, createdById: 1 } as never)
      prismaMock.productVariant.delete.mockResolvedValueOnce({} as never)

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/variants/1',
        headers: authHeader(app, { sub: 1, role: 'USER' }),
      })

      expect(res.statusCode).toBe(204)
    })

    it('rejeita reatribuição de variante de outro utilizador', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/variants/1/reassign',
        headers: authHeader(app, { sub: 1, role: 'USER' }),
        payload: { productId: 5 },
      })

      expect(res.statusCode).toBe(403)
    })

    it('reatribui variante para outro produto e elimina o placeholder de origem se ficar vazio', async () => {
      prismaMock.productVariant.findUnique.mockResolvedValueOnce({ id: 1, createdById: 1, productId: 2 } as never)
      prismaMock.$transaction.mockImplementationOnce((cb) => (cb as (tx: typeof prismaMock) => unknown)(prismaMock))
      prismaMock.productVariant.findUniqueOrThrow.mockResolvedValueOnce({ id: 1, productId: 2 } as never)
      prismaMock.productVariant.update.mockResolvedValueOnce({ id: 1, productId: 5 } as never)
      prismaMock.productVariant.count.mockResolvedValueOnce(0)
      prismaMock.product.delete.mockResolvedValueOnce({} as never)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/variants/1/reassign',
        headers: authHeader(app, { sub: 1, role: 'USER' }),
        payload: { productId: 5 },
      })

      expect(res.statusCode).toBe(200)
      expect(prismaMock.product.delete).toHaveBeenCalledWith({ where: { id: 2 } })
    })
  })
})
