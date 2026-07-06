import {
  type PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { Movie, MovieDtoOptions } from '@server/models/movie'
import type EventProperties from '@server/types/eventProperties'
import { DocumentData, Timestamp, WithFieldValue } from 'firebase/firestore'
import { FirestoreEvent } from '@server/data/firestore/firestoreTypes'
import { RichText, EventDto } from '@shared/dtos'
import { timeStringAsMinutes } from '@server/helpers/timeStrings'
import { DateTime } from 'luxon'
import { CHICAGO, TZ } from '@server/config/tz'

export type EventConstructor = {
  id: string
  theme: string
  date: DateTime
  styledTheme?: RichText[]
  isSkipped?: boolean
  slug?: string | null
  movies?: Movie[]
  lastUpdated?: DateTime
  submittedBy?: string | null
  tags?: string[]
  hideFromHome?: boolean
}

export type EventDtoOptions = {
  movies: MovieDtoOptions
}

export class Event {
  public id: string = ''
  public theme: string = ''
  public date: DateTime = DateTime.now().setZone(CHICAGO)
  public styledTheme: RichText[] = []
  public isSkipped: boolean = false
  public slug: string | null = null
  public movies: Movie[] = []
  public lastUpdated: DateTime = DateTime.now()
  public submittedBy: string | null = null
  public tags: string[] = []
  public hideFromHome: boolean = false

  constructor (event: EventConstructor) {
    Object.keys(event).forEach((key) => {
      const typedKey = key as keyof EventConstructor
      if (event[typedKey] === undefined) {
        delete event[typedKey]
      }
    })
    Object.assign(this, event)
  }

  static fromNotion (record: PageObjectResponse): Event {
    const properties = record.properties as unknown as EventProperties

    return new Event({
      id: record.id,
      theme: properties.Theme.title[0].plain_text,
      date: DateTime.fromISO(properties.Date.date.start, TZ),
      isSkipped: properties.Skipped.checkbox,
      slug: properties.Slug?.rich_text[0]?.plain_text,
      styledTheme: properties['Styled Theme']?.rich_text,
      lastUpdated: this.parseLastUpdated(properties),
      submittedBy: properties['Submitted By']?.rich_text[0]?.plain_text,
      tags: properties.Tags?.multi_select.map((tag) => tag.name) ?? [],
      hideFromHome: properties['Hide from Home']?.checkbox ?? false,
    })
  }

  static fromFirebase (record: DocumentData): Event {
    return new Event({
      id: record.id,
      theme: record.theme,
      date: DateTime.fromJSDate(record.date.toDate(), TZ),
      isSkipped: record.isSkipped,
      slug: record.slug,
      styledTheme: record.styledTheme,
      lastUpdated: DateTime.fromJSDate(record.lastUpdated.toDate()),
      submittedBy: record.submittedBy,
      tags: record.tags ?? [],
      hideFromHome: record.hideFromHome ?? false,
      movies: record.movies
        .map((movie: DocumentData) => Movie.fromFirebase(movie)),
    })
  }

  displayDate (): string {
    return this.date.toFormat('EEEE, LLLL d')
  }

  setMovies (movies: Movie[]): Event {
    this.movies = movies

    return this
  }

  toString (): string {
    return this.theme
  }

  toDTO ({ movies }: EventDtoOptions = {
    movies: { posterWidth: 'w500' },
  }): EventDto {
    return {
      id: this.id,
      eventId: this.dateString,
      theme: this.theme,
      date: this.displayDate(),
      movies: this.movies.map((movie) => movie.toDTO(movies)),
      slug: this.slug,
      isSkipped: this.isSkipped,
      styledTheme: this.styledTheme,
      submittedBy: this.submittedBy,
    }
  }

  toFirebaseDTO (): WithFieldValue<FirestoreEvent> {
    return {
      id: this.id,
      theme: this.theme,
      date: Timestamp.fromDate(this.date.toJSDate()),
      movies: this.movies.map((movie) => movie.toFirebaseDTO()),
      slug: this.slug,
      isSkipped: this.isSkipped,
      styledTheme: this.styledTheme,
      lastUpdated: Timestamp.fromDate(this.lastUpdated.toJSDate()),
      submittedBy: this.submittedBy,
      tags: this.tags,
      hideFromHome: this.hideFromHome ?? false,
    }
  }

  get dateString (): string {
    return this.date.toISODate() ?? ''
  }

  get monthDayDisplayDate (): string {
    return this.date.toFormat('M/d')
  }

  get isPast (): boolean {
    return this.date < DateTime.now()
  }

  get totalLength (): number {
    const beforeTime = 30
    const firstTimeIndex = this.movies.findIndex((movie) => movie.time)
    const lastTimeIndex = this.movies.length - 1 - this.movies
      .slice()
      .reverse()
      .findIndex((movie) => movie.time)

    if (firstTimeIndex === -1 || lastTimeIndex === -1) {
      return beforeTime
        + this.sumLengths(this.movies)
        + this.breaks(this.movies)
    }

    const moviesPostTime = this.movies.slice(lastTimeIndex)

    return beforeTime
      - this.movies[firstTimeIndex].timeAsMinutes
      + this.movies[lastTimeIndex].timeAsMinutes
      + this.sumLengths(moviesPostTime)
      + this.breaks(moviesPostTime)
  }

  get startTime (): DateTime {
    const firstTime = this.movies.find((movie) => movie.time)

    const minutes = timeStringAsMinutes(firstTime?.time ?? '6:00 PM')

    return this.date.plus({ minutes: minutes - 30 })
  }

  private breaks (movies: Movie[]): number {
    return (movies.length - 1) * 15
  }

  private sumLengths (movies: Movie[]): number {
    return movies.reduce((total, movie) => (movie.length ?? 0) + total, 0)
  }

  private static parseLastUpdated (properties: EventProperties): DateTime {
    const lastUpdatedMovieProp = properties['Last edited movie time']

    const lastUpdatedEvent = DateTime
      .fromISO(properties['Last edited time'].last_edited_time)
    const lastUpdatedMovie = lastUpdatedMovieProp.formula.type === 'date'
      ? DateTime.fromISO(lastUpdatedMovieProp.formula.date.start)
      : null

    if (! lastUpdatedMovie) {
      return lastUpdatedEvent
    }

    return lastUpdatedEvent > lastUpdatedMovie
      ? lastUpdatedEvent
      : lastUpdatedMovie
  }
}
