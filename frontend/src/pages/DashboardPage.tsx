import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsApi } from '../api/reports'
import type { DashboardMetrics } from '../types/reporting'
import { formatMoney as fmt } from '../lib/currency'

function MetricCard({
  label,
  value,
  sub,
  colour = 'brand',
}: {
  label: string
  value: string
  sub?: string
  colour?: 'brand' | 'green' | 'red' | 'yellow' | 'gray'
}) {
  const dot: Record<string, string> = {
    brand:  'bg-brand-600',
    green:  'bg-green-500',
    red:    'bg-red-500',
    yellow: 'bg-yellow-400',
    gray:   'bg-gray-300',
  }
  return (
    <div className="card p-4 sm:p-5 min-w-0">
      <p className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot[colour]}`} />
        {label}
      </p>
      <p className="mt-2 text-lg sm:text-[28px] leading-tight break-words font-semibold tracking-tight text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function StatusBar({ metrics }: { metrics: DashboardMetrics }) {
  const total = metrics.draftCount + metrics.sentCount + metrics.partiallyPaidCount + metrics.paidCount + metrics.overdueCount
  if (total === 0) return null

  const segments = [
    { label: 'Draft',       count: metrics.draftCount,         colour: 'bg-gray-300' },
    { label: 'Sent',        count: metrics.sentCount,           colour: 'bg-blue-400' },
    { label: 'Partly paid', count: metrics.partiallyPaidCount, colour: 'bg-yellow-400' },
    { label: 'Paid',        count: metrics.paidCount,           colour: 'bg-green-400' },
    { label: 'Overdue',     count: metrics.overdueCount,        colour: 'bg-red-500' },
  ].filter((s) => s.count > 0)

  return (
    <div className=" mb-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 my-4">
        <h2 className="text-sm font-semibold text-gray-700">Invoice status breakdown</h2>
        <div className="flex flex-wrap gap-4">
          {segments.map((s) => (
            <ul key={s.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${s.colour}`} />
              <span className="text-xs text-gray-600">{s.label} <span className="font-medium">{s.count}</span></span>
            </ul>
          ))}
        </div>
      </div>
      <div className="flex rounded-full overflow-hidden h-4">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.colour} transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
    </div>
  )
}

function AgingBars({ metrics }: { metrics: DashboardMetrics }) {
  const { aging } = metrics
  const buckets = [
    { label: 'Current',    value: aging.current,    colour: 'bg-blue-400' },
    { label: '1–30 days',  value: aging.days1to30,  colour: 'bg-yellow-400' },
    { label: '31–60 days', value: aging.days31to60, colour: 'bg-orange-400' },
    { label: '61–90 days', value: aging.days61to90, colour: 'bg-red-400' },
    { label: '90+ days',   value: aging.days90plus, colour: 'bg-red-700' },
  ]
  const max = Math.max(...buckets.map((b) => b.value), 1)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Accounts receivable aging</h2>
        <Link
          to="/reports"
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
         view report →
        </Link>
      </div>
      <div className="space-y-3">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-[4.5rem] sm:w-20 flex-shrink-0">{b.label}</span>
            <div className="flex-1 min-w-0 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`${b.colour} h-full rounded-full transition-all duration-500`}
                style={{ width: `${(b.value / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-24 sm:w-28 text-right tabular-nums whitespace-nowrap">
              {fmt(b.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  reportsApi.dashboard,
    refetchInterval: 60_000, // refresh every minute
  })

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] leading-tight font-bold text-gray-900">Dashboard</h1>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/notification-rules"
            className="btn-secondary"
          >
            <svg className="h-4 w-4 flex-shrink-0 text-navy-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notification rules
          </Link>
          <Link
            to="/invoices/new"
            className="btn-primary"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New invoice
          </Link>
        </div>
      </div>

      {/* Status breakdown bar */}
      <StatusBar metrics={metrics} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total invoiced"
          value={fmt(metrics.totalInvoiced)}
          colour="brand"
        />
        <MetricCard
          label="Collected"
          value={fmt(metrics.totalCollected)}
          colour="green"
        />
        <MetricCard
          label="Outstanding"
          value={fmt(metrics.totalOutstanding)}
          colour="yellow"
        />
        <MetricCard
          label="Overdue"
          value={fmt(metrics.overdueAmount)}
          sub={`${metrics.overdueCount} invoice${metrics.overdueCount !== 1 ? 's' : ''}`}
          colour="red"
        />
      </div>

      {/* Aging chart */}
      <AgingBars metrics={metrics} />
    </div>
  )
}
