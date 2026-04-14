import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { getMockReq, getMockRes } from '@tests/support/expressMocks'
import MovieController from '@server/controllers/movieController'
import { Request } from 'express'
import { TmdbMock } from '@tests/support/tmdbMock'
import { mockFetch } from '@tests/support/fetchMock'
import TmdbAdapter from '@server/data/tmdb/tmdbAdapter'
import { mockConfig } from '@tests/support/mockConfig'
import MovieFactory from '@tests/support/factories/movieFactory'
import { posterUrl } from '@server/data/tmdb/helpers'
import { TMDB_MOVIE_URL } from '@server/data/tmdb/constants'
import { Movie } from '@server/models/movie'
import { NotionMock } from '@tests/support/notionMock'
import NotionAdapter from '@server/data/notion/notionAdapter'

vi.mock('@notionhq/client')
const { res, mockClear } = getMockRes()
let req: Request
let notionMock: NotionMock

interface MockMovieArgs {
  id: any // eslint-disable-line @typescript-eslint/no-explicit-any
  watchWhere?: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

const newMovieController = () => {
  const config = mockConfig()

  return new MovieController(
    new NotionAdapter(config),
    new TmdbAdapter(config),
  )
}

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
  })

  describe('movies found', () => {
    it('returns a list of searched movies', async () => {
      const movie1 = new MovieFactory().make({
        title: 'Movie Title 1',
        year: 2021,
        tmdbId: 1234,
        posterPath: '/path/to/poster1.jpg',
      })
      const movie2 = new MovieFactory().make({
        title: 'Movie Title 2',
        year: 2022,
        tmdbId: 5678,
        posterPath: '/path/to/poster2.jpg',
      })
      const tmdbMock = new TmdbMock(mockFetch())
      tmdbMock.mockSearchMovie([movie1, movie2])

      req.query = { search: 'Movie Title' }
      await newMovieController().show(req, res)

      expect(res.json).toHaveBeenCalledWith({ movies: [
        {
          title: 'Movie Title 1',
          year: 2021,
          tmdbId: 1234,
          posterPath: posterUrl('/path/to/poster1.jpg', 'w45'),
        },
        {
          title: 'Movie Title 2',
          year: 2022,
          tmdbId: 5678,
          posterPath: posterUrl('/path/to/poster2.jpg', 'w45'),
        },
      ] })
    })
  })

  describe('no search provided', () => {
    it('returns a 400 error', async () => {
      req.query = {}
      await newMovieController().show(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'No search query provided' })
    })
  })
})

describe('store', () => {
  let body: MockMovieArgs
  let movie: Movie

  beforeAll(() => {
    notionMock = new NotionMock()
  })

  beforeEach(() => {
    body = { id: 123 }
    const tmdbMock = new TmdbMock(mockFetch())

    movie = new MovieFactory().tmdbFields().make({
      title: 'movie1',
      tmdbId: 123,
      url: `${TMDB_MOVIE_URL}/123`,
    })
    tmdbMock.mockMovieDetails(movie, 123)
  })

  it('creates a new movie from passed id', async () => {
    const req = getMockReq({ body })

    notionMock.mockCreate('movieId1')

    await newMovieController().store(req, res)

    expect(notionMock.create).toHaveBeenCalledWith({
      parent: { data_source_id: 'NOTION_MOVIE_DATA_SOURCE_ID' },
      properties: movie.notionProperties(),
    })
  })

  it('should return a 201 created', async () => {
    const req = getMockReq({ body })
    notionMock.mockCreate('movieId1')

    await newMovieController().store(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Successfully created movie.',
    })
  })

  it('can include where to watch', async () => {
    body.watchWhere = ['Blu-ray', '4K Blu-ray']
    const req = getMockReq({ body })
    notionMock.mockCreate('movieId1')
    movie.watchWhere = ['Blu-ray', '4K Blu-ray']

    await newMovieController().store(req, res)

    expect(notionMock.create).toHaveBeenCalledWith({
      parent: { data_source_id: 'NOTION_MOVIE_DATA_SOURCE_ID' },
      properties: movie.notionProperties(),
    })
  })

  describe('id is missing', () => {
    it('return a 422', () => {
      const req = getMockReq({ body: {} })

      newMovieController().store(req, res)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith({
        errors: {
          id: 'Invalid input: expected number, received undefined',
        },
      })
    })
  })
})
