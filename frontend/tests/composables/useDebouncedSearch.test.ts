import { describe, it, expect, vi, afterEach } from 'vitest'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedSearch', () => {
  it('começa sem resultados e sem loading', () => {
    const { query, results, loading } = useDebouncedSearch(async () => [])
    expect(query.value).toBe('')
    expect(results.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('não chama fetch nem liga loading quando a query está vazia', () => {
    const fetch = vi.fn().mockResolvedValue([])
    const { query, loading, search } = useDebouncedSearch(fetch)

    query.value = '   '
    search()

    expect(fetch).not.toHaveBeenCalled()
    expect(loading.value).toBe(false)
  })

  it('faz debounce e liga loading só quando o pedido arranca de facto', async () => {
    const fetch = vi.fn().mockResolvedValue(['Leite'])
    const { query, results, loading, search } = useDebouncedSearch(fetch, 300)

    vi.useFakeTimers()
    query.value = 'leite'
    search()

    expect(fetch).not.toHaveBeenCalled()
    expect(loading.value).toBe(false)

    await vi.advanceTimersByTimeAsync(300)

    expect(fetch).toHaveBeenCalledWith('leite')
    expect(loading.value).toBe(false)
    expect(results.value).toEqual(['Leite'])
  })

  it('desliga loading mesmo que o pedido falhe', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('falhou'))
    const { query, loading, search } = useDebouncedSearch(fetch, 300)

    vi.useFakeTimers()
    query.value = 'leite'
    search()
    await vi.advanceTimersByTimeAsync(300).catch(() => {})

    expect(loading.value).toBe(false)
  })

  it('ignora uma resposta que chegue fora de ordem (pesquisa anterior mais lenta)', async () => {
    let resolveFirst: (v: string[]) => void
    const first = new Promise<string[]>((r) => (resolveFirst = r))
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce(['Água'])

    const { query, results, search } = useDebouncedSearch(fetch, 0)

    query.value = 'a'
    search()
    await new Promise((r) => setTimeout(r, 10)) // deixa o debounce (0ms) disparar a 1ª pesquisa

    query.value = 'ab'
    search()
    await new Promise((r) => setTimeout(r, 10)) // deixa a 2ª pesquisa disparar e resolver

    expect(fetch).toHaveBeenCalledTimes(2)
    // a segunda pesquisa ("ab") resolve primeiro
    expect(results.value).toEqual(['Água'])

    // a primeira ("a"), mais lenta, resolve depois — não deve sobrepor-se
    resolveFirst!(['Antigo'])
    await new Promise((r) => setTimeout(r, 10))

    expect(results.value).toEqual(['Água'])
  })

  it('clear() cancela o debounce pendente e repõe tudo', async () => {
    const fetch = vi.fn().mockResolvedValue(['Leite'])
    const { query, results, loading, search, clear } = useDebouncedSearch(
      fetch,
      300
    )

    vi.useFakeTimers()
    query.value = 'leite'
    search()
    clear()
    await vi.advanceTimersByTimeAsync(300)

    expect(fetch).not.toHaveBeenCalled()
    expect(query.value).toBe('')
    expect(results.value).toEqual([])
    expect(loading.value).toBe(false)
  })
})
