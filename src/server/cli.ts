/* eslint-disable no-console */
import * as dotenv from 'dotenv'
import Config from '@server/config/config'
import NotionAdapter from '@server/data/notion/notionAdapter'

const arg = process.argv[2]

if (arg?.replace(/^--?/, '') === 'help') {
  console.log('Usage: npm run cli')
  console.log('       npm run cli -- help')
  console.log('')
  console.log('Currently this CLI tool only outputs a CSV of watched movies')
  console.log('from the Notion database.')

  process.exit(0)
}

const run = async () => {
  dotenv.config()
  const config = new Config()
  const notion = new NotionAdapter(config)
  const events = await notion.getEvents()
  const wrap = (str: string) => str.includes(',') ? `"${str}"` : str
  const getTmdbId = (url: string) => {
    const segments = new URL(url).pathname.split('/')

    return segments[segments.length - 1]
  }

  for (const event of events) {
    const WatchedDate = event.date.toISODate()
    const tags = wrap(event.tags.concat('movie night').join(', '))

    for (const movie of event.movies) {
      const tmdbID = movie.url
        ? getTmdbId(movie.url)
        : 'NO TMDB ID : ' + movie.title

      console.log([
        WatchedDate,
        tmdbID,
        tags,
      ].join(','))
    }
  }
}

run()
