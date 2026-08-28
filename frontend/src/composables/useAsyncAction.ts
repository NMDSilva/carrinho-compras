import { ref } from 'vue'
import { extractApiError } from '@/utils/errors'

// Sentinela devolvida por `run` quando `fn` falha. Não pode ser `undefined`:
// pedidos DELETE respondem 204 (sem corpo), que o ofetch resolve como
// `undefined` — se o erro também fosse `undefined`, um delete bem-sucedido
// seria indistinguível de uma falha em todos os `if (result !== undefined)`
// espalhados pelas views (o popup nunca fechava, a lista nunca recarregava).
export const ASYNC_ACTION_FAILED = Symbol('async-action-failed')

// Encapsula o padrão loading/error/try-catch repetido em quase todas as
// views (carregar uma lista, guardar um formulário, eliminar um registo).
// Cada instância tem o seu próprio loading/error — usa uma instância por
// operação independente da view (ex: uma para a lista, outra para o modal).
//
// `immediate: true` inicia loading já a true — usar na carga inicial de uma
// view (chamada a partir de onMounted), para o spinner aparecer já no
// primeiro render em vez de só depois do onMounted correr.
export function useAsyncAction(fallbackError = 'Ocorreu um erro', options: { immediate?: boolean } = {}) {
  const loading = ref(options.immediate ?? false)
  const error = ref('')

  async function run<T>(fn: () => Promise<T>): Promise<T | typeof ASYNC_ACTION_FAILED> {
    loading.value = true
    error.value = ''
    try {
      return await fn()
    } catch (e: unknown) {
      error.value = extractApiError(e, fallbackError)
      return ASYNC_ACTION_FAILED
    } finally {
      loading.value = false
    }
  }

  return { loading, error, run }
}
