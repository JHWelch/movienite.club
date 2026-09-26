import { reactive } from 'vue'
import { EventDto } from '@shared/dtos'

type RsvpModalState = {
  show: boolean
  event?: EventDto
  open: (event?: EventDto) => void
  close: () => void
  getEventId: () => string|null
}

export const rsvpModal: RsvpModalState = reactive<RsvpModalState>({
  show: false,
  event: undefined,
  open: (event?: EventDto) => {
    rsvpModal.show = true
    rsvpModal.event = event
  },
  close: () => rsvpModal.show = false,
  getEventId: () => window?.location
    ? new URLSearchParams(window.location.search).get('rsvp')
    : null
})
