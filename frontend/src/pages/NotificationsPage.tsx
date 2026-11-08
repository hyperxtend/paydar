import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api/notifications'
import { invoicesApi } from '../api/invoices'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'
import Select from '../components/ui/Select'
import { CHANNEL_LABELS, STATUS_COLOURS } from '../types/notification'
import type { NotificationChannel, NotificationRecord } from '../types/notification'
import type { InvoiceStatus, InvoiceSummary } from '../types/invoice'
import { formatMoney } from '../lib/currency'

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

const OUTSTANDING: InvoiceStatus[] = ['OVERDUE', 'PARTIALLY_PAID', 'SENT']
const PREVIEW_COUNT = 5
const DAY_MS = 86_400_000

function dueLabel(dueDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((new Date(dueDate).setHours(0, 0, 0, 0) - today.getTime()) / DAY_MS)
  if (days < 0) return { text: `${-days} day${days === -1 ? '' : 's'} overdue`, urgent: true }
  if (days === 0) return { text: 'Due today', urgent: true }
  return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, urgent: false }
}

function ReminderRow({ invoice }: { invoice: InvoiceSummary }) {
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<NotificationChannel>('EMAIL')
  const [justSent, setJustSent] = useState(false)
  const due = dueLabel(invoice.dueDate)

  const { mutate: ping, isPending, isError, reset } = useMutation({
    mutationFn: () => notificationsApi.ping(invoice.id, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setJustSent(true)
    },
  })

  // Let the "Sent" confirmation linger briefly, then reset the button
  useEffect(() => {
    if (!justSent) return
    const t = setTimeout(() => setJustSent(false), 2500)
    return () => clearTimeout(t)
  }, [justSent])

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/invoices/${invoice.id}`} className="text-sm font-semibold text-gray-900 hover:text-navy-700 hover:underline">
            {invoice.number}
          </Link>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <p className="text-sm text-gray-600 truncate" title={invoice.clientName}>{invoice.clientName}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatMoney(invoice.total, invoice.currency)} ·{' '}
          <span className={due.urgent ? 'font-medium text-red-600' : ''}>{due.text}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          size="sm"
          className="w-32"
          aria-label={`Channel for ${invoice.number}`}
          value={channel}
          onChange={(c) => { setChannel(c); reset() }}
          options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))}
        />
        <button
          type="button"
          disabled={isPending || justSent}
          onClick={() => ping()}
          className={`btn py-1.5 text-xs min-w-[7.5rem] justify-center disabled:cursor-default ${
            justSent ? 'bg-green-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60'
          }`}
        >
          {isPending ? 'Sending…' : justSent ? '✓ Sent' : 'Send reminder'}
        </button>
      </div>
      {isError && <p role="alert" className="text-xs text-red-600 sm:basis-full">Couldn't send, try again.</p>}
    </li>
  )
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  })

  const { data: allInvoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.list,
  })

  // Anything still owed, most overdue first
  const outstanding = allInvoices
    .filter((inv) => OUTSTANDING.includes(inv.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const shown = showAll ? outstanding : outstanding.slice(0, PREVIEW_COUNT)

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
          <h1 className="text-[28px] sm:text-[34px] leading-tight font-bold text-gray-900">Notification History</h1>
          <p className="text-sm text-gray-500 mt-1">All outbound notification activity for your organisation</p>
        </div>
      </div>

      {/* Manual ping panel */}
      {outstanding.length > 0 && (
        <div className="card px-4 pt-4 pb-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Send a reminder</h2>
            <span className="text-xs text-gray-500">{outstanding.length} unpaid</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Nudge a client right now instead of waiting for your notification rules.
          </p>
          <ul className="mt-2 divide-y divide-gray-100">
            {shown.map((inv) => <ReminderRow key={inv.id} invoice={inv} />)}
          </ul>
          {outstanding.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full border-t border-gray-100 py-2.5 text-sm font-medium text-brand-600 hover:text-brand-700 active:scale-100"
            >
              {showAll ? 'Show fewer' : `Show all ${outstanding.length}`}
            </button>
          )}
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
                  <tr
                    key={n.id}
                    tabIndex={0}
                    aria-label={`Open invoice ${n.invoiceNumber}`}
                    onClick={() => navigate(`/invoices/${n.invoiceId}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${n.invoiceId}`)}
                    className="cursor-pointer hover:bg-navy-50/60 focus-visible:outline-none focus-visible:bg-navy-50 transition-colors"
                  >
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
