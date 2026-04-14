import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import NotionAdapter from '@server/data/notion/notionAdapter'
import { NotionMock } from '@tests/support/notionMock'
import { mockConfig } from '@tests/support/mockConfig'
import MovieFactory from '@tests/support/factories/movieFactory'
import { RichText } from '@shared/dtos'
import { DateTime } from 'luxon'
import { TZ } from '@server/config/tz'
import { Movie } from '@server/models/movie'
import { NotionMovie } from '@server/__tests__/support/notionHelpers'

let notion: NotionAdapter
let notionMock: NotionMock

vi.mock('@notionhq/client')

beforeAll(() => {
  notionMock = new NotionMock()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getMovie', () => {
  beforeEach(() => {
    notionMock.mockRetrieve()
  })

  describe('when the movie exists', () => {
    beforeEach(() => {
      notionMock.mockIsFullPage(true)
    })

    it('should return the movie', async () => {
      const movie = await new NotionAdapter(mockConfig()).getMovie('movieId')

      expect(movie).toMatchObject({
        notionId: 'movieId',
        title: 'movieTitle',
        director: 'movieDirector',
        year: 2021,
        length: 120,
        time: '8:00 PM',
        url: 'movieUrl',
        posterPath: 'moviePosterPath',
        theaterName: 'movieTheaterName',
        showingUrl: 'movieShowingUrl',
        tmdbId: 123,
      })
    })

    it ('calls the retrieve method with page_id', async () => {
      await new NotionAdapter(mockConfig()).getMovie('movieId')

      expect(notionMock.retrieve).toHaveBeenCalledWith({ page_id: 'movieId' })
    })
  })

  describe('returns not full page', () => {
    beforeEach(() => {
      notionMock.mockIsFullPage(false)
    })

    it('should throw an error', async () => {
      await expect(new NotionAdapter(mockConfig()).getMovie('movieId'))
        .rejects.toThrowError('Page was not successfully retrieved')
    })
  })
})

describe('getMovieByTmdbId', () => {
  beforeEach(() => {
    notion = new NotionAdapter(mockConfig())
  })

  it('will return a movie if found', async () => {
    const notionMovie = NotionMovie.demo()
    notionMovie.tmdbId = 123
    notionMock.mockQuery([
      notionMovie.toPageObjectResponse(),
    ])
    notionMock.mockIsFullPage(true)

    const movie = await notion.getMovieByTmdbId(123)

    expect(movie).toMatchObject({
      notionId: 'movieId',
      tmdbId: 123,
    })
  })

  it('will return null if not found', async () => {
    notionMock.mockQuery([])

    const movie = await notion.getMovieByTmdbId(999)

    expect(movie).toBeNull()
  })

  it('will return null if not a full page', async () => {
    const notionMovie = NotionMovie.demo()
    notionMock.mockQuery([
      notionMovie.toPageObjectResponse(),
    ])
    notionMock.mockIsFullPage(false)

    const movie = await notion.getMovieByTmdbId(123)

    expect(movie).toBeNull()
  })

  it('queries Notion with the proper arguments', () => {
    notionMock.mockQuery([])

    notion.getMovieByTmdbId(123)

    expect(notionMock.query).toHaveBeenCalledWith({
      data_source_id: mockConfig().notionMovieDatabaseId,
      filter: {
        property: 'TMDB Id',
        number: { equals: 123 },
      },
    })
  })
})

describe('getEvent', () => {
  beforeEach(() => {
    process.env = {
      NOTION_TOKEN: 'NOTION_TOKEN',
      DATABASE_ID: 'DATABASE_ID',
    }
    notionMock.mockQuery([
      NotionMock.mockEvent({
        id: 'eventId',
        date: '2021-01-01',
        theme: 'eventTheme',
        tags: ['tag1', 'tag2'],
        hideFromHome: true,
      }),
    ])
  })

  describe('when the event exists', () => {
    beforeEach(() => {
      notionMock.mockIsFullPage(true)
      notion = new NotionAdapter(mockConfig())
    })

    it('should return the event', async () => {
      const event = await notion.getEvent('2021-01-01')

      expect(event).toMatchObject({
        date: DateTime.fromISO('2021-01-01', TZ),
        id: 'eventId',
        isSkipped: false,
        slug: null,
        movies: [],
        theme: 'eventTheme',
        styledTheme: [],
        tags: ['tag1', 'tag2'],
        hideFromHome: true,
      })
    })
  })

  describe('when the event does not exist', () => {
    beforeEach(() => {
      notionMock.mockIsFullPage(false)
      notion = new NotionAdapter(mockConfig())
    })

    it('should throw an error', async () => {
      await expect(notion.getEvent('2021-01-01'))
        .rejects.toThrowError('Page was not successfully retrieved')
    })
  })
})

