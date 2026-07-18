<script lang="ts" setup>
import { notifications } from '@client/state/notificationState'
import { ref } from 'vue'

const eventId = ref<string>('')

const props = defineProps<{
  password: string
}>()

const submit = async () => {
  const response = await fetch('/api/admin/discord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: props.password,
    },
    body: JSON.stringify({
      eventId: eventId.value,
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    notifications.error(data.message || 'Error testing webhook')
  } else {
    notifications.success('Webhook test sent successfully')
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
      v-model="eventId"
      type="text"
      placeholder="Event date"
      class="w-full p-2 border-2 border-black rounded-md"
    >

    <button
      type="submit"
      class="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
    >
      Test Webhook
    </button>
  </form>
</template>
