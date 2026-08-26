import type { FetchError } from 'ofetch'

// Extrai a mensagem de erro devolvida pelo backend (formato { error: string }).
// O ofetch guarda o corpo da resposta de erro em `err.data`, não em `err.response.data`.
export function extractApiError(err: unknown, fallback: string): string {
  const data = (err as FetchError | undefined)?.data as { error?: string } | undefined
  return data?.error ?? fallback
}
