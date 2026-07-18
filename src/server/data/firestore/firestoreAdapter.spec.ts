import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { initializeApp } from 'firebase/app'
import { applicationDefault } from 'firebase-admin/app'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import {
  Timestamp,
  addDoc,
  deleteDoc,
  getFirestore,
  query,
  setDoc,
} from 'firebase/firestore'
import { transaction } from '@mocks/firebase/firestore'
import { FirebaseMock } from '@tests/support/firebaseMock'
import { Event } from '@server/models/event'
import { mockConfig } from '@tests/support/mockConfig'
import MovieFactory from '@tests/support/factories/movieFactory'
import User from '@server/models/user'
import { RichText } from '@shared/dtos'
import { DateTime } from 'luxon'
import { TZ } from '@server/config/tz'
import MockDate from 'mockdate'

vi.mock('firebase-admin/app')
vi.mock('firebase/app')
vi.mock('firebase/firestore')

let firestore: FirestoreAdapter
let now: DateTime

beforeAll(() => {
  MockDate.set('2021-01-01T00:00:00.000Z')
  now = DateTime.now()
})

beforeEach(() => {
  firestore = new FirestoreAdapter(mockConfig())
  vi.clearAllMocks()
})

describe('constructor', () => {
  it('initializes the firestore', () => {
    firestore = new FirestoreAdapter(mockConfig())

    expect (applicationDefault).toHaveBeenCalledTimes(1)
    expect (initializeApp).toHaveBeenCalledTimes(1)
    expect (getFirestore).toHaveBeenCalledTimes(1)
  })
})

describe('getUpcomingEvents', () => {
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
    FirebaseMock.mockEvents([{
      date: DateTime.fromISO('2021-01-01', TZ),
      id: 'id1',
      isSkipped: false,
      theme: 'theme1',
      slug: null,
      styledTheme: [],
      lastEditedTime: '2022-08-12T15:45:00.000Z',
    }, {
      date: DateTime.fromISO('2021-01-08', TZ),
      id: 'id2',
      isSkipped: true,
      theme: 'theme2',
      slug: null,
      styledTheme: [],
      lastEditedTime: '2023-08-12T15:45:00.000Z',
    }, {
      date: DateTime.fromISO('2021-01-15', TZ),
      id: 'id3',
      isSkipped: false,
      theme: 'theme3',
      slug: 'slug',
      styledTheme: styled,
      lastEditedTime: '2021-08-12T15:45:00.000Z',
    }])
  })

  it('should return all future events', async () => {
    const events = await firestore.getUpcomingEvents()

    expect(events).toEqual([
      new Event({
        id: 'id1',
        theme: 'theme1',
        date: DateTime.fromISO('2021-01-01', TZ),
        lastUpdated: DateTime.fromISO('2022-08-12T15:45:00.000Z'),
      }),
      new Event({
        id: 'id2',
        theme: 'theme2',
        date: DateTime.fromISO('2021-01-08', TZ),
        isSkipped: true,
        lastUpdated: DateTime.fromISO('2023-08-12T15:45:00.000Z'),
      }),
      new Event({
        id: 'id3',
        theme: 'theme3',
        date: DateTime.fromISO('2021-01-15', TZ),
        slug: 'slug',
        styledTheme: styled,
        lastUpdated: DateTime.fromISO('2021-08-12T15:45:00.000Z'),
      }),
    ])
  })

  it('queries with the correct constraints, not including those hidden', async () => {
    await firestore.getUpcomingEvents()

    expect(query).toHaveBeenCalledWith(
      { firestore: { firestore: 'firestore' }, collectionPath: 'events' },
      { fieldPath: 'date', opStr: '>=', value: firestore.today() },
      { fieldPath: 'date' },
      { fieldPath: 'hideFromHome', opStr: '!=', value: true },
    )
  })

  it('can limit return to a number of events', async () => {
    await firestore.getUpcomingEvents({ limit: 3 })

    expect(query).toHaveBeenCalledWith(
      { firestore: { firestore: 'firestore' }, collectionPath: 'events' },
      { fieldPath: 'date', opStr: '>=', value: firestore.today() },
      { fieldPath: 'date' },
      { limit: 3 },
      { fieldPath: 'hideFromHome', opStr: '!=', value: true },
    )
  })

  it('can get events for a specific tag', async () => {
    await firestore.getUpcomingEvents({ tag: 'tag1' })

    expect(query).toHaveBeenCalledWith(
      { firestore: { firestore: 'firestore' }, collectionPath: 'events' },
      { fieldPath: 'date', opStr: '>=', value: firestore.today() },
      { fieldPath: 'date' },
      { fieldPath: 'tags', opStr: 'array-contains', value: 'tag1' },
    )
  })
})

