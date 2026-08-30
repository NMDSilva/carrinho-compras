<script lang="ts" setup>
import { Loader2Icon } from '@lucide/vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    class?: string
  }>(),
  {
    class: 'size-4',
  },
)
</script>

<template>
  <Loader2Icon :class="cn('animate-spin', props.class)" />
</template>
