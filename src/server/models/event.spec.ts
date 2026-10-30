import { it, describe, expect, beforeEach } from 'vitest'
import { TZ } from '@server/config/tz'
import { Event } from '@server/models/event'
import MovieFactory from '@tests/support/factories/movieFactory'
import EventFactory from '@tests/support/factories/eventFactory'
import { NotionMock } from '@tests/support/notionMock'
import { DateTime } from 'luxon'

describe('dateString', () => {
  let event: Event

  beforeEach(() => {
    event = new EventFactory().make({
      date: DateTime.fromISO('2021-09-13'),
    })
  })

  it('returns the date as a string', () => {
    expect(event.dateString).toEqual('2021-09-13')
  })
})

describe('totalLength', () => {
  it('calculates total length with no times', () => {
    const event = new EventFactory().make({
      movies: [
        new MovieFactory().make({ length: 90, time: null }),
        new MovieFactory().make({ length: 120, time: null }),
      ],
    })

    expect(event.totalLength).toEqual(30 + 90 + 120 + 15)
  })

  it('calculates total length with no times with many movies', () => {
    const event = new EventFactory().make({
      movies: [
        new MovieFactory().make({ length: 90, time: null }),
        new MovieFactory().make({ length: 120, time: null }),
        new MovieFactory().make({ length: 45, time: null }),
        new MovieFactory().make({ length: 100, time: null }),
      ],
    })

    expect(event.totalLength).toEqual(
      30 +
      90 + 15 +
      120 + 15 +
      45 + 15 +
      100,
    )
  })

  it('calculates total length with times on all', () => {
    const event = new EventFactory().make({
      movies: [
        new MovieFactory().make({ time: '6:00 PM', length: 60 }),
        new MovieFactory().make({ time: '8:00 PM', length: 120 }),
      ],
    })

    expect(event.totalLength).toEqual(30 + 240)
  })

  it('calculates total length with times on some', () => {
    const event = new EventFactory().make({
      movies: [
        new MovieFactory().make({ time: '6:00 PM', length: 60 }),
        new MovieFactory().make({ time: '8:00 PM', length: 120 }),
        new MovieFactory().make({ time: null, length: 45 }),
        new MovieFactory().make({ time: null, length: 100 }),
      ],
    })

    expect(event.totalLength).toEqual(
      30 +
      240 + 15 +
      45 + 15 +
      100,
    )
  })
})

describe('startTime', () => {
  describe('with start time', () => {
    it('returns 30 minutes before start time', () => {
      const event = new EventFactory().make({
        date: DateTime.fromISO('2021-09-13'),
        movies: [
          new MovieFactory().make({ length: 105, time: '6:00 PM' }),
          new MovieFactory().make({ length: 120, time: '8:00 PM' }),
        ],
      })

      expect(event.startTime).toEqual(DateTime.fromISO('2021-09-13T17:30:00'))
    })
  })
})

describe('fromNotion', () => {
  it('can create a event from a notion object', () => {
    expect(Event.fromNotion(NotionMock.mockEvent({
      id: 'eventId3',
      date: '2021-01-15',
      theme: 'theme3',
      submittedBy: 'submittedBy',
      lastEditedTime: '2022-08-12T15:45:00.000Z',
    }))).toEqual({
      id: 'eventId3',
      date: DateTime.fromISO('2021-01-15', TZ),
      isSkipped: false,
      slug: null,
      movies: [],
      theme: 'theme3',
      styledTheme: [],
      lastUpdated: DateTime.fromISO('2022-08-12T15:45:00.000Z'),
      submittedBy: 'submittedBy',
      tags: [],
      hideFromHome: false,
    })
  })

  it('does not use lastEditedMovieTime if lastEditedTime is higher', () => {
    expect(Event.fromNotion(NotionMock.mockEvent({
      id: 'eventId3',
      date: '2021-01-15',
      theme: 'theme3',
      lastEditedTime: '2022-08-12T15:45:00.000Z',
      lastEditedMovieTime: '2021-08-12T15:45:00.000+00:00',
    }))).toMatchObject({
      lastUpdated: DateTime.fromISO('2022-08-12T15:45:00.000Z'),
    })
  })

  it('does not use lastEditedMovieTime if it is null', () => {
    expect(Event.fromNotion(NotionMock.mockEvent({
      id: 'eventId3',
      date: '2021-01-15',
      theme: 'theme3',
      lastEditedTime: '2022-08-12T15:45:00.000Z',
      lastEditedMovieTime: null,
    }))).toMatchObject({
      lastUpdated: DateTime.fromISO('2022-08-12T15:45:00.000Z'),
    })
  })

  it('uses lastEditedMovieTime if it is higher than lastEditedTime', () => {
    expect(Event.fromNotion(NotionMock.mockEvent({
      id: 'eventId3',
      date: '2021-01-15',
      theme: 'theme3',
      lastEditedTime: '2021-08-12T15:45:00.000Z',
      lastEditedMovieTime: '2023-08-12T15:45:00.000+00:00',
    }))).toMatchObject({
      lastUpdated: DateTime.fromISO('2023-08-12T15:45:00.000Z'),
    })
  })
})
