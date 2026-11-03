import { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore'

export default class User {
  constructor (
    public id: string,
    public email: string,
    public reminders: boolean = true,
  ) {}

  static fromFirebase = (
    record: QueryDocumentSnapshot<DocumentData, DocumentData>,
  ): User => new User(
    record.id,
    record.data().email,
    record.data().reminders,
  )

  toFirebaseDTO = (): DocumentData => ({
    email: this.email,
    reminders: this.reminders,
  })

  unsubscribeUrl = (): string => `/unsubscribe?token=${this.id}`
}
