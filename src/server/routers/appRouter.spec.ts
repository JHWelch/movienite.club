import { expect, it } from 'vitest'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import NotionAdapter from '@server/data/notion/notionAdapter'
import TmdbAdapter from '@server/data/tmdb/tmdbAdapter'
import createAppRouter from '@server/routers/appRouter'
import { mockConfig } from '@tests/support/mockConfig'

it('registers all routes', () => {
  const config = mockConfig()
  const firestore = new FirestoreAdapter(config)
  const notion = new NotionAdapter(config)
  const tmdbAdapter = new TmdbAdapter(config)

  const router = createAppRouter(config, firestore, notion, tmdbAdapter)

  const routes =
    router.stack
      .filter((layer) => layer.route)
      .reduce<{ [key: string]: {
      get?: boolean
      post?: boolean
      patch?: boolean
      delete?: boolean
    } }>((previous, current) => {
        if (!current.route?.path) { return previous }

        previous[current.route.path] = {
          ...previous[current.route.path] ?? {},
          // @ts-expect-error methods is showing up but it is working
          ...current.route?.methods ?? {},
        }

        return previous
      }, {})

  expect(routes).toEqual( {
    '/health_check':  { get: true },
    '/api/events':  { get: true },
    '/api/events/:id':  { get: true },
    '/api/events/:eventId/rsvp':  { post: true },
    '/api/cache/events':  {
      get: true,
      post: true,
    },
    '/api/cache/email-templates':  { post: true },
    '/api/subscriptions':  { post: true },
    '/api/movies':  {
      get: true,
      post: true,
    },
    '/suggestions':  { post: true },
    '/calendar':  { get: true },
    '/unsubscribe':  { get: true },
    '/cron/reminders':  { get: true },
    '/events/:eventId/event':  { get: true },
    '/api/admin/discord':  { post: true },
  })
})
