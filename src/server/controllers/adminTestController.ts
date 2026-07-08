import { Request, Response } from 'express'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import DiscordAdapter from '@server/data/discord/discordAdapter'

export default class AdminTestController {
  constructor (
    private discord: DiscordAdapter,
    private firestore: FirestoreAdapter,
  ) {}

  discordWebhook = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.body
    const event = await this.firestore.getEvent(eventId)

    if (!event) {
      res.status(404).send('Event not found')

      return
    }

    this.discord.eventReminder(event)

    res.sendStatus(204)
  }
}
