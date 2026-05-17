<script lang="ts" setup>
import { EventDto } from '@shared/dtos'

defineProps<{
  event: EventDto
}>()

</script>

<template>
  <span
    v-if="event.styledTheme.length > 0"
    class="text-3xl font-semibold"
    data-testid="theme"
  >
    <component
      :is="part.href ? 'a' : 'span'"
      v-for="(part, index) in event.styledTheme"
      :key="index"
      :href="part.href"
      :class="{
        'font-bold': part.annotations.bold,
        'italic': part.annotations.italic,
        'underline': part.annotations.underline || part.href,
        'line-through': part.annotations.strikethrough,
        'decoration-dotted': part.href,
      }"
    >
      {{ part.text.content }}
    </component>
  </span>

  <span
    v-else
    class="text-3xl font-semibold"
    data-testid="theme"
  >
    {{ event.isSkipped ? 'No movies this week!' : event.theme }}
  </span>
</template>
