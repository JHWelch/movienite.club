import { beforeEach, describe, expect, it } from 'vitest'
import { mockFetch } from '@tests/support/fetchMock'
import DiscordAdapter from '@server/data/discord/discordAdapter'
import { mockConfig } from '@server/__tests__/support/mockConfig'
import EventFactory from '@server/__tests__/support/factories/eventFactory'

let discordAdapter: DiscordAdapter

beforeEach(() => {
  discordAdapter = new DiscordAdapter(mockConfig())
})

describe('eventReminder', () => {
  it('calls the discord webhook with the correct payload', async () => {
    const event = new EventFactory().make()
    mockFetch().mockImplementationOnce((url, options) => {
      expect(url).toBe('https://DISCORD_WEBHOOK')
      expect(options?.method).toBe('POST')
      expect(options?.headers).toEqual({ 'Content-Type': 'application/json' })

      return Promise.resolve(new Response(null, { status: 204 }))
    })

    await discordAdapter.eventReminder(event)
  })
})
