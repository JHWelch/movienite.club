<script lang="ts" setup>
import { computed, ref } from 'vue'
import FormInput from '@components/form/FormInput.vue'
import FormCheckbox from '@components/form/FormCheckbox.vue'
import { rsvpModal } from '@client/state/rsvpModalState'
import { fireConfetti } from '@client/utilities/confetti'
import { CalendarDaysIcon } from '@heroicons/vue/24/solid'
import { jsonHeaders } from '@client/data/headers'
import { useErrorHandling } from '@client/composables/useErrorHandling'
import Button from '@components/buttons/Button.vue'

type RsvpForm = {
  name: string
  email?: string
  reminders: boolean
}

const formData = ref<RsvpForm>({
  name: localStorage.getItem('rsvp.name') || '',
  email: localStorage.getItem('rsvp.email') || '',
  reminders: false,
})
const { errors, handleErrors } = useErrorHandling()
const rsvp = async () => {
  if (!rsvpModal.event) { return }

  if (formData.value.email === '') {
    delete formData.value.email
  }

  const response = await fetch(
    '/api/events/' + rsvpModal.event.eventId + '/rsvp', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(formData.value),
    })

  const data = await response.json()

  if (!response.ok) {
    handleErrors(data)

    return
  }

  fireConfetti()
  rsvpModal.close()

  localStorage.setItem('rsvp.name', formData.value.name)
  localStorage.setItem('rsvp.email', formData.value.email || '')
}

const disabled = computed(() => !formData.value.name
  || (formData.value.reminders && !formData.value.email))
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-show="rsvpModal.show"
      id="rsvp-modal"
      class="relative z-10"
      aria-labelledby="rsvp-modal-title"
      role="dialog"
      aria-modal="true"
      @close-modal="rsvpModal.close()"
    >
      <div class="fixed inset-0 transition-opacity bg-dark/75" />

      <div
        class="fixed inset-0 z-10 overflow-y-auto"
        @click="rsvpModal.close()"
        @keyup.escape="rsvpModal.close()"
      >
        <div class="flex items-end justify-center min-h-full p-4 text-center sm:items-center sm:p-0">
          <Transition
            enter-active-class="ease-out duration-400"
            enter-from-class="translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95"
            enter-to-class="translate-y-0 opacity-100 sm:scale-100"
            leave-active-class="duration-200 ease-in"
            leave-from-class="translate-y-0 opacity-100 sm:scale-100"
            leave-to-class="translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95"
          >
            <div
              v-show="rsvpModal.show"
              id="rsvp-modal-title"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              class="relative px-4 pt-5 pb-4 overflow-hidden text-left transition-all transform border-4 shadow-xl bg-dark border-primary-dark sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
              @click.stop
            >
              <div>
                <div class="flex items-center justify-center mx-auto">
                  <CalendarDaysIcon class="w-6 h-6" />
                </div>

                <div class="mt-3 text-center sm:mt-5">
                  <h3
                    id="modal-title"
                    class="text-base font-semibold leading-6 text-primary-light"
                  >
                    <span>RSVP to: </span>

                    <span
                      class="italic text-primary-dark"
                      v-text="rsvpModal.event?.theme"
                    />
                  </h3>

                  <div class="mt-2">
                    <p class="text-sm text-light">
                      Let us know you are coming! Bring&nbsp;a&nbsp;friend&nbsp;if&nbsp;you&nbsp;like.
                    </p>

                    <p class="text-primary-light">
                      <span class="bg-black">Hope to see you soon!</span>
                    </p>
                  </div>
                </div>
              </div>

              <form class="space-y-4">
                <FormInput
                  v-model="formData.name"
                  :error="errors.name"
                  name="name"
                  placeholder="Ghostface"
                  :required="true"
                  @clear-error="errors.name = ''"
                />

                <FormInput
                  v-model="formData.email"
                  :error="errors.email"
                  name="email"
                  type="email"
                  label="Email"
                  placeholder="ghostface@woodsboroca.gov"
                  :required="formData.reminders"
                  @clear-error="errors.email = ''"
                />

                <FormCheckbox
                  v-model="formData.reminders"
                  name="reminders"
                  description="Get reminder emails for upcoming events"
                  label="Reminders?"
                />
              </form>

              <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <Button
                  data-testid="rsvp-button"
                  :disabled="disabled"
                  type="button"
                  class="sm:col-start-2"
                  size="small"
                  @click="rsvp"
                >
                  RSVP!
                </Button>

                <Button
                  type="button"
                  class="mt-3 sm:col-start-1 sm:mt-0"
                  variant="secondary"
                  size="small"
                  @click="rsvpModal.close()"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Transition>
</template>
