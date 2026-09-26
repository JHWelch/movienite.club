<script lang="ts" setup>
import { CalendarDaysIcon } from '@heroicons/vue/24/solid'
import { EventDto } from '@shared/dtos'
import { rsvpModal } from '@client/state/rsvpModalState'
import MovieList from '@components/MovieList.vue'
import SkippedBanner from '@components/SkippedBanner.vue'
import Theme from '@components/event/Theme.vue'
import Button from '@components/buttons/Button.vue'

defineProps<{
  event: EventDto
  showEventDetails: boolean
}>()
</script>

<template>
  <div class="flex flex-col items-center mt-12 mb-12">
    <div class="w-full max-w-4xl px-4 sm:px-8">
      <div class="flex flex-col sm:justify-between sm:flex-row">
        <h3
          :id="event.slug ?? undefined"
          class="flex flex-col"
        >
          <p class="text-lg font-light text-primary-light">
            <span
              class="bg-black"
              v-text="event.date"
            />
          </p>

          <Theme :event="event" />

          <span
            v-if="event.submittedBy"
            class="mt-2 text-lg text-primary-light font-playwrite font-extralight"
          >
            Programming By
            <span class="font-normal">{{ event.submittedBy }}</span>
          </span>
        </h3>

        <Button
          v-if="showEventDetails"
          v-show="!event.isSkipped"
          class="mt-2"
          @click="rsvpModal.open(event)"
        >
          <span>RSVP</span>

          <CalendarDaysIcon class="w-6 h-6" />
        </Button>
      </div>
    </div>

    <SkippedBanner
      v-if="event.isSkipped"
      :theme="event.theme"
    />

    <MovieList
      v-if="!event.isSkipped"
      :event="event"
      :show-event-details="showEventDetails"
    />
  </div>
</template>
