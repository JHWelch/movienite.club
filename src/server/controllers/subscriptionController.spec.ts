
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { getMockReq, getMockRes } from '@tests/support/expressMocks'
import SubscriptionController
  from '@server/controllers/subscriptionController'
import { Request } from 'express'
import FirestoreAdapter from '@server/data/firestore/firestoreAdapter'
import { mockConfig } from '@tests/support/mockConfig'
import { FirebaseMock } from '@tests/support/firebaseMock'
import { addDoc, deleteDoc, setDoc } from 'firebase/firestore'
import { withMessage } from '@server/helpers/messageBuilder'

const { res, mockClear } = getMockRes()
let req: Request
let firestore: FirestoreAdapter

vi.mock('firebase-admin/app')
vi.mock('firebase/app')
vi.mock('firebase/firestore')

beforeEach(() => {
  firestore = new FirestoreAdapter(mockConfig())
  mockClear()
})

interface MockBodyArgs {
  email?: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

const mockBody = ({
  email = 'test@example.com',
}: MockBodyArgs = {}) => ({ email })

describe('store', () => {
  describe('all fields correct', () => {
    beforeEach(() => {
      req = getMockReq({
        body: mockBody(),
      })
    })

    describe('user does not exist', () => {
      beforeEach(() => {
        FirebaseMock.mockGetUserByEmail()
      })

      it('should return 201 and success message', async () => {
        await new SubscriptionController(firestore).store(req, res)

        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(
          SubscriptionController.SUCCESS_MESSAGE,
        )
      })

      it('creates a new user with reminders enabled', async () => {
        await new SubscriptionController(firestore).store(req, res)

        expect(addDoc).toHaveBeenCalledWith(
          FirebaseMock.mockCollection('users'),
          {
            email: 'test@example.com',
            reminders: true,
          },
        )
      })
    })

    describe('user already exists and is subscribed', () => {
      beforeEach(() => {
        FirebaseMock.mockGetUserByEmail({
          id: 'id',
          email: 'test@example.com',
          reminders: true,
        })
      })

      it('should return 409', async () => {
        await new SubscriptionController(firestore).store(req, res)

        expect(res.status).toHaveBeenCalledWith(409)
        expect(res.json).toHaveBeenCalledWith({
          errors: { email: 'Already subscribed' },
          message: "You're already subscribed! Check your spam folder if you don't get the emails.",
        })
      })
    })

    describe('user already exists and is unsubscribed', () => {
      beforeEach(() => {
        FirebaseMock.mockGetUserByEmail({
          id: 'id',
          email: 'test@example.com',
          reminders: false,
        })
      })

      it('should return 200', async () => {
        await new SubscriptionController(firestore).store(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
          SubscriptionController.SUCCESS_MESSAGE,
        )
      })

      it('updates the user to be subscribed', async () => {
        await new SubscriptionController(firestore).store(req, res)

        expect(setDoc).toHaveBeenCalledWith(
          FirebaseMock.mockDoc('users', 'id'),
          {
            email: 'test@example.com',
            reminders: true,
          },
        )
      })
    })
  })

  describe('when email is missing', () => {
    beforeEach(() => {
      const body = mockBody()
      delete body.email
      req = getMockReq({
        body: body,
      })
    })

    it('should return a 422', async () => {
      await new SubscriptionController(firestore).store(req, res)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith({
        errors: { email: 'Invalid input: expected string, received undefined' },
      })
    })
  })

  describe('when email is malformed', () => {
    beforeEach(() => {
      req = getMockReq({
        body: mockBody({ email: 'test' }),
      })
    })

    it('should return a 422', async () => {
      await new SubscriptionController(firestore).store(req, res)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith({
        errors: { email: 'Invalid email address' },
      })
    })
  })
})

describe('destroy', () => {
  describe('missing token query param', () => {
    it('should redirect to the homepage', async () => {
      await new SubscriptionController(firestore).destroy(req, res)

      expect(res.redirect).toHaveBeenCalledWith('/')
    })
  })

  describe('token query param matches user id', () => {
    beforeEach(() => {
      req = getMockReq({
        query: { token: 'id' },
      })
    })

    it('should delete the user', async () => {
      await new SubscriptionController(firestore).destroy(req, res)

      expect(deleteDoc).toHaveBeenCalledWith(
        FirebaseMock.mockDoc('users', 'id'),
      )
    })

    it('should redirect to the homepage with unsubscribe message', async () => {
      await new SubscriptionController(firestore).destroy(req, res)

      expect(res.redirect).toHaveBeenCalledWith(
        withMessage('/', "You've been unsubscribed from the reminder emails."),
      )
    })
  })
})
