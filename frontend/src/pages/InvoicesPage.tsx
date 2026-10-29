import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { invoicesApi } from '../api/invoices'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.list,
  })

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[34px] leading-tight font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices?.length ?? 0} total</p>
        </div>
        <Link
          to="/invoices/new"
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          New invoice
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
        </div>
      ) : invoices && invoices.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                {['Number', 'Client', 'Issued', 'Due', 'Amount', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{inv.clientName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
