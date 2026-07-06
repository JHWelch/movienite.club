import {
  getDocs as _getDocs,
  getDoc as _getDoc,
  Timestamp,
  WithFieldValue,
  Primitive,
} from 'firebase/firestore'
import { FirestoreEvent } from '@server/data/firestore/firestoreTypes'
import { Event } from '@server/models/event'
import { Movie } from '@server/models/movie'
import { RichText } from '@shared/dtos'
import { DateTime } from 'luxon'
import { TZ } from '@server/config/tz'
import { Mock } from 'vitest'

const getDocs = _getDocs as Mock
const getDoc = _getDoc as Mock

export class FirebaseMock {
  static mockGetGlobal<AppDataType> (
    key: string,
    value?: Primitive|Timestamp|WithFieldValue<AppDataType>,
  ) {
    getDoc.mockImplementation(() => ({
      data: () => (value ? { value } : undefined),
      exists: () => Boolean(value),
    }))
  }

  static mockEvents (events: FirebaseEvent[]) {
    getDocs.mockImplementation(() => ({
      docs: events.map((event) => ({
        data: () => ({
          id: event.id,
          theme: event.theme,
          date: Timestamp.fromDate(event.date.toJSDate()),
          isSkipped: event.isSkipped,
          slug: event.slug,
          styledTheme: event.styledTheme ?? [],
          movies: event.movies ?? [],
          submittedBy: event.submittedBy ?? null,
          lastUpdated: event.lastEditedTime
            ? Timestamp.fromDate(new Date(event.lastEditedTime))
            : Timestamp.now(),
        }),
      })),
    }))
  }

  static mockGetEvent (event?: FirebaseEvent) {
    getDoc.mockImplementation(() => ({
      data: () => (event ? {
        id: event.id,
        theme: event.theme,
        date: Timestamp.fromDate(event.date.toJSDate()),
        isSkipped: event.isSkipped,
        movies: event.movies ?? [],
        tags: event.tags ?? [],
        hideFromHome: event.hideFromHome ?? false,
        lastUpdated: event.lastEditedTime
          ? Timestamp.fromDate(new Date(event.lastEditedTime))
          : Timestamp.now(),
      } : undefined),
      exists: () => Boolean(event),
    }))
  }

  static mockGetUserByEmail (user?: FirebaseUser) {
    getDocs.mockImplementation(() => ({
      docs: user ? [{
        id: user.id,
        data: () => ({
          email: user.email,
          reminders: user.reminders,
        }),
      }] : [],
    }))
  }

  static mockGetUsers (users: FirebaseUser[] = []) {
    getDocs.mockImplementation(() => ({
      docs: users.map((user) => ({
        id: user.id,
        data: () => ({
          email: user.email,
          reminders: user.reminders,
        }),
      })),
    }))
  }

  static mockDoc (
    collectionPath: string,
    documentPath?: string | unknown,
  ) {
    return {
      firestore: { firestore: 'firestore' },
      collectionPath,
      documentPath,
    }
  }

  static mockEvent = (
    event: FirebaseEventConstructor,
  ): WithFieldValue<FirestoreEvent> =>
    new Event({
      id: event.id,
      theme: event.theme,
      date: event.date instanceof Date
        ? DateTime.fromJSDate(event.date)
        : DateTime.fromISO(event.date, TZ),
      movies: event.movies ?? [],
      isSkipped: event.isSkipped ?? false,
      slug: event.slug ?? null,
      styledTheme: event.styledTheme ?? [],
      lastUpdated: event.lastEditedTime
        ? typeof event.lastEditedTime === 'string' ? DateTime.fromISO(event.lastEditedTime) : event.lastEditedTime
        : DateTime.now(),
      submittedBy: event.submittedBy ?? null,
      tags: event.tags ?? [],
      hideFromHome: event.hideFromHome ?? false,
    }).toFirebaseDTO()

  static mockCollection = (collectionPath: string): {
    firestore: { firestore: 'firestore' }
    collectionPath: string
  } => ({
    firestore: { firestore: 'firestore' },
    collectionPath,
  })
}

export type FirebaseEvent = {
  id: string
  theme: string
  date: DateTime
  slug?: string | null
  isSkipped: boolean
  movies?: FirebaseMovie[]
  styledTheme?: RichText[]
  lastEditedTime?: string
  submittedBy?: string | null
  tags?: string[]
  hideFromHome?: boolean
}

export type FirebaseMovie = {
  director: string
  length: number
  notionId: string
  posterPath: string
  showingUrl: string | null
  theaterName: string | null
  time: string | null
  title: string
  tmdbId: number | null
  url: string | null
  year: number | null
}

export type FirebaseUser = {
  id: string
  email: string
  reminders: boolean
}

export type FirebaseEventConstructor = {
  id: string
  theme: string
  date: Date|string
  styledTheme?: RichText[]
  isSkipped?: boolean
  tags?: string[]
  hideFromHome?: boolean
  slug?: string | null
  movies?: Movie[]
  lastEditedTime?: DateTime|string
  submittedBy?: string | null
}
