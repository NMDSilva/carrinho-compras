<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    loading?: boolean
  }>(),
  {
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    danger: false,
    loading: false,
  },
)

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
  <AlertDialog
    :open="modelValue"
    @update:open="emit('update:modelValue', $event)"
  >
    <AlertDialogContent size="sm">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ message }}</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <!-- Botões simples (não AlertDialogAction/Cancel): estes fecham o
             dialog automaticamente ao clicar, o que quebraria o padrão de
             loading/erro assíncrono — quem decide fechar é sempre o v-model
             controlado pela view chamadora. -->
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
          type="button"
          :variant="danger ? 'destructive' : 'default'"
          data-testid="dialog-confirm"
          :disabled="loading"
          @click="confirm"
        >
          <Spinner v-if="loading" class="size-4" />
          {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
