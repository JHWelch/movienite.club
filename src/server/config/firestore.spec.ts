import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeApp } from 'firebase/app'
import { applicationDefault } from 'firebase-admin/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import setupFirestore from '@server/config/firestore'
import { mockConfig } from '@tests/support/mockConfig'

vi.mock('firebase-admin/app')
vi.mock('firebase/app')
vi.mock('firebase/firestore')

beforeEach(() => {
  vi.clearAllMocks()
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

    expect(connectFirestoreEmulator).not.toHaveBeenCalled()
  })

  it('connects to the firestore emulator in development', () => {
    const firestore = setupFirestore(mockConfig({ nodeEnv: 'development' }))

    expect(applicationDefault).toHaveBeenCalledTimes(1)
    expect(initializeApp).toHaveBeenCalledTimes(1)
    expect(getFirestore).toHaveBeenCalledTimes(1)
    expect(connectFirestoreEmulator).toHaveBeenCalledWith(firestore, 'localhost', 8888)
    expect(firestore).toBeDefined()
  })
})
