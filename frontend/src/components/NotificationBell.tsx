import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInAppNotifications } from '../hooks/useInAppNotifications'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import type { InAppNotificationPayload } from '../types/notification'

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-6 w-6 ${hasUnread ? 'text-brand-600' : 'text-gray-500'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function NotificationItem({ n }: { n: InAppNotificationPayload }) {
  return (
    <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <p className="text-sm font-medium text-gray-900 truncate">
        {n.clientName} — {n.invoiceNumber}
      </p>
      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
    </div>
  )
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useInAppNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useOnClickOutside(ref, () => setOpen(false))

  function toggle() {
    if (!open) markAllRead()
    setOpen((v) => !v)
  }

  function viewAll() {
    setOpen(false)
    navigate('/notifications')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label="Notifications"
      >
        <BellIcon hasUnread={unreadCount > 0} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <button
              onClick={viewAll}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              View all
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No new notifications</p>
            ) : (
              notifications
                .slice(0, 10)
                .map((n) => <NotificationItem key={n.notificationId} n={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
