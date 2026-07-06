import Config from '@server/config/config'
import { Event } from '@server/models/event'

export default class DiscordAdapter {
  private config: Config

  constructor (config: Config) {
    this.config = config
  }

  eventReminder = async (event: Event): Promise<void> => {
    const payload = {
      content: `# ${event.theme}\n${event.movies.map((movie) => ` - **${movie.time}** *${movie.title}*`).join('\n')}`,
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

}