describe('getPastEvents', () => {
  beforeEach(() => {
    FirebaseMock.mockEvents([{
      date: DateTime.fromISO('2021-01-01', TZ),
      id: 'id1',
      isSkipped: false,
      theme: 'theme1',
      slug: null,
      lastEditedTime: now.toISO() ?? undefined,
    }, {
      date: DateTime.fromISO('2021-01-08', TZ),
      id: 'id2',
      isSkipped: false,
      theme: 'theme2',
      slug: null,
      lastEditedTime: now.toISO() ?? undefined,
    }, {
      date: DateTime.fromISO('2021-01-15', TZ),
      id: 'id3',
      isSkipped: false,
      theme: 'theme3',
      slug: null,
      lastEditedTime: now.toISO() ?? undefined,
    }])
  })

  it ('should return only past events', async () => {
    const events = await firestore.getPastEvents()

    expect(events).toEqual([
      new Event({
        id: 'id1',
        theme: 'theme1',
        date: DateTime.fromISO('2021-01-01', TZ),
        lastUpdated: now,
      }),
      new Event({
        id: 'id2',
        theme: 'theme2',
        date: DateTime.fromISO('2021-01-08', TZ),
        lastUpdated: now,
      }),
      new Event({
        id: 'id3',
        theme: 'theme3',
        date: DateTime.fromISO('2021-01-15', TZ),
        lastUpdated: now,
      }),
    ])
  })

  it('should query with the correct constraints', async () => {
    await firestore.getPastEvents()

    expect(query).toHaveBeenCalledWith(
      { firestore: { firestore: 'firestore' }, collectionPath: 'events' },
      { and: [
        { fieldPath: 'date', opStr: '<', value: firestore.today() },
        { fieldPath: 'isSkipped', opStr: '==', value: false },
      ] },
      { fieldPath: 'date', directionStr: 'desc' },
    )
  })
})

describe('getEvent', () => {
  describe('when the event exists by id', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent({
        date: DateTime.fromISO('2021-01-01', TZ),
        id: 'id1',
        isSkipped: false,
        theme: 'theme1',
        slug: null,
        lastEditedTime: now.toISO() ?? undefined,
        tags: ['tag1', 'tag2'],
        hideFromHome: true,
      })
    })

    it('returns the event', async () => {
      expect(await firestore.getEvent('2021-01-01')).toEqual(
        new Event({
          id: 'id1',
          theme: 'theme1',
          date: DateTime.fromISO('2021-01-01', TZ),
          lastUpdated: now,
          tags: ['tag1', 'tag2'],
          hideFromHome: true,
        }),
      )
    })
  })

  describe('when the event exists by slug', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent()
      FirebaseMock.mockEvents([{
        date: DateTime.fromISO('2021-01-01', TZ),
        id: 'id1',
        isSkipped: false,
        theme: 'theme1',
        slug: null,
        lastEditedTime: now.toISO() ?? undefined,
      }])
    })

    it('returns the event', async () => {
      expect(await firestore.getEvent('slug')).toEqual(
        new Event({
          id: 'id1',
          theme: 'theme1',
          date: DateTime.fromISO('2021-01-01', TZ),
          lastUpdated: now,
        }),
      )
    })
  })

  describe('when the event does not exist', () => {
    beforeEach(() => {
      FirebaseMock.mockGetEvent()
      FirebaseMock.mockEvents([])
    })

    it('returns null', async () => {
      expect(await firestore.getEvent('2021-01-01')).toBeNull()
    })
  })
})

describe('cacheEvents', () => {
  describe('when the cache is empty', () => {
    it('updates all events in firestore', async () => {
      await firestore.cacheEvents([
        new Event({
          id: 'id1',
          theme: 'theme1',
          date: DateTime.fromISO('2021-01-01', TZ),
          lastUpdated: now.minus({ days: 1 }),
        }),
        new Event({
          id: 'id2',
          theme: 'theme2',
          date: DateTime.fromISO('2021-01-08', TZ),
          lastUpdated: now.minus({ days: 10 }),
          hideFromHome: true,
        }),
        new Event({
          id: 'id3',
          theme: 'theme3',
          date: DateTime.fromISO('2021-01-15', TZ),
          lastUpdated: now.minus({ days: 20 }),
          tags: ['tag1', 'tag2'],
        }),
      ])

      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-01'),
          FirebaseMock.mockEvent({
            id: 'id1',
            theme: 'theme1',
            date: '2021-01-01',
            lastEditedTime: now.minus({ days: 1 }),
          }),
        )
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-08'),
          FirebaseMock.mockEvent({
            id: 'id2',
            theme: 'theme2',
            date: '2021-01-08',
            lastEditedTime: now.minus({ days: 10 }),
            hideFromHome: true,
          }),
        )
      expect(transaction.set)
        .toHaveBeenCalledWith(
          FirebaseMock.mockDoc('events', '2021-01-15'),
          FirebaseMock.mockEvent({
            id: 'id3',
            theme: 'theme3',
            date: '2021-01-15',
            lastEditedTime: now.minus({ days: 20 }),
            tags: ['tag1', 'tag2'],
          }),
        )
    })
  })

  it('can update a event with movies', async () => {
    const movie = new MovieFactory().make()
    const eventWithMovie = new Event({
      id: 'id1',
      theme: 'theme1',
      date: DateTime.fromISO('2021-01-01', TZ),
      tags: ['tag1', 'tag2'],
      hideFromHome: true,
      movies: [movie],
    })

    await firestore.cacheEvents([
      eventWithMovie,
    ])

    expect(transaction.set)
      .toHaveBeenCalledWith(
        FirebaseMock.mockDoc('events', '2021-01-01'),
        FirebaseMock.mockEvent({
          id: 'id1',
          theme: 'theme1',
          date: '2021-01-01',
          movies: [movie],
          tags: ['tag1', 'tag2'],
          hideFromHome: true,
        }),
      )
  })
})

