import { Client as _Client, isFullPage as _isFullPage } from '@notionhq/client'
import {
  GetPageParameters,
  GetPageResponse,
  PageObjectResponse,
  QueryDataSourceParameters,
  QueryDataSourceResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { RichText } from '@shared/dtos'
import {
  NotionMovie,
  WithAuth,
  nCheckbox,
  nDate,
  nFormula,
  nLastEditedTime,
  nMultiSelect,
  nRelation,
  nRichText,
  nTitle,
  pageObjectResponse,
} from '@tests/support/notionHelpers'
import { DateTime } from 'luxon'
import { Mock, MockedFunction, vi } from 'vitest'

const Client = _Client as unknown as Mock
const isFullPage = _isFullPage as unknown as Mock

type CreateType = typeof Client.prototype.pages.create
type UpdateType = typeof Client.prototype.pages.update
type QueryType = typeof Client.prototype.databases.query
type RetrieveType = typeof Client.prototype.pages.retrieve

export class NotionMock {
  create: MockedFunction<CreateType>
  update: MockedFunction<UpdateType>
  query: MockedFunction<QueryType>
  retrieve: MockedFunction<RetrieveType>

  constructor () {
    const create = vi.fn<CreateType>()
    const update = vi.fn<UpdateType>()
    const retrieve = vi.fn<RetrieveType>()
    const query = vi.fn<QueryType>()
    this.create = create
    this.update = update
    this.retrieve = retrieve
    this.query = query

    const FakeClient = class {
      pages: {
        create: MockedFunction<CreateType>
        update: MockedFunction<UpdateType>
        retrieve: MockedFunction<RetrieveType>
      }
      dataSources: {
        query: MockedFunction<QueryType>
      }
      constructor () {
        this.pages = {
          create: create,
          update: update,
          retrieve: retrieve,
        }
        this.dataSources = { query: query }
      }
    }

    Client.mockImplementation(FakeClient as unknown as () => _Client)
  }

  mockIsFullPage = (response: boolean) =>
    isFullPage.mockReturnValue(response)

  mockRetrieve = (movie?: NotionMovie) => {
    const notionMovie = movie ?? NotionMovie.demo()

    this.retrieve.mockImplementationOnce(
      (async (_args: WithAuth<GetPageParameters>): Promise<GetPageResponse> => {
        return notionMovie.toPageObjectResponse() as GetPageResponse
      }) as unknown as (this: any, ...args: unknown[]) => void, // eslint-disable-line @typescript-eslint/no-explicit-any
    )

    return { pages: { retrieve: this.retrieve } }
  }

  mockQuery = (events: PageObjectResponse[] = []) => {
    this.query.mockImplementationOnce(
      (async (
        _args: WithAuth<QueryDataSourceParameters>,
      ): Promise<QueryDataSourceResponse> => ({
        page_or_data_source: {},
        type: 'page_or_data_source',
        object: 'list',
        next_cursor: null,
        has_more: false,
        results: events,
      })) as unknown as (this: any, ...args: unknown[]) => void) // eslint-disable-line @typescript-eslint/no-explicit-any

    return { databases: { query: this.query } }
  }

  mockCreate = (...ids: string[]) => {
    ids.forEach((id) => this.create.mockResolvedValueOnce({
      id: id,
      object: 'page',
    }))
  }

  static mockEvent = (event: {
    id: string
    date: string
    theme: string
    skipped?: boolean
    slug?: string | null
    movies?: NotionMovie[]
    styledTheme?: RichText[]
    lastEditedTime?: string
    lastEditedMovieTime?: string | null
    submittedBy?: string | null
    tags?: string[]
    hideFromHome?: boolean
  }): PageObjectResponse => pageObjectResponse(event.id, {
    Date: nDate(event.date),
    Theme: nTitle(event.theme),
    Skipped: nCheckbox(event.skipped ?? false),
    Slug: nRichText(event.slug ?? null),
    Movies: nRelation(event.movies ?? []),
    'Styled Theme': nRichText(event.styledTheme ?? []),
    'Last edited time': nLastEditedTime(event.lastEditedTime ?? DateTime.now().toISO()),
    'Last edited movie time': nFormula(event.lastEditedMovieTime || null),
    'Submitted By': nRichText(event.submittedBy ?? null),
    Tags: nMultiSelect(event.tags ?? []),
    'Hide from Home': nCheckbox(event.hideFromHome ?? false),
  })
}
