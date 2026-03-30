<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdrop?: boolean
}>(), {
  size: 'md',
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)

const sizeClass: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

function close() {
  emit('update:modelValue', false)
}

// O browser dispara "cancel" quando o utilizador pressiona ESC.
// Prevenimos o comportamento nativo para que o fecho passe pelo v-model.
function onCancel(e: Event) {
  e.preventDefault()
  close()
}

// Clique no backdrop: o dialog modal cobre o viewport mas o alvo do
// evento é o próprio elemento <dialog> quando se clica fora do conteúdo.
function onBackdropClick(e: MouseEvent) {
  if (props.closeOnBackdrop && e.target === dialogEl.value) {
    close()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!dialogEl.value) return
    if (open) {
      dialogEl.value.showModal()
      document.body.style.overflow = 'hidden'
    } else {
      dialogEl.value.close()
      document.body.style.overflow = ''
    }
  },
)

onMounted(() => {
  if (props.modelValue) {
    dialogEl.value?.showModal()
    document.body.style.overflow = 'hidden'
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="app-dialog w-full p-0 border-0 rounded-xl shadow-xl overflow-hidden bg-white text-inherit"
    :class="sizeClass[size]"
    @cancel="onCancel"
    @click="onBackdropClick"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h2 class="text-base font-semibold text-gray-900">{{ title }}</h2>
      <button
        type="button"
        autofocus
        class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        @click="close"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="px-6 py-5 overflow-y-auto">
      <slot />
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer"
      class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3"
    >
      <slot name="footer" />
    </div>
  </dialog>
</template>

<style>
/* Animação de entrada/saída usando @starting-style e allow-discrete
   para transicionar display (none ↔ flex) e overlay (top layer). */

.app-dialog {
  display: flex;         /* sobreposto por display:none quando fechado */
  flex-direction: column;
  max-height: 90dvh;
  margin: auto;          /* centra no viewport em modo modal */

  opacity: 0;
  transform: scale(0.95) translateY(-8px);
  transition:
    opacity     200ms ease,
    transform   200ms ease,
    display     200ms allow-discrete,
    overlay     200ms allow-discrete;
}

.app-dialog[open] {
  display: flex;
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Estado inicial da animação de abertura */
@starting-style {
  .app-dialog[open] {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
}

/* Backdrop nativo do <dialog> */
.app-dialog::backdrop {
  background-color: rgb(0 0 0 / 0);
  transition:
    background-color 200ms ease,
    display          200ms allow-discrete,
    overlay          200ms allow-discrete;
}

.app-dialog[open]::backdrop {
  background-color: rgb(0 0 0 / 0.4);
}

@starting-style {
  .app-dialog[open]::backdrop {
    background-color: rgb(0 0 0 / 0);
  }
}
</style>
