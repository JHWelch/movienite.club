import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import Config from '@server/config/config'

export default function setupFirestore (config: Config): Firestore {
  if (config.isProduction && process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST must not be set in production')
  }

  if (!config.isProduction) {
    process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8888'
  }

  const firebaseConfig = {
    credential: applicationDefault(),
    projectId: config.googleCloudProject,
  }

  const app = getApps()[0] ?? initializeApp(firebaseConfig)

  return getFirestore(app)
}
