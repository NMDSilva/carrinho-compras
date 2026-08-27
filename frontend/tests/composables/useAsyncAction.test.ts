import { describe, it, expect } from 'vitest'
import { useAsyncAction } from '@/composables/useAsyncAction'

describe('useAsyncAction', () => {
  it('loading começa a false por omissão', () => {
    const { loading } = useAsyncAction()
    expect(loading.value).toBe(false)
  })

  it('loading começa a true com immediate:true (evita frame sem spinner antes do onMounted)', () => {
    const { loading } = useAsyncAction('erro', { immediate: true })
    expect(loading.value).toBe(true)
  })

  it('marca loading durante a execução e devolve o resultado', async () => {
    const { loading, error, run } = useAsyncAction()

    const promise = run(async () => {
      expect(loading.value).toBe(true)
      return 'ok'
    })

    const result = await promise

    expect(result).toBe('ok')
    expect(loading.value).toBe(false)
    expect(error.value).toBe('')
  })

  it('captura o erro e devolve undefined sem propagar a exceção', async () => {
    const { loading, error, run } = useAsyncAction('Erro ao guardar')

    const result = await run(async () => {
      throw { data: { error: 'Email já registado' } }
    })

    expect(result).toBeUndefined()
    expect(loading.value).toBe(false)
    expect(error.value).toBe('Email já registado')
  })

  it('usa a mensagem de fallback quando o erro não tem mensagem da API', async () => {
    const { error, run } = useAsyncAction('Erro ao guardar')

    await run(async () => {
      throw new Error('network down')
    })

    expect(error.value).toBe('Erro ao guardar')
  })

  it('limpa o erro anterior no início de uma nova execução', async () => {
    const { error, run } = useAsyncAction('falhou')

    await run(async () => {
      throw new Error('primeira falha')
    })
    expect(error.value).toBe('falhou')

    await run(async () => 'ok')
    expect(error.value).toBe('')
  })
})
