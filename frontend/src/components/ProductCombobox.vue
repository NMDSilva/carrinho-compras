<script setup lang="ts" generic="T">
import { computed, nextTick, watch } from 'vue'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'

const props = withDefaults(
  defineProps<{
    modelValue: T | null
    search: (query: string) => Promise<T[]>
    itemLabel: (item: T) => string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    placeholder: 'Pesquisar...',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: T | null]
  clear: []
}>()

const { query, results, loading, search: runSearch } = useDebouncedSearch<T>(
  (q) => props.search(q),
)

// Aberto sempre que há um pedido em curso ou resultados a mostrar — igual
// ao comportamento original (sem mensagem de "sem resultados": quando a
// pesquisa não devolve nada, o dropdown simplesmente não aparece).
const open = computed(() => loading.value || results.value.length > 0)

// `watch` em vez de `@input`: o v-model do Input (useVModel em modo
// `passive`) só atualiza `query` através do próprio ciclo reativo do Vue —
// um handler `@input` corre antes dessa atualização e lê sempre o valor
// anterior. `suppressNextChange` evita que o próprio `select()` (que também
// escreve em `query`) dispare uma nova pesquisa a seguir a uma seleção — é
// limpa em `nextTick()` em vez de dentro do próprio watch, porque o Vue não
// dispara `watch` quando o valor escrito é igual ao anterior (comum: o
// texto pesquisado já coincidir com o nome do item escolhido), o que
// deixava a flag presa e silenciava a pesquisa seguinte.
let suppressNextChange = false

watch(query, (newQuery) => {
  if (suppressNextChange) return
  if (props.modelValue && !newQuery.trim()) emit('clear')
  runSearch()
})

async function select(item: T) {
  suppressNextChange = true
  query.value = props.itemLabel(item)
  results.value = []
  emit('update:modelValue', item)
  await nextTick()
  suppressNextChange = false
}

// Mantém o texto do input sincronizado quando `modelValue` é definido de
// fora (ex: a view abre um formulário de edição já com um produto
// selecionado, sem o utilizador ter pesquisado nada). `immediate` cobre o
// caso de a combobox montar já com um `modelValue` inicial.
watch(
  () => props.modelValue,
  async (item) => {
    suppressNextChange = true
    query.value = item ? props.itemLabel(item) : ''
    results.value = []
    await nextTick()
    suppressNextChange = false
  },
  { immediate: true },
)
</script>

<template>
  <Popover :open="open">
    <PopoverAnchor as-child>
      <div class="relative">
        <Input
          v-model="query"
          type="text"
          :placeholder="placeholder"
          :disabled="disabled"
          data-testid="combobox-input"
          class="pr-9"
        />
        <Spinner
          v-if="loading"
          class="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </PopoverAnchor>

    <PopoverContent
      class="w-(--reka-popover-trigger-width) p-0"
      align="start"
      @open-auto-focus.prevent
      @close-auto-focus.prevent
    >
      <Command>
        <CommandList>
          <CommandGroup>
            <CommandItem
              v-for="(item, index) in results"
              :key="index"
              :value="itemLabel(item)"
              data-testid="combobox-option"
              @select="select(item)"
            >
              {{ itemLabel(item) }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
