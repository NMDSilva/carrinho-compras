<script setup lang="ts">
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{
    page: number
    totalPages: number
    total: number
    itemLabel?: string
  }>(),
  {
    itemLabel: 'registos',
  },
)

const emit = defineEmits<{
  'update:page': [page: number]
}>()
</script>

<template>
  <div class="flex items-center justify-between border-t px-6 py-4 text-sm text-muted-foreground">
    <span>{{ total }} {{ itemLabel }}</span>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        :disabled="page === 0"
        @click="emit('update:page', page - 1)"
      >
        Anterior
      </Button>
      <span>{{ page + 1 }} / {{ totalPages }}</span>
      <Button
        variant="outline"
        size="sm"
        :disabled="page + 1 >= totalPages"
        @click="emit('update:page', page + 1)"
      >
        Seguinte
      </Button>
    </div>
  </div>
</template>
