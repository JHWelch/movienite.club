import { Request, Response } from 'express'
import NotionAdapter from '@server/data/notion/notionAdapter'
import {
  type UpdatePageResponse,
} from '@notionhq/client/build/src/api-endpoints'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { Movie } from '@server/models/movie'
import TmdbAdapter from '@server/data/tmdb/tmdbAdapter'
import { Event } from '@server/models/event'
import { minutesAsTimeString, timeStringAsMinutes } from '@server/helpers/timeStrings'
import { Timestamp } from 'firebase-admin/firestore'
import { CacheEventsOutput } from '@shared/dtos'
import { LastUpdated } from '@server/data/globals/types'
import { DateTime } from 'luxon'

export default class CacheEventsController {
  constructor (
    private firestore: FirestoreAdapter,
    private notionAdapter: NotionAdapter,
    private tmdbAdapter: TmdbAdapter,
  ) {}

  show = async (_req: Request, res: Response): Promise<void> => {
    const lastUpdated = await this.lastUpdated()

    if (!lastUpdated) {
      res.status(200).json({
        updatedEvents: 0,
        tmdbMoviesSynced: [],
        previousLastUpdated: null,
        newLastUpdated: null,
      })

      return
    }

    const { previousLastUpdated, newLastUpdated } = lastUpdated

    res.status(200).json({
      ...lastUpdated,
      previousLastUpdated: previousLastUpdated?.toDate().toISOString() ?? null,
      newLastUpdated: newLastUpdated?.toDate().toISOString() ?? null,
    })
  }

  store = async (_req: Request, res: Response): Promise<void> => {
    const lastUpdated = await this.lastUpdated()
    const previousLastUpdated = lastUpdated?.newLastUpdated?.toDate()

    const events = await this.notionAdapter
      .getEvents(previousLastUpdated?.toISOString())

    if (!events.length) {
      const { dto, meta } = this.generateCacheEventsData({
        previousLastUpdated,
      })

      res.status(200).json(dto)

      await this.firestore.setGlobal('lastUpdated', meta)

      return
    }

    const moviesWithoutDetails = this.moviesWithoutDetails(events)
    await this.fillMovieDetails(moviesWithoutDetails)
    const eventsWithoutTimes = this.eventsWithoutTimes(events)
    const moviesWithoutTimes = this.updateEventTimes(eventsWithoutTimes)

    await this.updateNotionMovies([
      ...moviesWithoutDetails,
      ...moviesWithoutTimes,
    ])

    const newUpdated = this.lastUpdatedEventTime(events)

    const { dto, meta } = this.generateCacheEventsData({
      previousLastUpdated,
      updatedEvents: events.length,
      newLastUpdated: newUpdated.toJSDate(),
      tmdbMoviesSynced: moviesWithoutDetails,
    })
    await Promise.all([
      this.firestore.setGlobal('lastUpdated', meta),
      this.firestore.cacheEvents(events),
    ])

    res.status(200).json(dto)
  }

  private lastUpdated = async (): Promise<LastUpdated | null> => {
    return await this.firestore.getGlobal('lastUpdated') as LastUpdated | null
  }

  private moviesWithoutDetails = (events: Event[]): Movie[] => events
    .flatMap(event => event.movies
      .filter(movie => !movie.director && !movie.posterPath))

  private fillMovieDetails = (movies: Movie[]): Promise<void[]> =>
    Promise.all(movies.map<Promise<void>>(async movie => {
      const tmdbMovie = await this.tmdbAdapter.getMovie(movie.title)
      if (!tmdbMovie) return

      movie.merge(tmdbMovie)
    }))

  private eventsWithoutTimes = (events: Event[]): Event[] => events
    .filter(event => !event.isSkipped
      && !event.isPast
      && event.movies.some(movie => !movie.time && movie.director))

  private updateEventTimes = (events: Event[]): Movie[] => events
    .flatMap(event => this.updateMovieTimes(event.movies))

  private updateMovieTimes = (movies: Movie[]): Movie[] => {
    const firstMovieIndex = movies.findIndex(movie => movie.director)
    const firstMovie = movies[firstMovieIndex]

    let minutes = firstMovie?.time
      ? timeStringAsMinutes(firstMovie.time)
      : 18 * 60 // 6pm

    if (isNaN(minutes)) {
      return []
    }

    return movies.slice(firstMovieIndex).map((movie) => {
      movie.time = minutesAsTimeString(minutes)
      minutes += (movie.length || 0) + 15
      minutes = Math.ceil(minutes / 5) * 5

      return movie
    })
  }

  private updateNotionMovies = (
    movies: Movie[],
  ): Promise<UpdatePageResponse[]> => Promise.all(
    movies.map(this.notionAdapter.setMovie),
  )

  private lastUpdatedEventTime = (events: Event[]): DateTime => events
    .reduce((latest, event) => {
      return event.lastUpdated > latest ? event.lastUpdated : latest
    }, events[0].lastUpdated)

  private generateCacheEventsData = (input: {
    updatedEvents?: number
    previousLastUpdated?: Date | null
    newLastUpdated?: Date | null
    tmdbMoviesSynced?: Movie[]
  } ): { dto: CacheEventsOutput, meta: LastUpdated } => {
    const baseData = {
      updatedEvents: input.updatedEvents ?? 0,
      previousLastUpdated: input.previousLastUpdated ?? null,
      newLastUpdated: input.newLastUpdated
        ?? input.previousLastUpdated
        ?? null,
      tmdbMoviesSynced: input.tmdbMoviesSynced?.map(
        movie => movie.toDTO(),
      ) ?? [],
    }

    return {
      dto: {
        ...baseData,
        previousLastUpdated: baseData
          .previousLastUpdated?.toISOString() ?? null,
        newLastUpdated: baseData
          .newLastUpdated?.toISOString() ?? null,
      },
      meta: {
        ...baseData,
        previousLastUpdated: this.dateToTimestamp(baseData.previousLastUpdated),
        newLastUpdated: this.dateToTimestamp(baseData.newLastUpdated),
      },
    }
  }

  private dateToTimestamp = (date: Date | null): Timestamp | null =>
    date ? Timestamp.fromDate(date) : null
}
