import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId: number
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação necessária' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as { sub: string | number }
    ;(req as AuthRequest).userId = Number(payload.sub)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}
