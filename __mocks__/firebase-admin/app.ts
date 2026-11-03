import { vi } from 'vitest'

export const applicationDefault = vi.fn()
  .mockReturnValue({ applicationDefault: true })

export const getApps = vi.fn().mockReturnValue([])
export const initializeApp = vi.fn((options) => ({ initialize: options }))
