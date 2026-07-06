import Config from '@server/config/config'
import { Event } from '@server/models/event'

export default class DiscordAdapter {
  private config: Config

  constructor (config: Config) {
    this.config = config
  }

  eventReminder = async (event: Event): Promise<void> => {
    const payload = {
    }

    await fetch(this.config.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

}
