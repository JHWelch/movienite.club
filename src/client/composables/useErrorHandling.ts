import { notifications } from '@client/state/notificationState'
import { ErrorBag, Errors } from '@client/types'
import { ref } from 'vue'

export function useErrorHandling (errorMap?: (initial: Errors) => Errors) {
  const errors = ref<Errors>({})

  const handleErrors = (data: ErrorBag) => {
    if (data.errors) {
      errors.value = errorMap ? errorMap(data.errors) : data.errors
    }

    if (data.message) {
      notifications.error(data.message)
    }
  }

  return {
    errors,
    handleErrors,
  }
}
