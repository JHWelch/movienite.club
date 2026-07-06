export default class Config {
  adminEmail: string
  apiPassword: string
  appUrl: string
  calendarUrl: string
  discordWebhook: string
  googleCloudProject: string
  nodeEnv: string
  notionMovieDatabaseId: string
  notionToken: string
  notionEventDatabaseId: string
  port: number
  tmdbApiKey: string

  constructor () {
    this.adminEmail = requiredVariable('ADMIN_EMAIL')
    this.apiPassword = requiredVariable('API_PASSWORD')
    this.appUrl = requiredVariable('APP_URL')
    this.calendarUrl = requiredVariable('CALENDAR_URL')
    this.discordWebhook = requiredVariable('DISCORD_WEBHOOK')
    this.googleCloudProject = requiredVariable('GOOGLE_CLOUD_PROJECT')
    this.notionMovieDatabaseId = requiredVariable('NOTION_MOVIE_DATA_SOURCE_ID')
    this.notionEventDatabaseId = requiredVariable('NOTION_EVENT_DATA_SOURCE_ID')
    this.notionToken = requiredVariable('NOTION_TOKEN')
    this.tmdbApiKey = requiredVariable('TMDB_READ_KEY')

    this.nodeEnv = optionalVariable('NODE_ENV', 'development')
    this.port = parseInt(optionalVariable('PORT', '8080'))
  }

  get isProduction (): boolean {
    return this.nodeEnv === 'production'
  }
}

const requiredVariable = (name: string): string => {
  const value = process.env[name]
  if (value == null) {
    throw new Error(`${name} is missing`)
  }

  return value
}

const optionalVariable = (
  name: string,
  fallback: string,
): string => process.env[name] ?? fallback
