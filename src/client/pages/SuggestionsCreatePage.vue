<script lang="ts" setup>
import { computed, ref } from 'vue'
import FormInput from '@components/form/FormInput.vue'
import LoadingIcon from '@components/icons/LoadingIcon.vue'
import { jsonHeaders } from '@client/data/headers'
import MovieSearchInput from '@client/components/form/MovieSearchInput.vue'
import { useErrorHandling } from '@client/composables/useErrorHandling'
import type { MovieSearchInputData } from '@client/components/form/MovieSearchInput/types'

type SuggestionFormData = {
  theme: string
  submitted_by: string
  movie1: MovieSearchInputData
  movie2: MovieSearchInputData
}

const formData = ref<SuggestionFormData>({
  theme: '',
  submitted_by: localStorage.getItem('submitted_by') || '',
  movie1: { title: '' },
  movie2: { title: '' },
})
const submitting = ref<boolean>(false)
const { errors, handleErrors } = useErrorHandling((initialErrors) => ({
  ...initialErrors,
  movie1: initialErrors.movies,
  movie2: initialErrors.movies,
}))

const disabled = computed(() => submitting.value
    || !formData.value.theme
    || !formData.value.movie1.title
    || !formData.value.submitted_by,
)
const submit = async () => {
  submitting.value = true
  const response = await fetch('/suggestions' , {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      theme: formData.value.theme,
      submitted_by: formData.value.submitted_by,
      movies: [
        formData.value.movie1,
        formData.value.movie2,
      ].filter((movie) => movie.title.trim() !== ''),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    submitting.value = false
    handleErrors(data)

    return
  }

  localStorage.setItem('submitted_by', formData.value.submitted_by)

  window.location.href = '/?suggest_success'
}
</script>

<template>
  <div class="flex flex-col items-center w-full min-h-[70vh] px-5 py-10 sm:py-10 sm:pb-16">
    <h1 class="mt-1 text-3xl leading-10 text-center">
      Suggest a Movie Nite&nbsp;Theme!
    </h1>

    <form
      class="w-full max-w-sm p-4 mt-5 space-y-5 border-4 border-black border-double sm:mt-8"
      @submit.prevent="submit"
    >
      <FormInput
        v-model="formData.submitted_by"
        name="submitted_by"
        label="Your Name"
        placeholder="Who are you?"
        :required="true"
        :error="errors.submitted_by"
        @clear-error="errors.submitted_by = ''"
      />

      <FormInput
        v-model="formData.theme"
        name="theme"
        placeholder="Something punny..."
        :required="true"
        :error="errors.theme"
        @clear-error="errors.theme = ''"
      />

      <MovieSearchInput
        v-model="formData.movie1"
        name="movie1"
        label="First Movie"
        placeholder="Triangle"
        :required="true"
        :error="errors.movie1"
        @clear-error="errors.movie1 = ''"
      />

      <MovieSearchInput
        v-model="formData.movie2"
        name="movie2"
        label="Second Movie"
        placeholder="Triangle of Sadness"
        :error="errors.movie2"
        @clear-error="errors.movie2 = ''"
      />

      <button
        type="button"
        class="inline-flex justify-center w-full p-2 text-xl font-semibold rounded-lg sm:col-start-2 disabled:cursor-not-allowed disabled:opacity-50 bg-primary-dark text-dark"
        :disabled="disabled"
        @click="submit()"
      >
        <span v-if="!submitting">
          Submit Suggestion!
        </span>

        <span
          v-else
          class="flex space-x-2"
        >
          <LoadingIcon />

          <span class="ml-2">Submitting...</span>
        </span>
      </button>
    </form>
  </div>
</template>
