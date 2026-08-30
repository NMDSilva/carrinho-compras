<script setup lang="ts">
import { VisuallyHidden } from 'reka-ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    size?: 'sm' | 'md' | 'lg'
    closeOnBackdrop?: boolean
  }>(),
  {
    size: 'md',
    closeOnBackdrop: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const sizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
}

// O DialogContent do shadcn-vue fecha ao clicar fora por omissão — para
// closeOnBackdrop=false (ex: FormDialog, para não perder dados a meio de
// um formulário com um clique acidental) prevenimos esse fecho aqui.
function onPointerDownOutside(event: Event) {
  if (!props.closeOnBackdrop) event.preventDefault()
}
</script>

<template>
  <Dialog
    :open="modelValue"
    @update:open="emit('update:modelValue', $event)"
  >
    <DialogContent
      :class="[
        'flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 ring-0',
        sizeClass[size],
      ]"
      @pointer-down-outside="onPointerDownOutside"
    >
      <DialogHeader class="shrink-0 border-b px-6 py-4">
        <DialogTitle>{{ title }}</DialogTitle>
        <VisuallyHidden as-child>
          <DialogDescription>{{ title }}</DialogDescription>
        </VisuallyHidden>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <slot />
      </div>

      <DialogFooter
        v-if="$slots.footer"
        class="mx-0 mb-0 shrink-0 items-center border-t bg-gray-50 px-6 py-4"
      >
        <slot name="footer" />
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
