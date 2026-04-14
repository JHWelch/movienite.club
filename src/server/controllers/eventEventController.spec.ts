import EventEventController from '@server/controllers/eventEventController'
import { beforeEach, describe, expect, it, vi, vitest } from 'vitest'
import { getMockReq, getMockRes } from '@tests/support/expressMocks'
import { FirebaseMock } from '@tests/support/firebaseMock'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { mockConfig } from '@tests/support/mockConfig'
import { Request } from 'express'
import { icalGenerator } from '@server/data/icalGenerator'
import { Event } from '@server/models/event'
import EventFactory from '@tests/support/factories/eventFactory'
import MovieFactory from '@tests/support/factories/movieFactory'
import { DateTime } from 'luxon'
import { TZ } from '@server/config/tz'

const { res, mockClear } = getMockRes()

vi.mock('firebase/firestore')

beforeEach(() => {
  vitest.clearAllMocks()
  mockClear()
})

describe('show', () => {
  let firestoreAdapter: FirestoreAdapter
  let req: Request
  let event: Event

  beforeEach(() => {
    firestoreAdapter = new FirestoreAdapter(mockConfig())
  })

  describe('has correct event', () => {
    beforeEach(() => {
      event = new EventFactory().make({
        date: DateTime.fromISO('2021-01-01', TZ),
      })
      event.movies = [
        new MovieFactory().make(),
        new MovieFactory().make(),
      ]

      FirebaseMock.mockGetEvent({
        date: event.date,
        id: event.id,
        isSkipped: event.isSkipped,
        theme: event.theme,
        slug: event.slug,
        movies:  event.movies.map(movie => ({
          director: movie.director ?? '',
          length: movie.length ?? 0,
          notionId: movie.notionId ?? '',
          posterPath: movie.posterPath ?? '',
          showingUrl: movie.showingUrl,
          theaterName: movie.theaterName,
          time: movie.time,
          title: movie.title,
          tmdbId: movie.tmdbId,
          url: movie.url,
          year: movie.year,
        })),
      })
      req = getMockReq({
        params: { eventId: '2021-01-01' },
      })
    })

    it('returns a calendar event for the event', async () => {
      await new EventEventController(firestoreAdapter).show(req, res)

      expect(res.type).toHaveBeenCalledWith('text/calendar')
      expect(res.send).toHaveBeenCalledWith(await icalGenerator(event))
    })
  })

  describe('event does not exist', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent()
      FirebaseMock.mockEvents([])
      req = getMockReq({
        params: { eventId: '2021-01-01' },
      })
    })

    it('should return a 404', async () => {
      await new EventEventController(firestoreAdapter).show(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Event 2021-01-01 not found',
      })
    })
  })
})
