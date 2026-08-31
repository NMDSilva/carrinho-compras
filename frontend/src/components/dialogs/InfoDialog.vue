<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message: string
    closeLabel?: string
  }>(),
  {
    closeLabel: 'Fechar',
  },
)

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
    <p class="text-sm leading-relaxed text-muted-foreground">{{ message }}</p>

    <template #footer>
      <Button type="button" variant="outline" @click="close">
        {{ closeLabel }}
      </Button>
    </template>
  </BaseDialog>
</template>
