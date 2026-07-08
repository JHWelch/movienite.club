import { mockFetch } from '@server/__tests__/support/fetchMock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminTestController from '@server/controllers/adminTestController'
import DiscordAdapter from '@server/data/discord/discordAdapter'
import { mockConfig } from '@server/__tests__/support/mockConfig'
import { getMockReq, getMockRes } from '@server/__tests__/support/expressMocks'
import Config from '@server/config/config'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { FirebaseMock } from '@server/__tests__/support/firebaseMock'
import { DateTime } from 'luxon'
import { TZ } from '@server/config/tz'

const { res, mockClear } = getMockRes()

vi.mock('firebase-admin/app')
vi.mock('firebase/app')
vi.mock('firebase/firestore')

let config: Config
let discord: DiscordAdapter
let firestore: FirestoreAdapter
let adminTestController: AdminTestController

beforeEach(() => {
  mockClear()
  config = mockConfig()

  discord = new DiscordAdapter(config)
  firestore = new FirestoreAdapter(config)
  adminTestController = new AdminTestController(discord, firestore)
})

describe('discordWebhook', () => {
  it('sends a webhook to discord', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockImplementationOnce((url, options) => {
      expect(url).toBe('https://DISCORD_WEBHOOK')
      expect(options?.body).toMatchSnapshot()

      return Promise.resolve(new Response(null, { status: 204 }))
    })
    const req = getMockReq({
      body: {
        eventId: 'event123',
      },
    })
    FirebaseMock.mockGetEvent({
      date: DateTime.fromISO('2021-01-01', TZ),
      id: 'event-id1',
      isSkipped: false,
      theme: 'theme1',
      slug: null,
      movies: [{
        director: 'director1',
        length: 100,
        notionId: 'notion-id1',
        posterPath: '/poster1.png',
        showingUrl: null,
        theaterName: null,
        time: '6:00 PM',
        title: 'movie1',
        tmdbId: 1,
        url: 'https://example.com',
        year: 2021,
      }, {
        director: 'director2',
        length: 200,
        notionId: 'notion-id2',
        posterPath: '/poster2.jpg',
        showingUrl: null,
        theaterName: null,
        time: '8:00 PM',
        title: 'movie2',
        tmdbId: 2,
        url: 'https://example.com',
        year: 1999,
      }],
    })

    await adminTestController.discordWebhook(req, res)

    expect(res.sendStatus).toHaveBeenCalledWith(204)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns 404 if event not found', async () => {
    const req = getMockReq({
      body: {
        eventId: 'event123',
      },
    })
    FirebaseMock.mockGetEvent()
    FirebaseMock.mockEvents([]) // Fallback needed for slug search

    await adminTestController.discordWebhook(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.send).toHaveBeenCalledWith('Event not found')
  })
})
