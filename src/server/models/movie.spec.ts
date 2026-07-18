import { describe, expect, it, test } from 'vitest'
import { Movie } from '@server/models/movie'
import MovieFactory from '@tests/support/factories/movieFactory'
import { TMDB_POSTER_URL } from '@server/data/tmdb/constants'
import { NotionMovie } from '@server/__tests__/support/notionHelpers'

describe('merge', () => {
  test('only null/undefined fields are overwritten by merge', () => {
    const movieA = new Movie({
      title: 'Title',
      year: 2004,
      length: 120,
    })
    const movieB = new Movie({
      title: 'Title',
      director: 'Director',
      year: 2001,
      time: '8:00 PM',
      url: 'https://www.themoviedb.org/movie/1234',
      posterPath: 'https://image.tmdb.org/t/p/original/poster.jpg',
      tmdbId: 1234,
    })

    movieA.merge(movieB)

    expect(movieA).toMatchObject({
      title: 'Title',
      director: 'Director',
      year: 2004,
      length: 120,
      time: '8:00 PM',
      url: 'https://www.themoviedb.org/movie/1234',
      posterPath: 'https://image.tmdb.org/t/p/original/poster.jpg',
      tmdbId: 1234,
    })
  })
})

describe('toNotion', () => {
  it('returns a notion update object', () => {
    const movie = new MovieFactory().make({ watchWhere: ['Netflix'] })

    expect(movie.toNotion()).toEqual({
      page_id: movie.notionId,
      properties: {
        Title: { title: [{ text: { content: movie.title } }] },
        Director: { rich_text: [{ text: { content: movie.director } }] },
        Year: { number: movie.year },
        'Length (mins)': { number: movie.length },
        URL: { url: movie.url },
        Poster: { url: movie.posterPath },
        'Theater Name': { rich_text: [
          { text: { content: movie.theaterName } },
        ] },
        'Showing URL': { url: movie.showingUrl },
        Time: { rich_text: [{ text: { content: movie.time } }] },
        'TMDB Id': { number: movie.tmdbId },
        'Watch Where?': { multi_select: [{ name: 'Netflix' }] },
      },
    })
  })

  describe('movie does not have notionId', () => {
    it('should throw an error', async () => {
      const movie = new MovieFactory().state({ notionId: null }).make()

      expect(() => movie.toNotion())
        .toThrow('Movie does not have notionId')
    })
  })
})

describe('fromNotion', () => {
  it('creates a Movie from Notion properties', () => {
    const movie = NotionMovie.demo()

    expect(Movie.fromNotion(movie.toPageObjectResponse())).toMatchObject({
      title: movie.title,
      director: movie.director,
      year: movie.year,
      length: movie.length,
      time: movie.time,
      url: movie.url,
      tmdbId: movie.tmdbId,
      notionId: movie.id,
      posterPath: movie.posterPath,
      theaterName: movie.theaterName,
      showingUrl: movie.showingUrl,
    })
  })
})

describe('toDTO', () => {
  it('should return a DTO', () => {
    const movie = new MovieFactory().make()

    expect(movie.toDTO()).toEqual({
      title: movie.title,
      director: movie.director,
      year: movie.year,
      length: movie.length,
      time: movie.time,
      url: movie.url,
      posterUrl: movie.posterUrl(),
      theaterName: movie.theaterName,
      showingUrl: movie.showingUrl,
      isFieldTrip: true,
      displayLength: movie.displayLength(),
    })
  })

  describe('No showingUrl or theaterName', () => {
    it('marks isFieldTrip as false', () => {
      const movie = new MovieFactory().state({
        showingUrl: null,
        theaterName: null,
      }).make()

      expect(movie.toDTO()).toEqual({
        title: movie.title,
        director: movie.director,
        year: movie.year,
        length: movie.length,
        time: movie.time,
        url: movie.url,
        posterUrl: movie.posterUrl(),
        theaterName: movie.theaterName,
        showingUrl: movie.showingUrl,
        isFieldTrip: false,
        displayLength: movie.displayLength(),
      })
    })
  })
})

describe('toFirebaseDTO', () => {
  it('should return a DTO', () => {
    const movie = new MovieFactory().make()

    expect(movie.toFirebaseDTO()).toEqual({
      title: movie.title,
      director: movie.director,
      year: movie.year,
      length: movie.length,
      time: movie.time,
      url: movie.url,
      posterPath: movie.posterPath,
      tmdbId: movie.tmdbId,
      notionId: movie.notionId,
      theaterName: movie.theaterName,
      showingUrl: movie.showingUrl,
    })
  })
})

describe('posterUrl', () => {
  it('appends the posterPath to the base url with 500 width', () => {
    const movie = new MovieFactory().make()

    expect(movie.posterUrl()).toEqual(
      `${TMDB_POSTER_URL}w500${movie.posterPath}`,
    )
  })

  it('can accept a different width', () => {
    const movie = new MovieFactory().make()

    expect(movie.posterUrl('w92')).toEqual(
      `${TMDB_POSTER_URL}w92${movie.posterPath}`,
    )
  })

  describe('posterPath is null', () => {
    it('returns an empty string', () => {
      const movie = new MovieFactory().state({ posterPath: null }).make()

      expect(movie.posterUrl()).toEqual('')
    })
  })

  describe('posterPath starts with /events', () => {
    it('returns the posterPath', () => {
      const movie = new MovieFactory().state({
        posterPath: '/events/poster.jpg',
      }).make()

      expect(movie.posterUrl()).toEqual('/events/poster.jpg')
    })
  })
})

describe('emailPosterUrl', () => {
  it('appends the posterPath to the base url with 300 width', () => {
    const movie = new MovieFactory().make()

    expect(movie.emailPosterUrl()).toEqual(
      `${TMDB_POSTER_URL}w300${movie.posterPath}`,
    )
  })

  describe('posterPath is null', () => {
    it('returns an empty string', () => {
      const movie = new MovieFactory().state({ posterPath: null }).make()

      expect(movie.emailPosterUrl()).toEqual('')
    })
  })
})

describe('timeAsMinutes', () => {
  it('returns the time as minutes', () => {
    expect(new MovieFactory().state({ time: '12:00 AM' }).make().timeAsMinutes)
      .toBe(0)
    expect(new MovieFactory().state({ time: '6:40 AM' }).make().timeAsMinutes)
      .toBe(400)
    expect(new MovieFactory().state({ time: '12:00 PM' }).make().timeAsMinutes)
      .toBe(720)
    expect(new MovieFactory().state({ time: '6:30 PM' }).make().timeAsMinutes)
      .toBe(1110)
  })
})
