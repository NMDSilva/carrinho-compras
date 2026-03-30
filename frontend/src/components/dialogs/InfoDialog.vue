<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'

withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  closeLabel?: string
}>(), {
  closeLabel: 'Fechar',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
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
      <button type="button" class="btn btn-secondary" @click="close">
        {{ closeLabel }}
      </button>
    </template>
  </BaseDialog>
</template>
