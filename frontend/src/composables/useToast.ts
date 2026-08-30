import { toast } from 'vue-sonner'

// Wrapper fino sobre vue-sonner: import único centralizado (nenhuma view
// importa 'vue-sonner' diretamente) e mensagens por omissão em pt-PT.
export function useToast() {
  function success(message: string) {
    toast.success(message)
  }

  function error(message = 'Ocorreu um erro') {
    toast.error(message)
  }

  return { success, error }
}