describe('createUser', () => {
  it('creates a user in firestore', async () => {
    await firestore.createUser('test@example.com', true)

    expect(addDoc).toHaveBeenCalledWith(
      FirebaseMock.mockCollection('users'),
      {
        email: 'test@example.com',
        reminders: true,
      },
    )
  })
})

describe('getUserByEmail', () => {
  describe('when the user exists', () => {
    beforeEach(() => {
      FirebaseMock.mockGetUserByEmail({
        id: 'id1',
        email: 'test@example.com',
        reminders: true,
      })
    })

    it('returns the user', async () => {
      const user = await firestore.getUserByEmail('test@example.com')

      expect(user).toMatchObject({
        id: 'id1',
        email: 'test@example.com',
        reminders: true,
      })
    })
  })

  describe('when the user does not exist', () => {
    beforeEach(() => {
      FirebaseMock.mockGetUserByEmail()
    })

    it('returns null', async () => {
      expect(await firestore.getUserByEmail('test@example.com')).toBeNull()
    })
  })
})

describe('getUsersWithReminders', () => {
  describe('there are users with reminders', () => {
    beforeEach(() => {
      FirebaseMock.mockGetUsers([
        {
          id: 'id1',
          email: 'user_with_reminder1@example.com',
          reminders: true,
        }, {
          id: 'id2',
          email: 'user_with_reminder2@example.com',
          reminders: true,
        },
      ])
    })

    it('should query for users with reminders', async () => {
      await firestore.getUsersWithReminders()

      expect(query).toHaveBeenCalledWith(
        { firestore: { firestore: 'firestore' }, collectionPath: 'users' },
        { fieldPath: 'reminders', opStr: '==', value: true },
      )
    })

    it('returns those users', async () => {
      const users = await firestore.getUsersWithReminders()

      expect(users).toMatchObject([
        {
          id: 'id1',
          email: 'user_with_reminder1@example.com',
          reminders: true,
        }, {
          id: 'id2',
          email: 'user_with_reminder2@example.com',
          reminders: true,
        },
      ])
    })
  })

  describe('there are no users with reminders', () => {
    beforeEach(() => {
      FirebaseMock.mockGetUsers([])
    })

    it('returns an empty array', async () => {
      const users = await firestore.getUsersWithReminders()

      expect(users).toEqual([])
    })
  })
})

describe('updateUser', () => {
  it('updates a user in firestore', async () => {
    await firestore.updateUser(new User('id', 'test@example.com', true))

    expect(setDoc).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('users', 'id'),
      {
        email: 'test@example.com',
        reminders: true,
      },
    )
  })
})

describe('deleteUser', () => {
  it('deletes a user in firestore', async () => {
    await firestore.deleteUser('id')

    expect(deleteDoc).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('users', 'id'),
    )
  })
})

describe('createRsvp', () => {
  it('creates an rsvp in firestore', async () => {
    await firestore.createRsvp(
      '2023-01-01',
      'test name',
      'test@example.com',
    )

    expect(addDoc).toHaveBeenCalledWith(
      FirebaseMock.mockCollection('rsvps'),
      {
        event: '2023-01-01',
        name: 'test name',
        email: 'test@example.com',
        createdAt: expect.any(Timestamp.constructor),
      },
    )
  })
})

describe ('sendEmail', () => {
  it('sends an email', async () => {
    await firestore.sendEmail('jsmith@example.com', {
      subject: 'test subject',
      text: 'test text',
      html: 'test <p>html</p>',
    })

    expect(addDoc).toHaveBeenCalledWith(
      FirebaseMock.mockCollection('mail'),
      {
        to: 'jsmith@example.com',
        message: {
          subject: 'test subject',
          text: 'test text',
          html: 'test <p>html</p>',
        },
      },
    )
  })
})

