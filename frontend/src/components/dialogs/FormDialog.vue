<script setup lang="ts">
import { useId } from 'vue'
import BaseDialog from './BaseDialog.vue'

const formId = useId()

withDefaults(defineProps<{
  modelValue: boolean
  title: string
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  error?: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  submitLabel: 'Guardar',
  cancelLabel: 'Cancelar',
  loading: false,
  error: '',
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: []
  cancel: []
}>()

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function submit() {
  emit('submit')
}
</script>

<template>
  <BaseDialog
    :model-value="modelValue"
    :title="title"
    :size="size"
    :close-on-backdrop="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- Formulário nativo: permite submeter com Enter. O botão de submit no
         footer fica fora deste <form> (é um slot à parte no BaseDialog), por
         isso associa-se via o atributo form= em vez de @click. -->
    <form :id="formId" @submit.prevent="submit">
      <slot />

      <!-- Erro acima do footer, dentro do body -->
      <div
        v-if="error"
        class="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700"
      >
        {{ error }}
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="loading" @click="cancel">
        {{ cancelLabel }}
      </button>
      <button
        type="submit"
        :form="formId"
        class="btn btn-primary"
        :disabled="loading"
      >
        <svg
          v-if="loading"
          class="animate-spin w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ submitLabel }}
      </button>
    </template>
  </BaseDialog>
</template>
