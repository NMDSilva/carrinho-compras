import { Request, Response, NextFunction } from 'express'

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key']
  const expected = process.env.N8N_API_KEY

  if (!expected) {
    return res.status(500).json({ error: 'API key não configurada no servidor' })
  }

  if (!key || key !== expected) {
    return res.status(401).json({ error: 'API key inválida ou ausente' })
  }

  next()
}