describe('sendEmailTemplate', () => {
  describe('rsvpConfirmation template', () => {
    it('sends an email', async () => {
      await firestore.sendEmailTemplate(
        'jsmith@example.com',
        'rsvpConfirmation',
        {
          date: 'Thursday, January 1st',
          theme: 'test theme',
          movies: [
            {
              title: 'test title',
              year: '2021',
              time: '6:00pm',
              posterPath: 'https://example.com/poster.jpg',
            },
          ],
        })

      expect(addDoc).toHaveBeenCalledWith(FirebaseMock.mockCollection('mail'), {
        to: 'jsmith@example.com',
        template: {
          name: 'rsvpConfirmation',
          data: {
            date: 'Thursday, January 1st',
            theme: 'test theme',
            movies: [{
              title: 'test title',
              year: '2021',
              time: '6:00pm',
              posterPath: 'https://example.com/poster.jpg',
            }],
          },
        },
      })
    })
  })
})

describe('sendEmailTemplates', () => {
  it('sends an email', async () => {
    await firestore.sendEmailTemplates(
      'reminder',
      [
        {
          to: 'user1@example.com',
          data: {
            date: 'Thursday, January 1st',
            theme: 'test theme',
            movies: [
              {
                title: 'test title',
                year: '2021',
                time: '6:00pm',
                posterPath: 'https://example.com/poster.jpg',
              },
            ],
          },
        }, {
          to: 'user2@example.com',
          data: {
            date: 'Thursday, January 1st',
            theme: 'test theme',
            movies: [
              {
                title: 'test title',
                year: '2021',
                time: '6:00pm',
                posterPath: 'https://example.com/poster.jpg',
              },
            ],
          },
        },
      ],
    )

    expect(transaction.set).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('mail', expect.anything()),
      {
        to: 'user1@example.com',
        template: {
          name: 'reminder',
          data: {
            date: 'Thursday, January 1st',
            theme: 'test theme',
            movies: [
              {
                title: 'test title',
                year: '2021',
                time: '6:00pm',
                posterPath: 'https://example.com/poster.jpg',
              },
            ],
          },
        },
      },
    )

    expect(transaction.set).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('mail', expect.anything()),
      {
        to: 'user2@example.com',
        template: {
          name: 'reminder',
          data: {
            date: 'Thursday, January 1st',
            theme: 'test theme',
            movies: [
              {
                title: 'test title',
                year: '2021',
                time: '6:00pm',
                posterPath: 'https://example.com/poster.jpg',
              },
            ],
          },
        },
      },
    )
  })
})

describe('updateTemplates', () => {
  it('should update the templates with new data', async () => {
    await firestore.updateTemplates([{
      name: 'templateId',
      data: {
        subject: 'new subject',
        html: 'new html',
      },
    }, {
      name: 'templateId2',
      data: {
        subject: 'new subject 2',
        html: 'new html 2',
      },
    }])

    expect(transaction.set).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('mail-templates', 'templateId'),
      {
        subject: 'new subject',
        html: 'new html',
      },
    )
    expect(transaction.set).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('mail-templates', 'templateId2'),
      {
        subject: 'new subject 2',
        html: 'new html 2',
      },
    )
  })
})

describe ('setGlobal', () => {
  it.each([
    ['string'],
    [1],
    [true],
    [Timestamp.fromDate(new Date())],
  ])('can store a primitive value in globals', async (data) => {
    await firestore.setGlobal('testKey', data)

    expect(setDoc).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('globals', 'testKey'),
      { value: data },
    )
  })

  it('can store an object in globals', async () => {
    const expected = { key: 'value', nested: { key: 'value' } }
    await firestore.setGlobal('testKey', expected)

    expect(setDoc).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('globals', 'testKey'),
      { value: expected },
    )
  })
})

describe('getGlobal', () => {
  it.each([
    ['string'],
    [1],
    [true],
    [Timestamp.fromDate(new Date())],
  ])('can get a primitive value from globals', async (data) => {
    FirebaseMock.mockGetGlobal('testKey', data)

    const value = await firestore.getGlobal('testKey')

    expect(value).toEqual(data)
  })

  it('can get an object from globals', async () => {
    const expected = { key: 'value', nested: { key: 'value' } }
    FirebaseMock.mockGetGlobal('testKey', expected)

    const value = await firestore.getGlobal('testKey')

    expect(value).toEqual(expected)
  })

  it('will return null if the value does not exist', async () => {
    FirebaseMock.mockGetGlobal('testKey')

    const value = await firestore.getGlobal('testKey')

    expect(value).toBeNull()
  })
})
