/* eslint-disable @stylistic/max-len */
import EventController from '@server/controllers/eventController'
import { Router } from 'express'
import type NotionAdapter from '@server/data/notion/notionAdapter'
import CacheEventsController from '@server/controllers/cacheEventsController'
import CacheEmailTemplatesController from '@server/controllers/cacheEmailTemplatesController'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import TmdbAdapter from '@server/data/tmdb/tmdbAdapter'
import RsvpController from '@server/controllers/rsvpController'
import HealthCheckController from '@server/controllers/healthCheckController'
import SuggestionController from '@server/controllers/suggestionController'
import Config from '@server/config/config'
import CalendarController from '@server/controllers/calendarController'
import SubscriptionController from '@server/controllers/subscriptionController'
import { CronController } from '@server/controllers/cronController'
import EventEventController from '@server/controllers/eventEventController'
import MovieController from '@server/controllers/movieController'
import DiscordAdapter from '@server/data/discord/discordAdapter'

export default function createAppRouter (
  config: Config,
  discord: DiscordAdapter,
  firestore: FirestoreAdapter,
  notion: NotionAdapter,
  tmdb: TmdbAdapter,
): Router {
  const cacheEventsController = new CacheEventsController(firestore, notion, tmdb)
  const cacheEmailTemplatesController = new CacheEmailTemplatesController(firestore)
  const calendarController = new CalendarController(config)
  const cronController = new CronController(config, discord, firestore)
  const movieController = new MovieController(notion, tmdb)
  const rsvpController = new RsvpController(firestore)
  const subscriptionController = new SubscriptionController(firestore)
  const suggestionController = new SuggestionController(notion, tmdb)
  const eventController = new EventController(firestore)
  const eventEventController = new EventEventController(firestore)

  const router = Router()

  router.get('/health_check', HealthCheckController.index)

  router.get('/api/events', eventController.index)
  router.get('/api/events/:id', eventController.show)
  router.post('/api/events/:eventId/rsvp', rsvpController.store)
  router.get('/api/cache/events', cacheEventsController.show)
  router.post('/api/cache/events', cacheEventsController.store)
  router.post('/api/cache/email-templates', cacheEmailTemplatesController.store)
  router.post('/api/subscriptions', subscriptionController.store)
  router.get('/api/movies', movieController.show)
  router.post('/api/movies', movieController.store)

  router.post('/suggestions', suggestionController.store)
  router.get('/calendar', calendarController.index)
  router.get('/unsubscribe', subscriptionController.destroy)
  router.get('/cron/reminders', cronController.reminders)
  router.get('/events/:eventId/event', eventEventController.show)

  return router
}
