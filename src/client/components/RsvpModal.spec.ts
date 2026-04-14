/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import RsvpModal from '@components/RsvpModal.vue'
import EventFactory from '@tests/utils/factories/eventFactory'
import { rsvpModal } from '@client/state/modalState'
import { fireConfetti } from '@client/utilities/confetti'
import fetchMock from '@fetch-mock/vitest'

vi.mock(import('@client/utilities/confetti'), () => ({
  fireConfetti: vi.fn(),
}))

afterEach(() => {
  localStorage.removeItem('rsvp.email')
  localStorage.removeItem('rsvp.name')
})

describe('name and email already set', () => {
  beforeEach(() => {
    localStorage.setItem('rsvp.email', 'jdoe@example.com')
    localStorage.setItem('rsvp.name', 'John Doe')
  })

  it('prefills the name and email fields', () => {
    const event = new EventFactory().build()
    rsvpModal.open(event)
    const wrapper = mount(RsvpModal)

    expect(wrapper.byTestId('input-name')).toBeValue('John Doe')
    expect(wrapper.byTestId('input-email')).toBeValue('jdoe@example.com')
  })
})

describe('nothing input', () => {
  it('disables the submit button', () => {
    const event = new EventFactory().build()
    rsvpModal.open(event)
    const wrapper = mount(RsvpModal)

    expect(wrapper.byTestId('rsvp-button').attributes('disabled')).toBe('')
  })
})

describe('only name input', () => {
  let wrapper: VueWrapper

  beforeEach(async () => {
    const event = new EventFactory().build()
    rsvpModal.open(event)
    wrapper = mount(RsvpModal)

    await wrapper.byTestId('input-name').setValue('John Doe')
  })

  it('enables the submit button', async () => {
    expect(wrapper.byTestId('rsvp-button').attributes('disabled')).toBe(undefined)
  })

  describe('reminders checked', () => {
    beforeEach(async () => {
      await wrapper.byTestId('input-reminders').setValue(true)
    })

    it('disables the submit button', () => {
      expect(wrapper.byTestId('rsvp-button').attributes('disabled')).toBe('')
    })
  })
})

describe('rsvp submit', () => {
  beforeEach(async () => {
    fetchMock.mockGlobal().route('/api/events/2020-01-01/rsvp', {})
    const event = new EventFactory().build({
      eventId: '2020-01-01',
    })
    rsvpModal.open(event)
    const wrapper = mount(RsvpModal)
    await wrapper.byTestId('input-name').setValue('John Doe')
    await wrapper.byTestId('input-email').setValue('jdoe@example.com')
    await wrapper.byTestId('rsvp-button').trigger('click')
    await flushPromises()
  })

  it('calls api with the correct data', async () => {
    expect({ fetchMock }).toHavePosted('/api/events/2020-01-01/rsvp', { body: {
      name: 'John Doe',
      email: 'jdoe@example.com',
      reminders: false,
    } })
  })

  it('closes the modal', async () => {
    expect(rsvpModal.show).toBe(false)
  })

  it('fires confetti', async () => {
    expect(fireConfetti).toHaveBeenCalled()
  })

  it('saves email and name to local storage', async () => {
    expect(localStorage.getItem('rsvp.email')).toEqual('jdoe@example.com')
    expect(localStorage.getItem('rsvp.name')).toEqual('John Doe')
  })
})
