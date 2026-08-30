<script setup lang="ts">
import { useId } from 'vue'
import BaseDialog from './BaseDialog.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const formId = useId()

withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    submitLabel?: string
    cancelLabel?: string
    loading?: boolean
    error?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    submitLabel: 'Guardar',
    cancelLabel: 'Cancelar',
    loading: false,
    error: '',
    size: 'md',
  },
)

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
        class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ error }}
      </div>
    </form>

    <template #footer>
      <Button
        type="button"
        variant="outline"
        data-testid="dialog-cancel"
        :disabled="loading"
        @click="cancel"
      >
        {{ cancelLabel }}
      </Button>
      <Button
        type="submit"
        :form="formId"
        data-testid="dialog-confirm"
        :disabled="loading"
      >
        <Spinner v-if="loading" class="size-4" />
        {{ submitLabel }}
      </Button>
    </template>
  </BaseDialog>
</template>
