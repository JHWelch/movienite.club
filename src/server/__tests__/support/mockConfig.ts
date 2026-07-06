import Config from '@server/config/config'

export function mockConfig ({
  nodeEnv = 'production',
  googleCloudProject = 'GOOGLE_CLOUD_PROJECT',
} = {}): Config {
  process.env = {
    ADMIN_EMAIL: 'ADMIN_EMAIL@example.com',
    API_PASSWORD: 'API_PASSWORD',
    APP_URL: 'http://APP_URL.example.com',
    CALENDAR_URL: 'https://CALENDAR_URL',
    DISCORD_WEBHOOK: 'https://DISCORD_WEBHOOK',
    GOOGLE_CLOUD_PROJECT: googleCloudProject,
    NODE_ENV: nodeEnv,
    NOTION_MOVIE_DATA_SOURCE_ID: 'NOTION_MOVIE_DATA_SOURCE_ID',
    NOTION_TOKEN: 'NOTION_TOKEN',
    NOTION_EVENT_DATA_SOURCE_ID: 'NOTION_EVENT_DATA_SOURCE_ID',
    PORT: '3000',
    TMDB_READ_KEY: 'TMDB_READ_KEY',
  }

  return new Config()
}
