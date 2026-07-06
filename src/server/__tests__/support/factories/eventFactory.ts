import Factory from '@tests/support/factories/factory'
import { Event, EventConstructor } from '@server/models/event'
import { DateTime } from 'luxon'
import { Movie } from '@server/models/movie'

export default class EventFactory extends Factory<Event, EventConstructor> {
  protected _make = () => new Event(this._state)

  protected _state: EventConstructor = {
    id: 'id',
    theme: 'theme',
    date: DateTime.fromISO('2021-09-13', { zone: 'utc' }),
    isSkipped: false,
    slug: null,
    movies: [],
  }

  public withMovies = (movies: Movie[]): EventFactory => {
    this._state.movies = movies

    return this
  }
}
