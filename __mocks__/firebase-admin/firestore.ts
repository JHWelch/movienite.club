import { vi } from 'vitest'
import { Timestamp } from '@google-cloud/firestore'

export { Timestamp }

export const transaction = {
  set: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

export const collectionAdd = vi.fn()
export const documentGet = vi.fn()
export const queryGet = vi.fn()
export const documentDelete = vi.fn()
export const documentSet = vi.fn()
export const query = vi.fn()

class MockDocument {
  firestore = { firestore: 'firestore' }

  constructor (
    public collectionPath: string,
    public documentPath: string,
  ) {}

  get () {
    return documentGet(this)
  }

  set (data: unknown) {
    return documentSet(this, data)
  }

  delete () {
    return documentDelete(this)
  }
}

class MockQuery {
  firestore = { firestore: 'firestore' }
  #constraints: unknown[]

  constructor (public collectionPath: string, constraints: unknown[] = []) {
    this.#constraints = constraints
  }

  where (fieldPath: string, opStr: string, value: unknown) {
    return new MockQuery(this.collectionPath, [
      ...this.#constraints, { fieldPath, opStr, value },
    ])
  }

  orderBy (fieldPath: string, directionStr?: string) {
    return new MockQuery(this.collectionPath, [
      ...this.#constraints, { fieldPath, directionStr },
    ])
  }

  limit (limit: number) {
    return new MockQuery(this.collectionPath, [...this.#constraints, { limit }])
  }

  get () {
    query({
      firestore: this.firestore,
      collectionPath: this.collectionPath,
    }, ...this.#constraints)

    return queryGet(this)
  }

  doc (documentPath: string) {
    return new MockDocument(this.collectionPath, documentPath)
  }

  add (data: unknown) {
    return collectionAdd(this, data)
  }
}

export const getFirestore = vi.fn().mockReturnValue({
  collection: (collectionPath: string) => new MockQuery(collectionPath),
  runTransaction: async (
    updateFunction: (value: typeof transaction) => unknown,
  ) =>
    updateFunction(transaction),
})
