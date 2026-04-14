
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockReq, getMockRes } from '@tests/support/expressMocks'
import { CronController } from '@server/controllers/cronController'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { mockConfig } from '@tests/support/mockConfig'
import { FirebaseMock } from '@tests/support/firebaseMock'
import { transaction } from '@mocks/firebase/firestore'
import { TMDB_POSTER_URL } from '@server/data/tmdb/constants'
import Config from '@server/config/config'
import { getDocs } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { TZ } from '@server/config/tz'

const { res, mockClear } = getMockRes()

let firestore: FirestoreAdapter
let config: Config

vi.mock('firebase-admin/app')
vi.mock('firebase/app')
vi.mock('firebase/firestore')

beforeEach(() => {
  mockClear()
  config = mockConfig()
  firestore = new FirestoreAdapter(config)
  vi.clearAllMocks()
})

describe('reminders', () => {
  describe('there is an event tomorrow', () => {
    beforeEach(() => {
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
    })

    describe('there are users subscribed', () => {
      beforeEach(() => {
        FirebaseMock.mockGetUsers([
          {
            id: 'user-id1',
            email: 'user_with_reminder1@example.com',
            reminders: true,
          }, {
            id: 'user-id2',
            email: 'user_with_reminder2@example.com',
            reminders: true,
          },
        ])
      })

      it('should send a reminder to those users', async () => {
        await new CronController(config, firestore).reminders(getMockReq(), res)

        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('mail', expect.anything()),
          {
            to: 'user_with_reminder1@example.com',
            template: {
              name: 'reminder',
              data: {
                date: 'Friday, January 1',
                theme: 'theme1',
                eventId: '2021-01-01',
                unsubscribeUrl: config.appUrl + '/unsubscribe?token=user-id1',
                movies: [{
                  title: 'movie1',
                  posterPath: TMDB_POSTER_URL + 'w300/poster1.png',
                  year: '2021',
                  time: '6:00 PM',
                }, {
                  title: 'movie2',
                  posterPath: TMDB_POSTER_URL + 'w300/poster2.jpg',
                  year: '1999',
                  time: '8:00 PM',
                }],
              },
            },
          },
        )

        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('mail', expect.anything()),
          {
            to: 'user_with_reminder2@example.com',
            template: {
              name: 'reminder',
              data: {
                date: 'Friday, January 1',
                theme: 'theme1',
                eventId: '2021-01-01',
                unsubscribeUrl: config.appUrl + '/unsubscribe?token=user-id2',
                movies: [{
                  title: 'movie1',
                  posterPath: TMDB_POSTER_URL + 'w300/poster1.png',
                  year: '2021',
                  time: '6:00 PM',
                }, {
                  title: 'movie2',
                  posterPath: TMDB_POSTER_URL + 'w300/poster2.jpg',
                  year: '1999',
                  time: '8:00 PM',
                }],
              },
            },
          },
        )
      })
    })
  })

  describe('there is no event tomorrow', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent()
      FirebaseMock.mockEvents([])
    })

    it('should return 200', async () => {
      await new CronController(config, firestore).reminders(getMockReq(), res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith('ok')
    })
  })

  describe('the event is skipped', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent({
        id: 'event-id1',
        theme: 'theme1',
        date: DateTime.fromISO('2021-01-01', TZ),
        slug: null,
        isSkipped: true,
      })
    })

    it('should return 200', async () => {
      await new CronController(config, firestore).reminders(getMockReq(), res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith('ok')
      expect(getDocs).not.toHaveBeenCalled()
    })
  })

  describe('the event is hideFromHome', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent({
        id: 'event-id1',
        theme: 'theme1',
        date: DateTime.fromISO('2021-01-01', TZ),
        slug: null,
        isSkipped: false,
        hideFromHome: true,
      })
    })

    it('should return 200', async () => {
      await new CronController(config, firestore).reminders(getMockReq(), res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith('ok')
      expect(getDocs).not.toHaveBeenCalled()
    })
  })
})
