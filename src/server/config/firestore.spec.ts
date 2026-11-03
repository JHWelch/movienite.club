import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import setupFirestore from '@server/config/firestore'
import { mockConfig } from '@tests/support/mockConfig'

vi.mock('firebase-admin/app')
vi.mock('firebase-admin/firestore')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getFirestore).mockReturnValue({} as ReturnType<typeof getFirestore>)
})

describe('setupFirestore', () => {
  it('initializes the firestore', () => {
    const firestore = setupFirestore(mockConfig({
      googleCloudProject: 'GOOGLE_CLOUD_PROJECT',
    }))

    expect(applicationDefault).toHaveBeenCalledTimes(1)
    expect(initializeApp).toHaveBeenCalledWith({
      credential: { applicationDefault: true },
      projectId: 'GOOGLE_CLOUD_PROJECT',
    })
    expect(getFirestore).toHaveBeenCalledWith({ initialize: {
      credential: { applicationDefault: true },
      projectId: 'GOOGLE_CLOUD_PROJECT',
    } })
    expect(firestore).toBeDefined()

    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeUndefined()
  })

  it('connects to the firestore emulator in development', () => {
    setupFirestore(mockConfig({ nodeEnv: 'development' }))

    expect(applicationDefault).toHaveBeenCalledTimes(1)
    expect(initializeApp).toHaveBeenCalledTimes(1)
    expect(getFirestore).toHaveBeenCalledTimes(1)
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('localhost:8888')
  })

  it('reuses an initialized app', () => {
    const app = { name: '[DEFAULT]' }
    vi.mocked(getApps).mockReturnValueOnce([
      app as ReturnType<typeof initializeApp>,
    ])

    setupFirestore(mockConfig())

    expect(initializeApp).not.toHaveBeenCalled()
    expect(getFirestore).toHaveBeenCalledWith(app)
  })

  it('preserves an explicitly configured development emulator', () => {
    const config = mockConfig({ nodeEnv: 'development' })
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:9999'

    setupFirestore(config)

    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:9999')
  })

  it('rejects emulator configuration in production', () => {
    const config = mockConfig()
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8888'

    expect(() => setupFirestore(config)).toThrow('must not be set in production')
    expect(getFirestore).not.toHaveBeenCalled()
  })
})
