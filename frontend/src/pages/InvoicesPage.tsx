import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { invoicesApi } from '../api/invoices'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'
import MultiSelect from '../components/ui/MultiSelect'
import Select from '../components/ui/Select'
import { STATUS_LABELS } from '../types/invoice'
import type { InvoiceStatus, InvoiceSummary } from '../types/invoice'
import { formatMoney } from '../lib/currency'

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

// AppLayout's sticky top bar is h-14
const TOP_BAR_HEIGHT = 56

type SortKey = 'number' | 'issueDate' | 'dueDate' | 'total'
type SortDir = 'asc' | 'desc'

const columns: { label: string; sortKey?: SortKey }[] = [
  { label: 'Invoice', sortKey: 'number' },
  { label: 'Client' },
  { label: 'Issued',  sortKey: 'issueDate' },
  { label: 'Due',     sortKey: 'dueDate' },
  { label: 'Amount',  sortKey: 'total' },
  { label: 'Status' },
]

// Lifecycle order for the status filter
const STATUS_ORDER: InvoiceStatus[] = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'VOID']

const PERIODS = [
  { value: '',     label: 'Any time' },
  { value: '30',   label: 'Last 30 days' },
  { value: '90',   label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
]

function issuedWithin(issueDate: string, period: string) {
  if (!period) return true
  const issued = new Date(issueDate)
  const now = new Date()
  if (period === 'year') return issued.getFullYear() === now.getFullYear()
  return now.getTime() - issued.getTime() <= Number(period) * 86_400_000
}

function compare(a: InvoiceSummary, b: InvoiceSummary, key: SortKey) {
  switch (key) {
    case 'total':  return a.total - b.total
    case 'number': return a.number.localeCompare(b.number, 'en-GB', { numeric: true, sensitivity: 'base' })
    default:       return a[key].localeCompare(b[key])
  }
}

function SortIcon({ dir }: { dir?: SortDir }) {
  return (
    <svg className={`h-3.5 w-3.5 ${dir ? 'text-navy-600' : 'text-gray-300 group-hover:text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
      {dir === 'asc' && <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />}
      {dir === 'desc' && <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />}
      {!dir && <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />}
    </svg>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-navy-50 text-xs font-medium text-navy-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-navy-100"
      >
        ×
      </button>
    </span>
  )
}

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.list,
  })

  const navigate = useNavigate()

  // Track the sticky filters block's height (chips can wrap or appear) so the table header sits right below it
  const stickyRef = useRef<HTMLDivElement>(null)
  const [stickyHeight, setStickyHeight] = useState(0)
  useLayoutEffect(() => {
    const el = stickyRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setStickyHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Filters and sort live in the URL so they survive a trip to an invoice and back
  const [params, setParams] = useSearchParams()
  const q       = params.get('q') ?? ''
  const statusParam = params.get('status') ?? ''
  const statuses = useMemo(() => statusParam.split(',').filter(Boolean) as InvoiceStatus[], [statusParam])
  const client  = params.get('client') ?? ''
  const period  = params.get('issued') ?? ''
  const sortParam = params.get('sort') as SortKey | null
  const sortKey: SortKey = sortParam && columns.some((c) => c.sortKey === sortParam) ? sortParam : 'issueDate'
  const sortDir = (params.get('dir') as SortDir | null) ?? 'desc'

  function setParam(updates: Record<string, string>) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })
  }

  function toggleSort(key: SortKey) {
    // First click on a new column: invoice no. ascending, dates/amounts newest/largest first
    const firstDir: SortDir = key === 'number' ? 'asc' : 'desc'
    setParam({ sort: key, dir: key === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : firstDir })
  }

  const clientOptions = useMemo(
    () => [...new Set((invoices ?? []).map((i) => i.clientName))].sort().map((name) => ({ value: name, label: name })),
    [invoices],
  )

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (invoices ?? [])
      .filter((inv) =>
        !term ||
        inv.number.toLowerCase().includes(term) ||
        inv.clientName.toLowerCase().includes(term) ||
        STATUS_LABELS[inv.status].toLowerCase().includes(term),
      )
      .filter((inv) => statuses.length === 0 || statuses.includes(inv.status))
      .filter((inv) => !client || inv.clientName === client)
      .filter((inv) => issuedWithin(inv.issueDate, period))
      .sort((a, b) => compare(a, b, sortKey) * (sortDir === 'asc' ? 1 : -1))
  }, [invoices, q, statuses, client, period, sortKey, sortDir])

  const setStatuses = (next: InvoiceStatus[]) => setParam({ status: next.join(',') })
  const hasFilters = !!(q || statuses.length || client || period)
  const clearFilters = () => setParam({ q: '', status: '', client: '', issued: '' })

  return (
    <div>
      {/* From md up, title, search and filters stick under the top bar; the negative margin cancels main's top
          padding so rows can't peek above. On phones they scroll away to leave room for the list. */}
      <div ref={stickyRef} className="md:sticky md:top-14 z-20 -mt-6 pt-6 lg:-mt-8 lg:pt-8 pb-3 bg-[#F5F7FA]">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-[28px] sm:text-[34px] leading-tight font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {visible.length} total
              {hasFilters && <span className="text-gray-400"> · filtered from {invoices?.length ?? 0}</span>}
            </p>
          </div>
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
  
        {!!invoices?.length && (
          <>
            {/* Search + filters (all combine) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative basis-full sm:basis-auto sm:flex-1 sm:min-w-[220px]">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setParam({ q: e.target.value })}
                  placeholder="Search..."
                  aria-label="Search invoices"
                  className="field pl-9 pr-3 py-2 text-sm bg-white ring-1 ring-black/[0.06]"
                />
              </div>
              <MultiSelect
                className="flex-1 min-w-[9rem] sm:flex-none sm:w-48"
                aria-label="Filter by status"
                placeholder="All statuses"
                pluralLabel="statuses"
                value={statuses}
                onChange={setStatuses}
                options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              />
              <Select
                className="flex-1 min-w-[9rem] sm:flex-none sm:w-48"
                aria-label="Filter by client"
                value={client}
                onChange={(v) => setParam({ client: v })}
                options={[{ value: '', label: 'All clients' }, ...clientOptions]}
              />
              <Select
                className="flex-1 min-w-[9rem] sm:flex-none sm:w-36"
                aria-label="Filter by issue date"
                value={period}
                onChange={(v) => setParam({ issued: v })}
                options={PERIODS}
              />
            </div>
  
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {q && <FilterChip label={`“${q}”`} onRemove={() => setParam({ q: '' })} />}
                {statuses.map((s) => (
                  <FilterChip key={s} label={STATUS_LABELS[s]} onRemove={() => setStatuses(statuses.filter((x) => x !== s))} />
                ))}
                {client && <FilterChip label={client} onRemove={() => setParam({ client: '' })} />}
                {period && <FilterChip label={PERIODS.find((p) => p.value === period)?.label ?? period} onRemove={() => setParam({ issued: '' })} />}
                <button type="button" onClick={clearFilters} className="text-xs font-medium text-gray-500 hover:text-gray-800">
                  Clear all
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
        </div>
      ) : invoices && invoices.length > 0 ? (
        // overflow-clip (not hidden) rounds the header's corners without creating a scroll container,
        // so the header row still sticks and its square corners leave no gaps for rows to peek through
        <div className="bg-white border border-gray-200 rounded-xl overflow-clip">
          {/* Phones: one tappable card per invoice instead of a squeezed table */}
          <ul className="md:hidden divide-y divide-gray-100">
            {visible.map((inv) => (
              <li key={inv.id}>
                <Link
                  to={`/invoices/${inv.id}`}
                  className="block px-4 py-3 active:bg-navy-50/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                      <p className="text-sm text-gray-600 truncate">{inv.clientName}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {formatMoney(inv.total, inv.currency)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">Due {formatDate(inv.dueDate)}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <table className="hidden md:table min-w-full">
            {/* Pins directly under the sticky filters block, whatever its current height */}
            <thead className="sticky z-10" style={{ top: TOP_BAR_HEIGHT + stickyHeight }}>
              <tr>
                {columns.map(({ label, sortKey: key }) => {
                  const active = !!key && key === sortKey
                  return (
                    <th
                      key={label}
                      aria-sort={key ? (active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                      className="bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide shadow-[inset_0_-1px_0] shadow-gray-200"
                    >
                      {key ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className={`group inline-flex items-center gap-1 uppercase tracking-wide active:scale-100 ${active ? 'text-navy-700' : 'hover:text-gray-700'}`}
                        >
                          {label}
                          <SortIcon dir={active ? sortDir : undefined} />
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((inv) => (
                <tr
                  key={inv.id}
                  tabIndex={0}
                  aria-label={`Open invoice ${inv.number}`}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/invoices/${inv.id}`)}
                  className="cursor-pointer hover:bg-navy-50/60 focus-visible:outline-none focus-visible:bg-navy-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{inv.clientName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {formatMoney(inv.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div className="text-center py-14">
              <p className="text-gray-500 text-sm">No invoices match your filters.</p>
              <button type="button" onClick={clearFilters} className="mt-2 text-sm text-brand-600 font-medium hover:text-brand-700">
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-500 text-sm">No invoices yet.</p>
          <Link
            to="/invoices/new"
            className="mt-3 inline-block text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            Create your first invoice →
          </Link>
        </div>
      )}
    </div>
  )
}
