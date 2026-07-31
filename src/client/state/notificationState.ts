import { reactive } from 'vue'
import { NotificationType } from '@shared/notifications'

export type NotificationState = {
  message?: string
  type?: NotificationType
  show: () => boolean
  open: (message: string, type?: NotificationType) => void
  flash: (
    message: string,
    type?: NotificationType,
    timeout?: number,
  ) => void
  close: () => void
  info: (message: string) => void
  success: (message: string) => void
  warning: (message: string) => void
  error: (message: string) => void
}

export const notifications: NotificationState = reactive<NotificationState>({
  message: undefined,
  type: undefined,
  show: () => notifications.message !== undefined,
  open: (
    message: string,
    type: NotificationType = 'info',
  ) => {
    notifications.message = message
    notifications.type = type
  },
  flash: (
    message: string,
    type?: NotificationType,
    timeout: number = 5000,
  ) => {
    notifications.open(message, type)
    setTimeout(notifications.close, timeout)
  },
  close: () => {
    notifications.message = undefined
    notifications.type = undefined
  },
  info: (
    message: string,
    timeout: number = 5000,
  ) => notifications.flash(message, 'info', timeout),
  success: (
    message: string,
    timeout: number = 5000,
  ) => notifications.flash(message, 'success', timeout),
  warning: (
    message: string,
    timeout: number = 5000,
  ) => notifications.flash(message, 'warning', timeout),
  error: (
    message: string,
    timeout: number = 5000,
  ) => notifications.flash(message, 'error', timeout),
})
