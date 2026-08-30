import { ref } from 'vue'

// Encapsula o padrão de combobox de pesquisa com debounce repetido em várias
// views (produto em Comparar, Preços, mover/reatribuir variante): input de
// texto, lista de resultados e um `loading` que só liga quando o pedido ao
// backend arranca de facto (não durante os 300ms de debounce). Ignora
// respostas que cheguem fora de ordem — ex: a resposta de "a" a chegar
// depois da de "ab" — para `results`/`loading` nunca ficarem incoerentes
// com o texto atual da caixa.
export function useDebouncedSearch<T>(
  fetch: (query: string) => Promise<T[]>,
  delay = 300
) {
  const query = ref('')
  const results = ref<T[]>([])
  const loading = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0

  function search() {
    clearTimeout(timer)
    const q = query.value.trim()
    if (!q) {
      requestId++
      results.value = []
      loading.value = false
      return
    }
    timer = setTimeout(async () => {
      const id = ++requestId
      loading.value = true
      try {
        const data = await fetch(q)
        if (id === requestId) results.value = data
      } catch {
        if (id === requestId) results.value = []
      } finally {
        if (id === requestId) loading.value = false
      }
    }, delay)
  }

  function clear() {
    clearTimeout(timer)
    requestId++
    query.value = ''
    results.value = []
    loading.value = false
  }

  return { query, results, loading, search, clear }
}
