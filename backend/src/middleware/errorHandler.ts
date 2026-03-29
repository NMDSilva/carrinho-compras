import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`)

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
  }

  if (err.message.includes('Record to update not found') || err.message.includes('Record to delete not found')) {
    return res.status(404).json({ error: 'Registo não encontrado' })
  }

  if (err.message.includes('Unique constraint failed')) {
    return res.status(409).json({ error: 'Registo já existe' })
  }

  res.status(500).json({ error: 'Erro interno do servidor' })
}
