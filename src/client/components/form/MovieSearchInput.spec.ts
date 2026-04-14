/** @vitest-environment jsdom */

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MovieSearchInput from '@components/form/MovieSearchInput.vue'
import fetchMock from '@fetch-mock/vitest'

const props = {
  name: 'search',
  modelValue: { title: '' },
}

vi.mock('lodash.debounce')

afterEach(() => {
  fetchMock.mockReset()
})

describe('input passthrough', () => {
  it('should pass through props to input', () => {
    const wrapper = mount(MovieSearchInput, {
      props: {
        ...props,
        placeholder: 'Search for movies',
        label: 'Search',
        error: 'Error message',
      },
    })

    const input = wrapper.find('#search')
    const label = wrapper.find('label')
    const error = wrapper.find('#search-error')

    expect(input.attributes('placeholder')).toBe('Search for movies')
    expect(input.attributes('name')).toBe('search')
    expect(label.text()).toBe('Search')
    expect(error.text()).toBe('Error message')
  })
})

describe('user types in search', () => {
  afterEach(() => {
    fetchMock.mockClear()
  })

  it('searches for matching movies', async () => {
    fetchMock.mockGlobal().route('/api/movies?search=The%20Matrix', { movies: [] })

    const wrapper = mount(MovieSearchInput, { props })

    const input = wrapper.find('#search')
    await input.setValue('The Matrix')

    expect({ fetchMock }).toHaveGot('/api/movies?search=The%20Matrix')
  })

  it('does not search if input is empty', async () => {
    const wrapper = mount(MovieSearchInput, { props })

    const input = wrapper.find('#search')
    await input.setValue('')

    expect({ fetchMock }).not.toHaveGot()
  })

  it('does not search if input is less than 3 characters', async () => {
    const wrapper = mount(MovieSearchInput, { props })

    const input = wrapper.find('#search')
    await input.setValue('Th')

    expect({ fetchMock }).not.toHaveGot()
  })

  describe('movies returned', () => {
    beforeEach(() => {
      const response = {
        movies: [
          {
            title: 'The Matrix',
            year: 1999,
            tmdbId: 603,
            posterPath: '/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg',
          },
          {
            title: 'The Matrix Reloaded',
            year: 2003,
            tmdbId: 604,
            posterPath: '/9TGHDvWrqKBzwDxDodHYXEmOE6J.jpg',
          },
          {
            title: 'The Matrix Revolutions',
            year: 2003,
            tmdbId: 605,
            posterPath: '/cm14gG8xBghwIAy1GX0ryI2HA4U.jpg',
          },
        ],
      }

      fetchMock.mockGlobal().route('/api/movies?search=The%20Matrix', response)
    })

    it('displays movie information', async () => {
      const wrapper = mount(MovieSearchInput, { props })

      const input = wrapper.find('#search')
      await input.setValue('The Matrix')
      await flushPromises()

      expect(wrapper.text()).toContain('The Matrix')
      expect(wrapper.text()).toContain('1999')
      expect(wrapper.html()).toContain('dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg')
      expect(wrapper.text()).toContain('The Matrix Reloaded')
      expect(wrapper.text()).toContain('2003')
      expect(wrapper.html()).toContain('9TGHDvWrqKBzwDxDodHYXEmOE6J.jpg')
      expect(wrapper.text()).toContain('The Matrix Revolutions')
      expect(wrapper.text()).toContain('2003')
      expect(wrapper.html()).toContain('cm14gG8xBghwIAy1GX0ryI2HA4U.jpg')
    })
  })
})
