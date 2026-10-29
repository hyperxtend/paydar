import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsApi } from '../api/reports'
import type { DashboardMetrics } from '../types/reporting'

function fmt(amount: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

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
    <div className="card p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
        <span className={`h-2 w-2 rounded-full ${dot[colour]}`} />
        {label}
      </p>
      <p className="mt-2 text-[28px] leading-tight font-semibold tracking-tight text-gray-900 tabular-nums">{value}</p>
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
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Invoice status breakdown</h2>
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
      <div className="flex flex-wrap gap-4 mt-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${s.colour}`} />
            <span className="text-xs text-gray-600">{s.label} <span className="font-medium">{s.count}</span></span>
          </div>
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
          Full report →
        </Link>
      </div>
      <div className="space-y-3">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">{b.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`${b.colour} h-full rounded-full transition-all duration-500`}
                style={{ width: `${(b.value / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-24 text-right tabular-nums">
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
      <div>
        <h1 className="text-[34px] leading-tight font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your organisation at a glance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Status breakdown bar */}
      <StatusBar metrics={metrics} />

      {/* Aging chart */}
      <AgingBars metrics={metrics} />

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/invoices/new"
          className="flex items-center gap-3 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl p-4 shadow-card hover:brightness-110 transition"
        >
          <svg className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <div>
            <p className="font-semibold text-sm">New invoice</p>
            <p className="text-xs text-brand-200">Create and send</p>
          </div>
        </Link>
        <Link
          to="/notification-rules"
          className="card flex items-center gap-3 text-gray-700 p-4 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-6 w-6 flex-shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <div>
            <p className="font-semibold text-sm">Notification rules</p>
            <p className="text-xs text-gray-500">Automate reminders</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
