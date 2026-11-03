import {
  CollectionReference,
  DocumentData,
  Firestore as FirestoreType,
  Primitive,
  Query,
  Timestamp,
  WithFieldValue,
} from 'firebase-admin/firestore'
import { Event } from '@server/models/event'
import setupFirestore from '@server/config/firestore'
import Config from '@server/config/config'
import User from '@server/models/user'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'
import { CHICAGO } from '@server/config/tz'

export default class FirestoreAdapter {
  static readonly globalsCollectionName = 'globals'
  static readonly mailCollectionName = 'mail'
  static readonly rsvpsCollectionName = 'rsvps'
  static readonly templatesCollectionName = 'mail-templates'
  static readonly usersCollectionName = 'users'
  static readonly eventsCollectionName = 'events'

  private config: Config
  private firestore: FirestoreType

  constructor (config: Config) {
    this.config = config
    this.firestore = setupFirestore(config)
  }

  getGlobal = async <AppDataType>(
    key: string,
  ): Promise<Primitive|Timestamp|WithFieldValue<AppDataType>|null> => {
    const document = await this.firestore
      .collection(FirestoreAdapter.globalsCollectionName).doc(key).get()

    if (!document.exists) {
      return null
    }

    return document.data()?.value
  }

  setGlobal = async <AppDataType>(
    key: string,
    value: Primitive|Timestamp|WithFieldValue<AppDataType>,
  ): Promise<void> => {
    await this.firestore.collection(FirestoreAdapter.globalsCollectionName)
      .doc(key).set({ value })
  }

  cacheEvents = async (events: Event[]): Promise<void> => {
    await this.firestore.runTransaction(async (transaction) => {
      events.forEach((event: Event) => {
        const ref = this.eventCollection.doc(event.dateString)
        transaction.set(ref, event.toFirebaseDTO())
      })
    })
  }

  getPastEvents = async (): Promise<Event[]> => {
    return this.getEvents(this.eventCollection
      .where('date', '<', this.today())
      .where('isSkipped', '==', false)
      .orderBy('date', 'desc'))
  }

  getUpcomingEvents = async (args: {
    limit?: number
    tag?: string
  } = {}): Promise<Event[]> => {
    let firestoreQuery = this.eventCollection
      .where('date', '>=', this.today())
      .orderBy('date')

    if (args.limit) {
      firestoreQuery = firestoreQuery.limit(args.limit)
    }

    firestoreQuery = args.tag
      ? firestoreQuery.where('tags', 'array-contains', args.tag)
      : firestoreQuery.where('hideFromHome', '!=', true)

    return this.getEvents(firestoreQuery)
  }

  getEvents = async (firestoreQuery: Query): Promise<Event[]> => {
    const querySnapshot = await firestoreQuery.get()

    return querySnapshot.docs
      .map((doc) => Event.fromFirebase(doc.data()))
  }

  getEvent = async (dateString: string): Promise<Event|null> => {
    const document = await this.eventCollection.doc(dateString).get()

    if (!document.exists) {
      const documents = await this.eventCollection
        .where('slug', '==', dateString).get()

      if (documents.docs.length === 0) {
        return null
      }

      return Event.fromFirebase(documents.docs[0].data())
    }

    return Event.fromFirebase(document.data()!)
  }

  createRsvp = async (
    event: string,
    name: string,
    email: string | undefined,
  ): Promise<void> => {
    await this.rsvpCollection.add({
      event,
      name,
      createdAt: Timestamp.now(),
      email: email || null,
    })
  }

  createUser = async (email: string, reminders: boolean): Promise<void> => {
    await this.usersCollection.add({
      email,
      reminders,
    })
  }

  getUserByEmail = async (email: string): Promise<User|null> => {
    const users = await this.usersCollection
      .where('email', '==', email).limit(1).get()

    if (users.docs.length === 0) {
      return null
    }

    return User.fromFirebase(users.docs[0])
  }

  getUsersWithReminders = async (): Promise<User[]> => {
    const users = await this.usersCollection.where('reminders', '==', true).get()

    return users.docs.map(User.fromFirebase)
  }

  updateUser = async (user: User): Promise<void> => {
    await this.usersCollection.doc(user.id).set(user.toFirebaseDTO())
  }

  deleteUser = async (id: string): Promise<void> => {
    await this.usersCollection.doc(id).delete()
  }

  sendEmail = async (to: string, message: EmailMessage): Promise<void> => {
    await this.mailCollection.add({
      to,
      message,
    })
  }

  sendEmailTemplate = async (
    to: string,
    templateName: string,
    templateData: Record<string, unknown>,
  ): Promise<void> => {
    await this.mailCollection.add({
      to,
      template: {
        name: templateName,
        data: templateData,
      },
    })
  }

  sendEmailTemplates = async (
    templateName: string,
    emails: {
      to: string
      data: Record<string, unknown>
    }[],
  ): Promise<void> => {
    await this.firestore.runTransaction(async (transaction) => {
      emails.forEach((email) => {
        const ref = this.mailCollection.doc(randomUUID())

        transaction.set(ref, {
          to: email.to,
          template: {
            name: templateName,
            data: email.data,
          },
        })
      })
    })
  }

  updateTemplates = async (templates: {
    name: string
    data: Record<string, unknown>
  }[]): Promise<void> => {
    await this.firestore.runTransaction(async (transaction) => {
      templates.forEach((template) => {
        transaction.set(this.firestore
          .collection(FirestoreAdapter.templatesCollectionName)
          .doc(template.name), template.data)
      })
    })
  }

  today = (): Timestamp => {
    return Timestamp.fromDate(
      DateTime.now().setZone(CHICAGO).startOf('day').toJSDate(),
    )
  }

  get adminEmail (): string {
    return this.config.adminEmail
  }

  private get mailCollection (): Collection {
    return this.firestore.collection(FirestoreAdapter.mailCollectionName)
  }

  private get rsvpCollection (): Collection {
    return this.firestore.collection(FirestoreAdapter.rsvpsCollectionName)
  }

  private get usersCollection (): Collection {
    return this.firestore.collection(FirestoreAdapter.usersCollectionName)
  }

  private get eventCollection (): Collection {
    return this.firestore.collection(FirestoreAdapter.eventsCollectionName)
  }
}

export type EmailMessage = {
  subject: string
  text: string
  html: string
}

type Collection = CollectionReference<DocumentData,DocumentData>
