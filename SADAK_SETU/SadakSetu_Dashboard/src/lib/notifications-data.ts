export type NotificationType = 'Critical' | 'Assignment' | 'System'

export type AppNotification = {
  id: string
  title: string
  message: string
  time: string
  type: NotificationType
  read: boolean
}
