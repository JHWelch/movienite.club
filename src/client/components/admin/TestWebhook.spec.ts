/** @vitest-environment jsdom */

import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ComponentPublicInstance } from 'vue'
import AddMovie from '@components/admin/AddMovie.vue'
import fetchMock from '@fetch-mock/vitest'
import TestWebhook from './TestWebhook.vue'

let wrapper: VueWrapper<ComponentPublicInstance<typeof AddMovie>>

describe('submit', () => {
  afterEach(() => {
    fetchMock.mockReset()
  })

  beforeEach(async () => {
    fetchMock.mockGlobal().route('/api/admin/discord', {})

    wrapper = mount(TestWebhook, {
      props: {
        password: 'admin-password',
      },
    })
  })

  it('submits a webhook eventId', async () => {
    wrapper.vm.eventId = '2023-01-01'

    wrapper.find('form').trigger('submit')
    await flushPromises()

    expect({ fetchMock }).toHavePosted('/api/admin/discord', {
      body: {
        eventId: '2023-01-01',
      },
      headers: {
        'Content-Type': 'application/json',
        authorization: 'admin-password',
      },
    })
  })
})
