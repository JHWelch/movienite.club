/** @vitest-environment jsdom */

import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vitest } from 'vitest'
import fetchMock from '@fetch-mock/vitest'
import MovieFactory from '@client/__tests__/utils/factories/movieFactory'
import EventPage from '@pages/EventPage.vue'
import EventFactory from '@client/__tests__/utils/factories/eventFactory'
import { setQueryString } from '@client/__tests__/utils/locationHelpers'
import { cleanup, render } from '@testing-library/vue'
import { screen } from '@testing-library/dom'

let wrapper: VueWrapper

const routerPushMock = vitest.fn()

vitest.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}))

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
})

it('will fetch and show the specified event', async () => {
  fetchMock.mockGlobal().route('/api/events/2024-01-01', new EventFactory().withMovies([
    new MovieFactory().build({
      title: 'The Matrix',
      director: 'The Wachowskis',
    }),
  ]).build())

  wrapper = mount(EventPage, {
    props: {
      id: '2024-01-01',
    },
  })

  await flushPromises()

  expect(wrapper.text()).toContain('The Matrix')
  expect(wrapper.text()).toContain('The Wachowskis')
})

it('will redirect to 404 if the event is not found', async () => {
  fetchMock.mockGlobal().get('/api/events/2024-01-01', 404)

  wrapper = mount(EventPage, {
    props: {
      id: '2024-01-01',
    },
  })

  await flushPromises()

  expect(routerPushMock).toHaveBeenCalledWith('/404')
})

describe('rsvps', () => {
  it('will not show by default', async () => {
    setQueryString('')
    fetchMock.mockGlobal().route('/api/events/2024-01-01', new EventFactory().build())

    render(EventPage, {
      props: {
        id: '2024-01-01',
      },
    })

    await flushPromises()

    expect(screen.getByText('RSVP to:')).not.toBeVisible()
  })

  it('will show the RSVP modal if present in query', async () => {
    setQueryString('?rsvp=2024-01-01')
    fetchMock.mockGlobal().route('/api/events/2024-01-01', new EventFactory().build({
      eventId: '2024-01-01',
    }))

    render(EventPage, {
      props: {
        id: '2024-01-01',
      },
    })

    await flushPromises()

    expect(screen.getByText('RSVP to:')).toBeVisible()
  })

  it('can open RSVP from slug', async () => {
    setQueryString('?rsvp=slug-name')
    fetchMock.mockGlobal().route('/api/events/slug-name', new EventFactory().build({
      eventId: '2024-01-01',
      slug: 'slug-name',
    }))

    render(EventPage, {
      props: {
        id: 'slug-name',
      },
    })

    await flushPromises()

    expect(screen.getByText('RSVP to:')).toBeVisible()
  })

  it('will open RSVP if no id is specified', async () => {
    setQueryString('?rsvp')
    fetchMock.mockGlobal().route('/api/events/slug-name', new EventFactory().build())

    render(EventPage, {
      props: {
        id: 'slug-name',
      },
    })

    await flushPromises()

    expect(screen.getByText('RSVP to:')).toBeVisible()
  })
})
