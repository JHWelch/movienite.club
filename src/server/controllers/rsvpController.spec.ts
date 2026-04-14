import RsvpController from '@server/controllers/rsvpController'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockReq, getMockRes } from '@tests/support/expressMocks'
import { Timestamp, addDoc, setDoc } from 'firebase/firestore'
import { FirebaseMock } from '@tests/support/firebaseMock'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { mockConfig } from '@tests/support/mockConfig'
import { Request } from 'express'
import { Event } from '@server/models/event'
import EventFactory from '@tests/support/factories/eventFactory'
import MovieFactory from '@tests/support/factories/movieFactory'
import { DateTime } from 'luxon'
import { TMDB_POSTER_URL } from '@server/data/tmdb/constants'
import { TZ } from '@server/config/tz'
import MockDate from 'mockdate'

const { res, mockClear } = getMockRes()

vi.mock('firebase/firestore')

beforeEach(() => {
  vi.clearAllMocks()
  mockClear()
  MockDate.set('2021-01-01')
})

const mockBody = ({
  name = 'test name',
  email = 'test@example.com',
  reminders = false,
}: {
  name?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  email?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  reminders?: any // eslint-disable-line @typescript-eslint/no-explicit-any
} = {}) => ({ name, email, reminders })

describe('store', () => {
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
        theme: 'theme1',
      })
      event.movies = [
        new MovieFactory().make({
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
        }),
        new MovieFactory().make({
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
        }),
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
        body: mockBody(),
      })
    })

    it('submits the form', async () => {
      await new RsvpController(firestoreAdapter).store(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(addDoc).toHaveBeenCalledWith(
        FirebaseMock.mockCollection('rsvps'),
        {
          event: '2021-01-01',
          name: 'test name',
          email: 'test@example.com',
          createdAt: expect.any(Timestamp.constructor),
        },
      )
    })

    it('sends an email to admins', async () => {
      await new RsvpController(firestoreAdapter).store(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(addDoc).toHaveBeenCalledWith(
        FirebaseMock.mockCollection('mail'),
        {
          to: 'ADMIN_EMAIL@example.com',
          message: {
            subject: 'TNMC RSVP: test name',
            text: 'test name has RSVPed for 2021-01-01\n\nEmail: test@example.com',
            html: '<p>test name has RSVPed for 2021-01-01<p><ul><li>Email: test@example.com</li></ul>',
          },
        },
      )
    })

    it('sends a confirmation email to the user', async () => {
      await new RsvpController(firestoreAdapter).store(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(addDoc).toHaveBeenCalledWith(
        FirebaseMock.mockCollection('mail'),
        {
          to: 'test@example.com',
          template: {
            name: 'rsvpConfirmation',
            data: {
              date: 'Friday, January 1',
              theme: 'theme1',
              eventId: '2021-01-01',
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

    describe('reminders are enabled', () => {
      beforeEach(() => {
        req.body.reminders = true
      })

      describe('user does not exist', () => {
        beforeEach(() => {
          FirebaseMock.mockGetUserByEmail()
        })

        it('submits the form', async () => {
          await new RsvpController(firestoreAdapter).store(req, res)

          expect(res.status).toHaveBeenCalledWith(201)
          expect(addDoc).toHaveBeenCalledWith(
            FirebaseMock.mockCollection('rsvps'),
            {
              event: '2021-01-01',
              name: 'test name',
              email: 'test@example.com',
              createdAt: expect.any(Timestamp.constructor),
            },
          )
        })

        it('creates a new user with reminders enabled', async () => {
          await new RsvpController(firestoreAdapter).store(req, res)

          expect(addDoc).toHaveBeenCalledWith(
            FirebaseMock.mockCollection('users'),
            {
              email: 'test@example.com',
              reminders: true,
            },
          )
        })
      })

      describe('user already exists and is unsubscribed', () => {
        beforeEach(() => {
          FirebaseMock.mockGetUserByEmail({
            id: 'id',
            email: 'test@example.com',
            reminders: false,
          })
        })

        it('submits the form', async () => {
          await new RsvpController(firestoreAdapter).store(req, res)

          expect(res.status).toHaveBeenCalledWith(201)
          expect(addDoc).toHaveBeenCalledWith(
            FirebaseMock.mockCollection('rsvps'),
            {
              event: '2021-01-01',
              name: 'test name',
              email: 'test@example.com',
              createdAt: expect.any(Timestamp.constructor),
            },
          )
        })

        it('updates the user to be subscribed', async () => {
          await new RsvpController(firestoreAdapter).store(req, res)

          expect(setDoc).toHaveBeenCalledWith(
            FirebaseMock.mockDoc('users', 'id'),
            {
              email: 'test@example.com',
              reminders: true,
            },
          )
        })
      })

      describe('user already exists and is subscribed', () => {
        beforeEach(() => {
          FirebaseMock.mockGetUserByEmail({
            id: 'id',
            email: 'test@example.com',
            reminders: true,
          })
        })

        it('submits the form', async () => {
          await new RsvpController(firestoreAdapter).store(req, res)

          expect(res.status).toHaveBeenCalledWith(201)
          expect(addDoc).toHaveBeenCalledWith(
            FirebaseMock.mockCollection('rsvps'),
            {
              event: '2021-01-01',
              name: 'test name',
              email: 'test@example.com',
              createdAt: expect.any(Timestamp.constructor),
            },
          )
        })

        it('does not update users', async () => {
          await new RsvpController(firestoreAdapter).store(req, res)

          expect(setDoc).not.toHaveBeenCalled()
        })
      })
    })

    describe('reminders is not boolean', () => {
      beforeEach(() => {
        req.body.reminders = 'invalid'
      })

      it('should return a 422', async () => {
        await new RsvpController(firestoreAdapter).store(req, res)

        expect(res.status).toHaveBeenCalledWith(422)
        expect(res.json).toHaveBeenCalledWith({
          errors: { reminders: 'Invalid input: expected boolean, received string' },
        })
      })
    })

    describe('email is missing', () => {
      beforeEach(() => {
        delete req.body.email
      })

      it('submits the form', async () => {
        await new RsvpController(firestoreAdapter).store(req, res)

        expect(res.status).toHaveBeenCalledWith(201)
        expect(addDoc).toHaveBeenCalledWith(
          FirebaseMock.mockCollection('rsvps'),
          {
            event: '2021-01-01',
            name: 'test name',
            email: null,
            createdAt: expect.any(Timestamp.constructor),
          },
        )
      })

      it('sends an email to admins', async () => {
        await new RsvpController(firestoreAdapter).store(req, res)

        expect(res.status).toHaveBeenCalledWith(201)
        expect(addDoc).toHaveBeenCalledWith(
          FirebaseMock.mockCollection('mail'),
          {
            to: 'ADMIN_EMAIL@example.com',
            message: {
              subject: 'TNMC RSVP: test name',
              text: 'test name has RSVPed for 2021-01-01\n\nEmail: None',
              html: '<p>test name has RSVPed for 2021-01-01<p><ul><li>Email: None</li></ul>',
            },
          },
        )
      })

      it('does not send an email to the user', async () => {
        await new RsvpController(firestoreAdapter).store(req, res)

        expect(res.status).toHaveBeenCalledWith(201)
        expect(addDoc).toHaveBeenCalledTimes(2) // rsvp and admin email
      })

      describe('reminders is selected', () => {
        it('should return a 422', async () => {
          req.body.reminders = true

          await new RsvpController(firestoreAdapter).store(req, res)

          expect(res.status).toHaveBeenCalledWith(422)
          expect(res.json).toHaveBeenCalledWith({
            errors: { email: 'Email is required to receive reminders' },
          })
        })
      })
    })

    describe('email is invalid', () => {
      beforeEach(() => {
        req.body.email = 'invalid'
      })

      it('should return a 422', async () => {
        await new RsvpController(firestoreAdapter).store(req, res)

        expect(res.status).toHaveBeenCalledWith(422)
        expect(res.json).toHaveBeenCalledWith({
          errors: { email: 'Invalid email address' },
        })
      })
    })

    describe('name is missing', () => {
      beforeEach(() => {
        delete req.body.name
      })

      it('should return a 422', async () => {
        await new RsvpController(firestoreAdapter).store(req, res)

        expect(res.status).toHaveBeenCalledWith(422)
        expect(res.json).toHaveBeenCalledWith({
          errors: { name: 'Invalid input: expected string, received undefined' },
        })
      })
    })

    describe('name is empty string', () => {
      beforeEach(() => {
        req.body.name = ''
      })

      it('should return a 422', async () => {
        await new RsvpController(firestoreAdapter).store(req, res)

        expect(res.status).toHaveBeenCalledWith(422)
        expect(res.json).toHaveBeenCalledWith({
          errors: { name: 'Required' },
        })
      })
    })
  })

  describe('event does not exist', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent()
      FirebaseMock.mockEvents([])
      req = getMockReq({
        params: { eventId: '2021-01-01' },
        body: mockBody(),
      })
    })

    it('should return a 404', async () => {
      await new RsvpController(firestoreAdapter).store(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Event 2021-01-01 not found',
      })
    })
  })
})
