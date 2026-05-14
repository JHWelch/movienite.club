<script lang="ts" setup>
import { ref } from 'vue'
import FormInput from '@components/form/FormInput.vue'
import { fireConfetti } from '@client/utilities/confetti'
import { jsonHeaders } from '@client/data/headers'
import { useErrorHandling } from '@client/composables/useErrorHandling'
import Button from '@components/buttons/Button.vue'

const isOpen = ref<boolean>(false)
const email = ref<string>('')
const { errors, handleErrors } = useErrorHandling()

const subscribe = async (event: MouseEvent | KeyboardEvent) => {
  event.stopPropagation()
  const response = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: email.value }),
  })

  const data = await response.json()

  if (!response.ok) {
    handleErrors(data)

    return
  }

  isOpen.value = false
  email.value = ''
  fireConfetti()
}
const toggle = () => {
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    setTimeout(() => {
      const input = document?.querySelector('input[name="email"]') as HTMLInputElement
      if (input) {
        input.focus()
      }
    }, 100)
  }
}
</script>

<template>
  <button
    class="flex flex-col items-center justify-center h-full px-2 py-2 text-sm font-medium leading-5 text-center cursor-pointer grow sm:px-4 sm:grow-0 md:text-xl hover:bg-primary-dark hover:text-dark focus:bg-primary-dark focus:text-dark focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-offset-dark focus:ring-primary-dark"
    data-testid="get-reminders-button"
    @click.stop="toggle"
  >
    Get Reminders!
  </button>

  <div
    v-if="isOpen"
    class="absolute w-full right-0 top-12 bg-dark p-3 space-y-4 max-w-[500px] border-2 border-primary-dark"
  >
    <p class="text-sm">
      Get an email reminder the day before upcoming movie nites
    </p>

    <div class="flex w-full space-x-4">
      <FormInput
        v-model="email"
        name="email"
        :hide-label="true"
        :error="errors.email"
        @clear-error="errors = {}"
        @keyup.enter="subscribe"
      />

      <Button
        data-testid="subscribe-button"
        size="small"
        @click="subscribe"
      >
        Subscribe
      </Button>
    </div>
  </div>
</template>
