import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteApp, getApp } from 'firebase-admin/app'
import { Firestore, Timestamp } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import setupFirestore from '@server/config/firestore'
import Config from '@server/config/config'

describe.skipIf(process.env.RUN_FIRESTORE_SECURITY_TESTS !== 'true')(
  'Firestore security boundary', () => {
    let firestore: Firestore
    const projectId = 'demo-movienite'
    const documentPath = `_security-tests/${randomUUID()}`

    beforeAll(() => {
      if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('Security tests require the Firestore emulator')
      }

      firestore = setupFirestore({
        isProduction: false,
        googleCloudProject: projectId,
      } as Config)
    })

    afterAll(async () => {
      if (firestore) {
        await firestore.doc(documentPath).delete()
        await deleteApp(getApp())
      }
    })

    it('allows Admin writes, reads, and transactions despite deny-all rules',
      async () => {
        const document = firestore.doc(documentPath)
        const timestamp = Timestamp.fromDate(new Date('2026-01-01'))
        await document.set({ timestamp, count: 1 })
        await firestore.runTransaction(async transaction => {
          const snapshot = await transaction.get(document)
          transaction.update(document, { count: snapshot.data()!.count + 1 })
        })

        const snapshot = await document.get()

        expect(snapshot.exists).toBe(true)
        expect(snapshot.data()).toEqual({ timestamp, count: 2 })
      })

    it.each([
      { method: 'GET', authenticated: false },
      { method: 'PATCH', authenticated: false },
      { method: 'GET', authenticated: true },
      { method: 'PATCH', authenticated: true },
    ])(
      'denies direct $method requests (authenticated: $authenticated)',
      async ({ method, authenticated }) => {
        const host = process.env.FIRESTORE_EMULATOR_HOST
        const url = `http://${host}/v1/projects/${projectId}`
          + `/databases/(default)/documents/${documentPath}`
        const issuedAt = Math.floor(Date.now() / 1000)
        const token = [
          { alg: 'none', typ: 'JWT' },
          {
            iss: `https://securetoken.google.com/${projectId}`,
            aud: projectId,
            sub: 'security-test-user',
            iat: issuedAt,
            exp: issuedAt + 3600,
            auth_time: issuedAt,
            firebase: { sign_in_provider: 'custom', identities: {} },
          },
        ].map(value => Buffer.from(JSON.stringify(value)).toString('base64url'))
          .join('.') + '.'
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(method === 'PATCH' ? {
            body: JSON.stringify({ fields: { count: { integerValue: '99' } } }),
          } : {}),
        })

        expect(response.status).toBe(403)
        expect((await response.json()).error.status).toBe('PERMISSION_DENIED')
      },
    )
  },
)
