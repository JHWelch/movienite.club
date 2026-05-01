<script lang="ts" setup>
const props = defineProps<{
  sectionTitle: {
    title: string
    image: string
  }
}>()

const { title, image } = props.sectionTitle

const id = title
  .replace(/\s+/g, '-')
  .toLowerCase()
</script>

<template>
  <div class="flex items-center justify-center w-full">
    <img
      :id="id"
      :src="image"
      :alt="title"
    >
  </div>
</template>
