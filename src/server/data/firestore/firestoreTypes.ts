import { RichText } from '@shared/dtos'
import { Timestamp } from 'firebase-admin/firestore'

export type FirestoreEvent = {
  id: string
  theme: string
  date: Timestamp
  isSkipped: boolean
  slug: string | null
  styledTheme: RichText[]
  movies: FirestoreMovie[]
  lastUpdated: Timestamp
  submittedBy: string | null
  tags: string[]
  hideFromHome: boolean
}

export type FirestoreMovie = {
  title: string
  director: string | null
  year: number | null
  length: number | null
  time: string | null
  url: string | null
  posterPath: string | null
  tmdbId: number | null
  notionId: string | null
  theaterName: string | null
  showingUrl: string | null
}
