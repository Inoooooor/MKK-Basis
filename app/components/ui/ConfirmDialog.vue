<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
}>(), {
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Отмена',
  tone: 'primary',
})

const emit = defineEmits<{ confirm: [], cancel: [] }>()
</script>

<template>
  <BaseModal :open="open" :title="title" @close="emit('cancel')">
    <p>{{ message }}</p>

    <template #actions>
      <BaseButton variant="ghost" @click="emit('cancel')">
        {{ cancelLabel }}
      </BaseButton>
      <BaseButton :variant="tone" @click="emit('confirm')">
        {{ confirmLabel }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
