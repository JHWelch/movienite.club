import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { getMockReq, getMockRes } from '@tests/support/expressMocks'
import CacheEmailTemplatesController from '@server/controllers/cacheEmailTemplatesController'
import { transaction } from '@mocks/firebase/firestore'
import { Request } from 'express'
import { FirebaseMock } from '@tests/support/firebaseMock'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { mockConfig } from '@tests/support/mockConfig'
import fs from 'fs'
import MockDate from 'mockdate'

const { res, mockClear } = getMockRes()
let req: Request

const newCacheController = () => {
  const config = mockConfig()
  const firestore = new FirestoreAdapter(config)

  return new CacheEmailTemplatesController(firestore)
}

vi.mock('firebase-admin/app')
vi.mock('firebase/app')
vi.mock('firebase/firestore')
vi.mock('@server/helpers/directoryPath')

beforeAll(() => {
  MockDate.set('2021-01-01')
})

beforeEach(() => {
  vi.clearAllMocks()
  mockClear()
  req = getMockReq()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cacheEmailTemplates', () => {
  it('uploads email templates to firestore', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('html')
    await newCacheController().store(req, res)

    expect(res.sendStatus).toHaveBeenCalledWith(200)
    expect(transaction.set).toHaveBeenCalledWith(
      FirebaseMock.mockDoc('mail-templates', 'reminder'),
      {
        subject: 'Reminder: {{ theme }} is Tomorrow',
        html: 'html',
      },
    )
  })
})
