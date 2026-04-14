<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue'
import LoadingAnimation from '@components/LoadingAnimation.vue'
import SectionTitle from '@components/SectionTitle.vue'
import EventItem from '@components/EventItem.vue'
import ErrorBanner from '@components/ErrorBanner.vue'
import { EventDto } from '@shared/dtos'
import { rsvpModal } from '@client/state/modalState'
import RsvpModal from '@client/components/RsvpModal.vue'

const props = withDefaults(defineProps<{
  fetchUrl: string
  showEventDetails?: boolean
  sectionTitles?: { [key: number]: {
    title: string
    image: string
  } }
  onEmpty?: () => void
}>(), {
  sectionTitles: () => ({}),
  showEventDetails: false,
  onEmpty: undefined,
})

const events = ref<EventDto[]>([])
const loading = ref<boolean>(true)
const error = ref<boolean>(false)

const rsvpEvent = () => window?.location ? new URLSearchParams(window.location.search).get('rsvp') : null

const reload = () => {
  loading.value = true
  error.value = false
  fetch(props.fetchUrl)
    .then(response => {
      if (!response.ok) {
        console.error('Error fetching event data: ', response.status, response.statusText)
        error.value = true

        return Promise.resolve([])
      }

      return response.json()
    })
    .then(data => {
      events.value = data
      loading.value = false

      if (data.length === 0 && props.onEmpty) {
        props.onEmpty()
      }

      const rsvp_event = rsvpEvent()
      if (!rsvp_event) { return }

      const event = events.value.find(event => event.eventId === rsvp_event)
      if (!event) { return }

      rsvpModal.open(event)
    })
}

watch(events, () => nextTick(() => setTimeout(() => {
  if (typeof window === 'undefined' || !window.location?.hash) { return }

  const anchor = window.location.hash.substring(1)
  if (!anchor) { return }

  const element = document.getElementById(anchor)
  if (!element) { return }

  element.scrollIntoView()
}, 100)))

reload()
</script>

<template>
  <div>
    <LoadingAnimation v-if="loading" />

    <ErrorBanner
      v-if="error"
      @reload="reload"
    />

    <div
      v-for="[index, event] in Object.entries(events)"
      :key="index"
    >
      <div>
        <SectionTitle
          v-if="sectionTitles[Number(index)]"
          :section-title="sectionTitles[Number(index)]"
        />

        <EventItem
          :event="event"
          :show-event-details="showEventDetails"
        />
      </div>
    </div>

    <RsvpModal v-if="showEventDetails" />
  </div>
</template>
