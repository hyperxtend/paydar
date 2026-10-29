import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api/reports'
import type { AgingRow } from '../types/reporting'

function fmt(amount: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function agingColour(days: number) {
  if (days === 0)  return 'text-blue-600 bg-blue-50'
  if (days <= 30)  return 'text-yellow-700 bg-yellow-50'
  if (days <= 60)  return 'text-orange-700 bg-orange-50'
  if (days <= 90)  return 'text-red-600 bg-red-50'
  return 'text-red-800 bg-red-100 font-semibold'
}

function AgingBucket({
  label,
  amount,
  accent,
}: {
  label: string
  amount: number
  accent: string
}) {
  return (
    <div className={`rounded-xl border-l-4 ${accent} bg-white border border-gray-200 p-4`}>
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-gray-900 tabular-nums">{fmt(amount)}</p>
    </div>
  )
}

function AgingTable({ rows }: { rows: AgingRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No outstanding invoices — great work!</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Invoice', 'Client', 'Days overdue', 'Balance due'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.invoiceId} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{row.invoiceNumber}</td>
              <td className="px-4 py-3 text-gray-600">{row.clientName}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agingColour(row.daysOverdue)}`}
                >
                  {row.daysOverdue === 0 ? 'Current' : `${row.daysOverdue} days`}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">
                {fmt(row.balanceDue, row.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsPage() {
  const { data: aging, isLoading } = useQuery({
    queryKey: ['aging'],
    queryFn:  reportsApi.aging,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[34px] leading-tight font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Accounts receivable aging and invoice export</p>
        </div>
        <button
          onClick={reportsApi.downloadCsv}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {isLoading || !aging ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : (
        <>
          {/* Aging buckets */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <AgingBucket label="Current"    amount={aging.current}    accent="border-l-blue-400" />
            <AgingBucket label="1–30 days"  amount={aging.days1to30}  accent="border-l-yellow-400" />
            <AgingBucket label="31–60 days" amount={aging.days31to60} accent="border-l-orange-400" />
            <AgingBucket label="61–90 days" amount={aging.days61to90} accent="border-l-red-400" />
            <AgingBucket label="90+ days"   amount={aging.days90plus} accent="border-l-red-700" />
          </div>

          {/* Aging table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Outstanding invoices</h2>
              <span className="text-xs text-gray-500">{aging.rows.length} record{aging.rows.length !== 1 ? 's' : ''}</span>
            </div>
            <AgingTable rows={aging.rows} />
          </div>
        </>
      )}
    </div>
  )
}
