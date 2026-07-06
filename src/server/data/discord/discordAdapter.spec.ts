import { beforeEach, describe, expect, it } from 'vitest'
import { mockFetch } from '@tests/support/fetchMock'
import DiscordAdapter from '@server/data/discord/discordAdapter'
import { mockConfig } from '@server/__tests__/support/mockConfig'
import EventFactory from '@server/__tests__/support/factories/eventFactory'
import MovieFactory from '@server/__tests__/support/factories/movieFactory'

let discordAdapter: DiscordAdapter

beforeEach(() => {
  discordAdapter = new DiscordAdapter(mockConfig())
})

describe('eventReminder', () => {
  it('calls the discord webhook with the correct payload', async () => {
    const fetchMock = mockFetch()
    const event = new EventFactory()
      .withMovies([
        new MovieFactory().make({
          title: 'Get Over It',
          year: 2001,
          length: 87,
          director: "Tommy O'Haver",
          url: 'https://www.themoviedb.org/movie/10050',
          posterPath: '/hS1jjzTe4P8GMWGnvca7HIndPEX.jpg',
          time: '6:00PM',
        }),
        new MovieFactory().make({
          title: 'My Own Private Idaho',
          year: 1991,
          length: 104,
          director: 'Gus Van Sant',
          url: 'https://www.themoviedb.org/movie/468',
          posterPath: '/p9TF90Pb5yg2MNb2UztzyXktMm4.jpg',
          time: '8:00PM',
        }),
      ])
      .make({
        theme: 'AP English Lit',
      })
    fetchMock.mockImplementationOnce((url, options) => {
      expect(url).toBe('https://DISCORD_WEBHOOK')
      expect(options?.method).toBe('POST')
      expect(options?.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(options?.body).toBe(JSON.stringify({
        content: '# AP English Lit\n - **6:00PM** *Get Over It*\n - **8:00PM** *My Own Private Idaho*',
        embeds: [
          {
            title: '*Get Over It* (2001)',
            description: "Tommy O'Haver - 1h 27m",
            url: 'https://www.themoviedb.org/movie/10050',
            image: {
              url: 'https://image.tmdb.org/t/p/w1280/hS1jjzTe4P8GMWGnvca7HIndPEX.jpg',
            },
          },
          {
            title: '*My Own Private Idaho* (1991)',
            description: 'Gus Van Sant - 1h 44m',
            url: 'https://www.themoviedb.org/movie/468',
            image: {
              url: 'https://image.tmdb.org/t/p/w1280/p9TF90Pb5yg2MNb2UztzyXktMm4.jpg',
            },
          },
        ],
      }))

      return Promise.resolve(new Response(null, { status: 204 }))
    })

    await discordAdapter.eventReminder(event)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