describe('getEvents', () => {
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
    notionMock.mockQuery([
      NotionMock.mockEvent({
        id: 'eventId3',
        date: '2021-01-15',
        theme: 'theme3',
        lastEditedTime: '2022-08-12T15:45:00.000Z',
      }),
      NotionMock.mockEvent({
        id: 'eventId2',
        date: '2021-01-08',
        theme: 'theme2',
        skipped: true,
        lastEditedTime: '2023-08-12T15:45:00.000Z',
        submittedBy: 'submittedBy',
      }),
      NotionMock.mockEvent({
        id: 'eventId1',
        date: '2021-01-01',
        theme: 'theme1',
        slug: 'eventSlug',
        styledTheme: styled,
        lastEditedTime: '2021-08-12T15:45:00.000Z',
      }),
    ])
    notion = new NotionAdapter(mockConfig())
  })

  it('should return the events', async () => {
    const events = await notion.getEvents()

    expect(events).toEqual([
      {
        id: 'eventId3',
        date: DateTime.fromISO('2021-01-15', TZ),
        isSkipped: false,
        slug: null,
        movies: [],
        theme: 'theme3',
        styledTheme: [],
        lastUpdated: DateTime.fromISO('2022-08-12T15:45:00.000Z'),
        submittedBy: null,
        tags: [],
        hideFromHome: false,
      }, {
        id: 'eventId2',
        date: DateTime.fromISO('2021-01-08', TZ),
        isSkipped: true,
        slug: null,
        movies: [],
        theme: 'theme2',
        styledTheme: [],
        lastUpdated: DateTime.fromISO('2023-08-12T15:45:00.000Z'),
        submittedBy: 'submittedBy',
        tags: [],
        hideFromHome: false,
      }, {
        id: 'eventId1',
        date: DateTime.fromISO('2021-01-01', TZ),
        isSkipped: false,
        slug: 'eventSlug',
        movies: [],
        theme: 'theme1',
        styledTheme: styled,
        lastUpdated: DateTime.fromISO('2021-08-12T15:45:00.000Z'),
        submittedBy: null,
        tags: [],
        hideFromHome: false,
      },
    ])
  })

  it('should call query with the correct parameters', async () => {
    await notion.getEvents()

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
})

describe('setMovie', () => {
  beforeEach(() => {
    notion = new NotionAdapter(mockConfig())
  })

  it('should call the update method with the correct parameters', async () => {
    const movie = new MovieFactory().make()

    await notion.setMovie(movie)

    expect(notionMock.update).toHaveBeenCalledWith(movie.toNotion())
  })
})

describe('createMovie', () => {
  beforeEach(() => {
    notionMock.mockCreate('movieId')
    notion = new NotionAdapter(mockConfig())
  })

  it('should call the create method with the correct parameters', async () => {
    const movie = new Movie({ title: 'Movie Title' })

    await notion.createMovie(movie)

    expect(notionMock.create).toHaveBeenCalledWith({
      parent: { data_source_id: 'NOTION_MOVIE_DATA_SOURCE_ID' },
      properties: movie.notionProperties(),
    })
  })

  it('should return the movie id', async () => {
    const movieId = await notion.createMovie(new Movie({ title: 'Movie Title' }))

    expect(movieId).toEqual('movieId')
  })
})

describe('createEvent', () => {
  beforeEach(() => {
    notion = new NotionAdapter(mockConfig())
  })

  it('should call the create method with the correct parameters', async () => {
    await notion.createEvent('Theme', ['movieId1', 'movieId2'], 'Anonymous')

    expect(notionMock.create).toHaveBeenCalledWith({
      parent: { data_source_id: 'NOTION_EVENT_DATA_SOURCE_ID' },
      properties: {
        Theme: { title: [{ text: { content: 'Theme' } }] },
        'Submitted By': { rich_text: [{ text: { content: 'Anonymous' } }] },
        Movies: { relation: [
          { id: 'movieId1' },
          { id: 'movieId2' },
        ] },
      },
    })
  })
})
