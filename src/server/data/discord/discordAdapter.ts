import Config from '@server/config/config'
import { Event } from '@server/models/event'
import { Movie } from '@server/models/movie'

export default class DiscordAdapter {
  private config: Config

  constructor (config: Config) {
    this.config = config
  }

  eventReminder = async (event: Event): Promise<void> => {
    const payload = {
      content: [
        `# Movie Nite Tomorrow (${event.monthDayDisplayDate})`,
        `## ${event.theme}`,
        ...event.movies.map(this._movieListItem),
      ].join('\n'),
      embeds : event.movies.map((movie) => ({
        title: `*${movie.title}* (${movie.year})`,
        description: `${movie.director} - ${movie.displayLength()}`,
        url: movie.url,
        image: {
          url: movie.posterUrl('w1280'),
        },
      })),
    }

    await fetch(this.config.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  _movieListItem = (movie: Movie): string => {
    const { showingUrl, theaterName, time, title } = movie

    if (theaterName && showingUrl) {
      return ` - **${time}** *${title}* - [${theaterName}](${showingUrl})`
    }

    return ` - **${time}** *${title}*`
  }

}
