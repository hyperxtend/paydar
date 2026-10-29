import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications'
import { CHANNEL_LABELS, STATUS_COLOURS } from '../types/notification'
import type { NotificationChannel, NotificationRecord } from '../types/notification'

const CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP']

function StatusBadge({ status }: { status: NotificationRecord['status'] }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[status]}`}>
      {status}
    </span>
  )
}

function ChannelBadge({ channel }: { channel: NotificationChannel }) {
  const colours: Record<NotificationChannel, string> = {
    EMAIL:    'bg-blue-100 text-blue-700',
    SMS:      'bg-purple-100 text-purple-700',
    WHATSAPP: 'bg-green-100 text-green-700',
    IN_APP:   'bg-indigo-100 text-indigo-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colours[channel]}`}>
      {CHANNEL_LABELS[channel]}
    </span>
  )
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [pingChannel, setPingChannel] = useState<Record<string, NotificationChannel>>({})

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  })

  const { mutate: ping, isPending: pinging } = useMutation({
    mutationFn: ({ invoiceId, channel }: { invoiceId: string; channel: NotificationChannel }) =>
      notificationsApi.ping(invoiceId, channel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Deduplicate invoices for the ping controls
  const invoices = Array.from(
    new Map(
      notifications.map((n) => [n.invoiceId, { invoiceId: n.invoiceId, invoiceNumber: n.invoiceNumber, clientName: n.clientName }])
    ).values()
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[34px] leading-tight font-bold text-gray-900">Notification History</h1>
          <p className="text-sm text-gray-500 mt-1">All outbound notification activity for your organisation</p>
        </div>
      </div>

      {/* Manual ping panel */}
      {invoices.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Manual Ping</h2>
          <div className="space-y-2">
            {invoices.slice(0, 5).map((inv) => (
              <div key={inv.invoiceId} className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-700 w-40 truncate">
                  {inv.invoiceNumber} — {inv.clientName}
                </span>
                <select
                  className="text-xs field px-2 py-1"
                  value={pingChannel[inv.invoiceId] ?? 'EMAIL'}
                  onChange={(e) =>
                    setPingChannel((prev) => ({
                      ...prev,
                      [inv.invoiceId]: e.target.value as NotificationChannel,
                    }))
                  }
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
                  ))}
                </select>
                <button
                  disabled={pinging}
                  onClick={() =>
                    ping({ invoiceId: inv.invoiceId, channel: pingChannel[inv.invoiceId] ?? 'EMAIL' })
                  }
                  className="text-xs bg-brand-600 text-white px-3 py-1 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification log */}
      <div className="card overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm">No notifications sent yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Invoice', 'Client', 'Channel', 'Recipient', 'Status', 'Scheduled', 'Sent'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {n.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{n.clientName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ChannelBadge channel={n.channel} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px] truncate">{n.recipient}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(n.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {n.sentAt ? new Date(n.sentAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
