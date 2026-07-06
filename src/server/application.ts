import { type Express } from 'express'
import ViteExpress from 'vite-express'
import type NotionAdapter from '@server/data/notion/notionAdapter'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import TmdbAdapter from '@server/data/tmdb/tmdbAdapter'
import createAppRouter from '@server/routers/appRouter'
import Config from '@server/config/config'
import cronMiddleware from '@server/middleware/cronMiddleware'
import passwordMiddleware from '@server/middleware/passwordMiddleware'
import DiscordAdapter from '@server/data/discord/discordAdapter'

export default class Application {
  constructor (
    private config: Config,
    private express: Express,
    discord: DiscordAdapter,
    firestore: FirestoreAdapter,
    notion: NotionAdapter,
    tmdb: TmdbAdapter,
  ) {
    express.use('/cron', cronMiddleware)
    express.use('/api/cache', passwordMiddleware(config))
    express.use(createAppRouter(config, discord, firestore, notion, tmdb))
  }

  listen (): void {
    const port = this.config.port

    ViteExpress.listen(this.express, port, () => {
      console.log(`Listening on port ${port}...`) // eslint-disable-line no-console
    })
  }
}
