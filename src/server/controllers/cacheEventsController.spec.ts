import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NotionMock } from '@tests/support/notionMock'
import NotionAdapter from '@server/data/notion/notionAdapter'
import CacheController from '@server/controllers/cacheEventsController'
import { transaction } from '@mocks/firebase/firestore'
import { Request } from 'express'
import { Event } from '@server/models/event'
import { FirebaseMock } from '@tests/support/firebaseMock'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { NotionMovie } from '@tests/support/notionHelpers'
import { TmdbMock } from '@tests/support/tmdbMock'
import { mockFetch } from '@tests/support/fetchMock'
import { Movie } from '@server/models/movie'
import TmdbAdapter from '@server/data/tmdb/tmdbAdapter'
import { mockConfig } from '@tests/support/mockConfig'
import MovieFactory from '@tests/support/factories/movieFactory'
import MockDate from 'mockdate'
import { RichText } from '@shared/dtos'
import { DateTime } from 'luxon'
import { TZ } from '@server/config/tz'
import { setDoc, Timestamp } from 'firebase/firestore'
import { getMockReq, getMockRes } from '@tests/support/expressMocks'

let notionMock: NotionMock

vi.mock('firebase-admin/app')
vi.mock('firebase/app')
vi.mock('firebase/firestore')
vi.mock('@notionhq/client')
vi.mock('@server/helpers/directoryPath')

const { res, mockClear } = getMockRes()
let req: Request

const newCacheController = () => {
  const config = mockConfig()
  const firestore = new FirestoreAdapter(config)
  const notion = new NotionAdapter(config)
  const tmdbAdapter = new TmdbAdapter(config)

  return new CacheController(firestore, notion, tmdbAdapter)
}

