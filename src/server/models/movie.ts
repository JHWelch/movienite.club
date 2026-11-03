import {
  CreatePageParameters,
  UpdatePageParameters,
  type PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints'
import type MovieProperties from '@server/types/movieProperties'
import { DocumentData, WithFieldValue } from 'firebase-admin/firestore'
import MovieResponse from '@server/data/tmdb/dtos/movieResponse'
import {
  notionNumber,
  notionRichText,
  notionTitle,
  notionUrl,
} from '@server/data/notion/notionFormatters'
import { FirestoreMovie } from '@server/data/firestore/firestoreTypes'
import { MovieDto } from '@shared/dtos'
import { timeStringAsMinutes } from '@server/helpers/timeStrings'
import { Width } from '@server/types/tmdb'
import { posterUrl } from '@server/data/tmdb/helpers'

export type MovieConstructor = {
  title: string
  director?: string | null
  year?: number | null
  length?: number | null
  time?: string | null
  url?: string | null
  posterPath?: string | null
  tmdbId?: number | null
  notionId?: string | null
  theaterName?: string | null
  showingUrl?: string | null
  watchWhere?: string[]
}

export type MovieDtoOptions = {
  posterWidth: Width
}

export class Movie {
  public title: string = ''
  public director: string | null = null
  public year: number | null = null
  public length: number | null = null
  public time: string | null = null
  public url: string | null = null
  public posterPath: string | null = null
  public tmdbId: number | null = null
  public notionId: string | null = null
  public theaterName: string | null = null
  public showingUrl: string | null = null
  public watchWhere: string[] = []

  constructor (movie: MovieConstructor) {
    Object.keys(movie).forEach((key) => {
      const typedKey = key as keyof MovieConstructor
      if (movie[typedKey] === undefined) {
        delete movie[typedKey]
      }
    })
    Object.assign(this, movie)
  }

  static fromNotion (movie: PageObjectResponse): Movie {
    const properties = movie.properties as unknown as MovieProperties

    return new Movie({
      title: properties.Title?.title[0]?.plain_text,
      director: properties.Director?.rich_text[0]?.plain_text,
      year: properties.Year?.number,
      length: properties['Length (mins)']?.number,
      time: properties.Time?.rich_text[0]?.plain_text,
      url: properties.URL?.url,
      posterPath: properties.Poster?.url,
      tmdbId: properties['TMDB Id']?.number,
      notionId: movie.id,
      theaterName: properties['Theater Name']?.rich_text[0]?.plain_text,
      showingUrl: properties['Showing URL']?.url,
      watchWhere: properties['Watch Where?']?.multi_select?.map((option) => option.name) || [],
    })
  }

  static fromFirebase (movie: DocumentData): Movie {
    return new Movie({
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
  }

  static fromTmdbResponse (tmdbResponse: MovieResponse): Movie {
    return new Movie({
      title: tmdbResponse.title,
      director: tmdbResponse.director,
      year: parseInt(tmdbResponse.releaseDate.split('-')[0]),
      length: tmdbResponse.runtime ?? -1,
      url: tmdbResponse.fullMovieUrl,
      posterPath: tmdbResponse.posterPath,
      tmdbId: tmdbResponse.id,
    })
  }

  isFieldTrip (): boolean {
    return this.theaterName !== null && this.showingUrl !== null
  }

  displayLength (): string {
    if (this.length === null) {
      return ''
    }

    return this.length > 59
      ? `${Math.floor(this.length / 60)}h ${this.length % 60}m`
      : `${this.length}m`
  }

  posterUrl = (width: Width = 'w500') => posterUrl(this.posterPath, width)

  emailPosterUrl = () => this.posterPath ? this.posterUrl('w300') : ''

  toString (): string {
    return `${this.title} (${this.year})`
  }

  toDTO ({ posterWidth }: MovieDtoOptions = {
    posterWidth: 'w500',
  }): MovieDto {
    return {
      title: this.title,
      director: this.director,
      year: this.year,
      length: this.length,
      time: this.time,
      url: this.url,
      posterUrl: this.posterUrl(posterWidth),
      theaterName: this.theaterName,
      showingUrl: this.showingUrl,
      isFieldTrip: this.isFieldTrip(),
      displayLength: this.displayLength(),
    }
  }

  toFirebaseDTO (): WithFieldValue<FirestoreMovie> {
    return {
      title: this.title,
      director: this.director,
      year: this.year,
      length: this.length,
      time: this.time,
      url: this.url,
      tmdbId: this.tmdbId,
      notionId: this.notionId,
      posterPath: this.posterPath,
      theaterName: this.theaterName,
      showingUrl: this.showingUrl,
    }
  }

  toNotion (): UpdatePageParameters {
    if (this.notionId == null) throw new Error('Movie does not have notionId')

    return {
      page_id: this.notionId,
      properties: this.notionProperties(),
    }
  }

  notionProperties (): CreatePageParameters['properties'] & UpdatePageParameters['properties'] {
    return {
      Title: notionTitle(this.title),
      Director: notionRichText(this.director),
      Year: notionNumber(this.year),
      'Length (mins)': notionNumber(this.length),
      URL: notionUrl(this.url),
      Poster: notionUrl(this.posterPath),
      'Theater Name': notionRichText(this.theaterName),
      'Showing URL': notionUrl(this.showingUrl),
      Time: notionRichText(this.time),
      'TMDB Id': notionNumber(this.tmdbId),
      'Watch Where?': {
        multi_select: this.watchWhere.map((option) => ({
          name: option,
        })),
      },
    }
  }

  merge (other: Movie): void {
    this.title ??= other.title
    this.director ??= other.director
    this.year ??= other.year
    this.length ??= other.length
    this.time ??= other.time
    this.url ??= other.url
    this.posterPath ??= other.posterPath
    this.tmdbId ??= other.tmdbId
    this.notionId ??= other.notionId
    this.theaterName ??= other.theaterName
    this.showingUrl ??= other.showingUrl
  }

  get timeAsMinutes (): number {
    if (!this.time) {
      return 0
    }

    return timeStringAsMinutes(this.time)
  }
}
