<script lang="ts" setup>
import { ref } from 'vue'
import Button from '../buttons/Button.vue'

const date = ref<string>('')

const submit = async () => {
  const response = await fetch('/api/admin/discord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: date.value,
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    alert(data.message || 'Error testing webhook')
  } else {
    alert('Webhook test sent successfully')
  }
}

</script>
<template>
  <form
    class="flex flex-col items-center space-y-2"
    @submit.prevent="submit"
  >
    <h2 class="font-semibold">
      Test Webhook
    </h2>

    <input
      v-model="date"
      type="text"
      placeholder="Event date"
      class="w-full p-2 border-2 border-black rounded-md"
    >

    <Button
      @click="submit"
    >
      Test Webhook
    </Button>
  </form>
</template>