beforeAll(() => {

  MockDate.set('2021-01-01T00:00:00.000Z')
  notionMock = new NotionMock()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('show', () => {
  beforeEach(() => {
    req = getMockReq()
    FirebaseMock.mockGetGlobal('lastUpdated', {
      updatedEvents: 3,
      previousLastUpdated: null,
      newLastUpdated: Timestamp.fromDate(new Date('2021-01-01T00:00:00.000Z')),
      tmdbMoviesSynced: [],
    })
  })

  it('returns the lastUpdated data', async () => {
    await newCacheController().show(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      updatedEvents: 3,
      previousLastUpdated: null,
      newLastUpdated: '2021-01-01T00:00:00.000Z',
      tmdbMoviesSynced: [],
    })
  })
})

describe('store', () => {
  beforeEach(() => {
    req = getMockReq()
  })

  describe('when the cache is empty', () => {
    const styled: RichText[] = [
      {
        type: 'text',
        text: {
          content: 'event',
          link: null,
        },
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
        plain_text: 'event',
        href: null,
      },
      {
        type: 'text',
        text: {
          content: 'id 3',
          link: null,
        },
        annotations: {
          bold: false,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'red',
        },
        plain_text: 'id 3',
        href: null,
      },
    ]

    beforeEach(() => {
      notionMock.mockIsFullPage(true)
      FirebaseMock.mockGetGlobal('lastUpdated')
      notionMock.mockQuery([
        NotionMock.mockEvent({
          id: 'id1',
          date: '2021-01-01',
          theme: 'theme1',
          lastEditedTime: '2022-08-12T15:45:00.000Z',
          submittedBy: 'submittedBy',
        }),
        NotionMock.mockEvent({
          id: 'id2',
          date: '2021-01-08',
          theme: 'theme2',
          skipped: true,
          lastEditedTime: '2023-08-12T15:45:00.000Z',
        }),
        NotionMock.mockEvent({
          id: 'id3',
          date: '2021-01-15',
          theme: 'theme3',
          slug: 'slug',
          styledTheme: styled,
          lastEditedTime: '2021-08-12T15:45:00.000Z',
        }),
      ])
    })

    it('returns the updated data', async () => {
      await newCacheController().store(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        updatedEvents: 3,
        previousLastUpdated: null,
        newLastUpdated: '2023-08-12T15:45:00.000Z',
        tmdbMoviesSynced: [],
      })
    })

    it('updates all events in firestore', async () => {
      await newCacheController().store(req, res)

      expect(transaction.set).toHaveBeenCalledTimes(3)
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          FirebaseMock.mockEvent({
            id: 'id1',
            theme: 'theme1',
            date: '2021-01-01',
            lastEditedTime: '2022-08-12T15:45:00.000Z',
            submittedBy: 'submittedBy',
          }),
        )
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-08'),
          FirebaseMock.mockEvent({
            id: 'id2',
            theme: 'theme2',
            date: '2021-01-08',
            isSkipped: true,
            lastEditedTime: '2023-08-12T15:45:00.000Z',
          }),
        )
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-15'),
          FirebaseMock.mockEvent({
            id: 'id3',
            theme: 'theme3',
            date: '2021-01-15',
            slug: 'slug',
            styledTheme: styled,
            lastEditedTime: '2021-08-12T15:45:00.000Z',
          }),
        )
    })

    it('calls query with the correct parameters', async () => {
      await newCacheController().store(req, res)

      expect(notionMock.query).toHaveBeenCalledWith({
        data_source_id: 'NOTION_EVENT_DATA_SOURCE_ID',
        page_size: 100,
        filter: {
          property: 'Date',
          date: { is_not_empty: true },
        },
        sorts: [{
          property: 'Date',
          direction: 'ascending',
        }],
      })
    })

    it('stores the lastUpdated metadata in firestore', async () => {
      await newCacheController().store(req, res)

      expect(setDoc).toHaveBeenCalledWith(
        FirebaseMock.mockDoc('globals', 'lastUpdated'),
        { value: {
          updatedEvents: 3,
          previousLastUpdated: null,
          newLastUpdated: Timestamp.fromDate(new Date('2023-08-12T15:45:00.000Z')),
          tmdbMoviesSynced: [],
        } },
      )
    })
  })

  describe('when cache lastUpdated already exists', () => {
    beforeEach(() => {
      notionMock.mockIsFullPage(true)
      FirebaseMock.mockGetGlobal('lastUpdated', {
        updatedEvents: 3,
        previousLastUpdated: null,
        newLastUpdated: Timestamp.fromDate(new Date('2021-01-01T00:00:00.000Z')),
        tmdbMoviesSynced: [],
      })
      notionMock.mockQuery([
        NotionMock.mockEvent({
          id: 'id1',
          date: '2021-01-01',
          theme: 'theme1',
          lastEditedTime: '2022-08-12T15:45:00.000Z',
        }),
        NotionMock.mockEvent({
          id: 'id2',
          date: '2021-01-08',
          theme: 'theme2',
          lastEditedTime: '2023-08-12T15:45:00.000Z',
          skipped: true,
        }),
        NotionMock.mockEvent({
          id: 'id3',
          date: '2021-01-15',
          theme: 'theme3',
          lastEditedTime: '2021-08-12T15:45:00.000Z',
          slug: 'slug',
        }),
      ])
    })

    it('returns the updated data', async () => {
      await newCacheController().store(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        updatedEvents: 3,
        previousLastUpdated: '2021-01-01T00:00:00.000Z',
        newLastUpdated: '2023-08-12T15:45:00.000Z',
        tmdbMoviesSynced: [],
      })
    })

    it('updates all events in firestore', async () => {
      await newCacheController().store(req, res)

      expect(transaction.set).toHaveBeenCalledTimes(3)
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          FirebaseMock.mockEvent({
            id: 'id1',
            theme: 'theme1',
            date: '2021-01-01',
            lastEditedTime: '2022-08-12T15:45:00.000Z',
          }),
        )
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-08'),
          FirebaseMock.mockEvent({
            id: 'id2',
            theme: 'theme2',
            date: '2021-01-08',
            isSkipped: true,
            lastEditedTime: '2023-08-12T15:45:00.000Z',
          }),
        )
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-15'),
          FirebaseMock.mockEvent({
            id: 'id3',
            theme: 'theme3',
            date: '2021-01-15',
            slug: 'slug',
            lastEditedTime: '2021-08-12T15:45:00.000Z',
          }),
        )
    })

    it('should call query with the correct parameters', async () => {
      await newCacheController().store(req, res)

      expect(notionMock.query).toHaveBeenCalledWith({
        data_source_id: 'NOTION_EVENT_DATA_SOURCE_ID',
        page_size: 100,
        filter: {
          and: [
            {
              property: 'Date',
              date: { is_not_empty: true },
            },
            {
              or: [
                {
                  property: 'Last edited time',
                  date: { after: '2021-01-01T00:00:00.000Z' },
                },
                {
                  property: 'Last edited movie time',
                  date: { after: '2021-01-01T00:00:00.000Z' },
                },
              ],
            },
          ],
        },
        sorts: [{
          property: 'Date',
          direction: 'ascending',
        }],
      })
    })

    it('updates the lastUpdated date in firestore', async () => {
      await newCacheController().store(req, res)

      expect(setDoc).toHaveBeenCalledWith(
        FirebaseMock.mockDoc('globals', 'lastUpdated'),
        { value: {
          updatedEvents: 3,
          previousLastUpdated: Timestamp.fromDate(new Date('2021-01-01T00:00:00.000Z')),
          newLastUpdated: Timestamp.fromDate(new Date('2023-08-12T15:45:00.000Z')),
          tmdbMoviesSynced: [],
        } },
      )
    })
  })

  describe('when no events are returned', () => {
    beforeEach(() => {
      notionMock.mockIsFullPage(true)
      FirebaseMock.mockGetGlobal('lastUpdated',{
        updatedEvents: 3,
        previousLastUpdated: null,
        newLastUpdated: Timestamp.fromDate(new Date('2021-01-01T00:00:00.000Z')),
        tmdbMoviesSynced: [],
      })
      notionMock.mockQuery([])
    })

    it('does not store any events', async () => {
      await newCacheController().store(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        updatedEvents: 0,
        previousLastUpdated: '2021-01-01T00:00:00.000Z',
        newLastUpdated: '2021-01-01T00:00:00.000Z',
        tmdbMoviesSynced: [],
      })
      expect(transaction.set).not.toHaveBeenCalled()
    })

    it('updates lastUpdated', async () => {
      await newCacheController().store(req, res)

      expect(setDoc).toHaveBeenCalledWith(
        FirebaseMock.mockDoc('globals', 'lastUpdated'),
        { value: {
          updatedEvents: 0,
          previousLastUpdated: Timestamp.fromDate(new Date('2021-01-01T00:00:00.000Z')),
          newLastUpdated: Timestamp.fromDate(new Date('2021-01-01T00:00:00.000Z')),
          tmdbMoviesSynced: [],
        } },
      )
    })
  })

  describe('movies with all details', () => {
    let expected: Movie

    const movieDetails = {
      title: 'movieTitle',
      director: 'movieDirector',
      year: 2021,
      length: 90,
      time: '6:00 PM',
      url: 'https://www.themoviedb.org/movie/1234',
      posterPath: '/poster.jpg',
      theaterName: 'movieTheaterName',
      showingUrl: 'movieShowingUrl',
    }

    beforeEach(() => {
      expected = new Movie({
        notionId: 'notionId',
        ...movieDetails,
      })
      const notionResponse = new NotionMovie({
        id: 'notionId',
        ...movieDetails,
      })
      notionMock.mockIsFullPage(true)
      notionMock.mockQuery([
        NotionMock.mockEvent({
          id: 'id1',
          date: '2021-01-01',
          theme: 'theme1',
          movies: [notionResponse],
          lastEditedTime: DateTime.now().toISO(),
        }),
      ])
      notionMock.mockRetrieve(notionResponse)
      req = getMockReq()
    })

    it('returns the updated data', async () => {
      await newCacheController().store(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        updatedEvents: 1,
        previousLastUpdated: '2021-01-01T00:00:00.000Z',
        newLastUpdated: '2021-01-01T00:00:00.000Z',
        tmdbMoviesSynced: [],
      })
    })

    it('stores data from tmdb in firestore', async () => {
      await newCacheController().store(req, res)

      expect(transaction.set).toHaveBeenCalledTimes(1)
      expect(transaction.set).toHaveBeenCalledWith(
        FirebaseMock.mockDoc('events', '2021-01-01'),
        new Event({
          id: 'id1',
          theme: 'theme1',
          date: DateTime.fromISO('2021-01-01', TZ),
          movies: [expected],
        }).toFirebaseDTO(),
      )
    })

    it('does not update the movie in notion', async () => {
      await newCacheController().store(req, res)

      expect(notionMock.update).not.toHaveBeenCalled()
    })
  })

  describe('movies without directors', () => {
    let expected: Movie

    beforeEach(() => {
      expected = new Movie({
        title: 'title',
        director: 'director',
        year: 2001,
        length: 90,
        time: '6:00 PM',
        url: 'https://www.themoviedb.org/movie/1234',
        posterPath: '/poster.jpg',
        tmdbId: 1234,
        notionId: 'notionId',
      })
      const tmdb = new Movie({
        title: 'title',
        director: 'director',
        year: 2001,
        length: 90,
        url: 'https://www.themoviedb.org/movie/1234',
        posterPath: '/poster.jpg',
        tmdbId: 1234,
      })
      const notionResponse = new NotionMovie({ id: 'notionId', title: 'title' })
      notionMock.mockIsFullPage(true)
      notionMock.mockQuery([
        NotionMock.mockEvent({
          id: 'id1',
          date: '2021-01-01',
          theme: 'theme1',
          movies: [notionResponse],
          lastEditedTime: DateTime.now().toISO(),
        }),
      ])
      notionMock.mockRetrieve(notionResponse)
      req = getMockReq()
      const tmdbMock = new TmdbMock(mockFetch())
      tmdbMock.mockSearchMovie(tmdb)
      tmdbMock.mockMovieDetails(tmdb)
    })

    it('returns the updated data', async () => {
      await newCacheController().store(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        updatedEvents: 1,
        previousLastUpdated: '2021-01-01T00:00:00.000Z',
        newLastUpdated: '2021-01-01T00:00:00.000Z',
        tmdbMoviesSynced: [expected.toDTO()],
      })
    })

    it('stores data from tmdb in firestore', async () => {
      await newCacheController().store(req, res)

      expect(transaction.set).toHaveBeenCalledTimes(1)
      expect(transaction.set).toHaveBeenCalledWith(
        FirebaseMock.mockDoc('events', '2021-01-01'),
        new Event({
          id: 'id1',
          theme: 'theme1',
          date: DateTime.fromISO('2021-01-01', TZ),
          movies: [expected],
        }).toFirebaseDTO(),
      )
    })

    it('updates the movie in notion', async () => {
      await newCacheController().store(req, res)

      expect(notionMock.update).toHaveBeenCalledWith(expected.toNotion())
    })
  })

  describe('movies without times', () => {
    const setupNotionMocks = (movies: Movie[], date = '2021-01-01') => {
      const notionResponse = movies.map(NotionMovie.fromMovie)
      notionMock.mockIsFullPage(true)
      notionMock.mockQuery([
        NotionMock.mockEvent({
          id: 'id1',
          date,
          theme: 'theme1',
          movies: notionResponse,
        }),
      ])
      notionResponse.forEach((movie) => notionMock.mockRetrieve(movie))
    }

    describe('no times at all, even numbers', () => {
      let expected: Movie[]

      beforeEach(() => {
        expected = new MovieFactory()
          .state({ time: null, tmdbId: null })
          .makeMany(2)
        setupNotionMocks(expected)
        expected[0].time = '6:00 PM'
        expected[1].time = '7:45 PM'
      })

      it('updates times when adding to firebase', async () => {
        await newCacheController().store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(transaction.set).toHaveBeenCalledTimes(1)
        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          new Event({
            id: 'id1',
            theme: 'theme1',
            date: DateTime.fromISO('2021-01-01', TZ),
            movies: expected,
          }).toFirebaseDTO(),
        )
      })

      it('updates the movie in notion', async () => {
        await newCacheController().store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[0].toNotion())
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[1].toNotion())
      })
    })

    describe('no times at all, irregular length', () => {
      let expected: Movie[]

      beforeEach(() => {
        expected = new MovieFactory()
          .state({ time: null, tmdbId: null, length: 123 })
          .makeMany(2)
        setupNotionMocks(expected)
        expected[0].time = '6:00 PM'
        expected[1].time = '8:20 PM'
      })

      it('rounds to nearest 5 minute interval', async () => {
        await newCacheController().store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(transaction.set).toHaveBeenCalledTimes(1)
        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          new Event({
            id: 'id1',
            theme: 'theme1',
            date: DateTime.fromISO('2021-01-01', TZ),
            movies: expected,
          }).toFirebaseDTO(),
        )
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[0].toNotion())
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[1].toNotion())
      })
    })

    describe('has starter time', () => {
      let expected: Movie[]

      beforeEach(() => {
        expected = [
          new MovieFactory().make({ time: '7:00 PM', tmdbId: null }),
          new MovieFactory().make({ time: null, tmdbId: null }),
        ]
        setupNotionMocks(expected)
        expected[1].time = '8:45 PM'
      })

      it('assigns all other proper times', async () => {
        await newCacheController().store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(transaction.set).toHaveBeenCalledTimes(1)
        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          new Event({
            id: 'id1',
            theme: 'theme1',
            date: DateTime.fromISO('2021-01-01', TZ),
            movies: expected,
          }).toFirebaseDTO(),
        )
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[0].toNotion())
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[1].toNotion())
      })
    })

    describe('first time is not proper time', () => {
      let expected: Movie[]

      beforeEach(() => {
        expected = [
          new MovieFactory().make({ time: 'Afternoon', tmdbId: null }),
          new MovieFactory().make({ time: null, tmdbId: null }),
        ]
        setupNotionMocks(expected)
      })

      it('caches without update and does not update notion', async () => {
        await newCacheController().store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          new Event({
            id: 'id1',
            theme: 'theme1',
            date: DateTime.fromISO('2021-01-01', TZ),
            movies: expected,
          }).toFirebaseDTO(),
        )
        expect(notionMock.update).not.toHaveBeenCalled()
      })
    })

    describe('first movie has no director', () => {
      let expected: Movie[]

      beforeEach(() => {
        expected = [
          new MovieFactory().make({ time: null, tmdbId: null, director: null }),
          new MovieFactory().make({ time: null, tmdbId: null, length: 123 }),
          new MovieFactory().make({ time: null, tmdbId: null }),
        ]
        setupNotionMocks(expected)
        expected[1].time = '6:00 PM'
        expected[2].time = '8:20 PM'
      })

      it('skips the movie', async () => {
        await newCacheController().store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          new Event({
            id: 'id1',
            theme: 'theme1',
            date: DateTime.fromISO('2021-01-01', TZ),
            movies: expected,
          }).toFirebaseDTO(),
        )
        expect(notionMock.update)
          .not.toHaveBeenCalledWith(expected[0].toNotion())
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[1].toNotion())
        expect(notionMock.update)
          .toHaveBeenCalledWith(expected[2].toNotion())
      })
    })

    describe('movies in the past', () => {
      let expected: Movie[]

      beforeEach(() => {
        expected = new MovieFactory()
          .state({ time: null, tmdbId: null })
          .makeMany(2)
        setupNotionMocks(expected, '2020-01-01')
      })

      it('caches without update and does not update notion', async () => {
        await newCacheController().store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(transaction.set).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2020-01-01'),
          new Event({
            id: 'id1',
            theme: 'theme1',
            date: DateTime.fromISO('2020-01-01', TZ),
            movies: expected,
          }).toFirebaseDTO(),
        )
        expect(notionMock.update).not.toHaveBeenCalled()
      })
    })
  })
})
