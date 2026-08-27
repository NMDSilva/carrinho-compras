import { ref } from 'vue'
import { extractApiError } from '@/utils/errors'

// Encapsula o padrão loading/error/try-catch repetido em quase todas as
// views (carregar uma lista, guardar um formulário, eliminar um registo).
// Cada instância tem o seu próprio loading/error — usa uma instância por
// operação independente da view (ex: uma para a lista, outra para o modal).
export function useAsyncAction(fallbackError = 'Ocorreu um erro') {
  const loading = ref(false)
  const error = ref('')

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    loading.value = true
    error.value = ''
    try {
      return await fn()
    } catch (e: unknown) {
      error.value = extractApiError(e, fallbackError)
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, error, run }
}
