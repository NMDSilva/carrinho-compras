<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'

withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}>(), {
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  danger: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm')
}
</script>

<template>
  <BaseDialog
    :model-value="modelValue"
    :title="title"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="text-sm text-gray-600 leading-relaxed">{{ message }}</p>

    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="loading" @click="cancel">
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        :class="danger ? 'btn btn-danger' : 'btn btn-primary'"
        :disabled="loading"
        @click="confirm"
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
        {{ confirmLabel }}
      </button>
    </template>
  </BaseDialog>
</template>
