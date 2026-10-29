import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { publicApi } from '../api/public'
import { STATUS_LABELS, STATUS_COLOURS } from '../types/invoice'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['public-invoice', token],
    queryFn:  () => publicApi.getInvoice(token!),
    enabled:  !!token,
    retry:    false,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (isError || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-4">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invoice not found</h1>
          <p className="text-sm text-gray-500">
            This link may be invalid or the invoice may have been removed.
          </p>
        </div>
      </div>
    )
  }

  const isPaid    = invoice.status === 'PAID'
  const isPayable = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)
  const pdfUrl    = publicApi.downloadPdfUrl(token!)

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Brand header */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-indigo-600">Paydar</span>
          <a
            href={pdfUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </a>
        </div>

        {/* Invoice card */}
        <div className="card overflow-hidden">

          {/* Status banner */}
          <div className={`px-6 py-3 flex items-center justify-between border-b border-gray-100 ${isPaid ? 'bg-green-50' : ''}`}>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice from</p>
              <p className="font-semibold text-gray-900">{invoice.organisationName}</p>
            </div>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOURS[invoice.status]}`}>
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Header row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Bill to</p>
                <p className="font-medium text-gray-900">{invoice.clientName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Invoice #{invoice.number}</p>
                <p className="text-sm text-gray-600">Issued {formatDate(invoice.issueDate)}</p>
                <p className="text-sm text-gray-600">Due {formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            {/* Line items */}
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 text-left font-medium">Description</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-gray-800">{item.description}</td>
                    <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">{formatCurrency(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Amount paid</span>
                    <span>−{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-lg pt-1 border-t border-gray-200">
                    <span>Balance due</span>
                    <span>{formatCurrency(Math.max(0, invoice.balanceDue), invoice.currency)}</span>
                  </div>
                </>
              )}
            </div>

            {invoice.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* CTA footer */}
          {isPayable && invoice.balanceDue > 0 && (
            <div className="px-6 pb-6">
              {invoice.stripeCheckoutUrl ? (
                <a
                  href={invoice.stripeCheckoutUrl}
                  className="block w-full py-3 text-center rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
                >
                  Pay {formatCurrency(invoice.balanceDue, invoice.currency)} now
                </a>
              ) : (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-center">
                  <p className="text-sm text-gray-600">
                    To pay this invoice, please contact{' '}
                    <span className="font-medium text-gray-900">{invoice.organisationName}</span>.
                  </p>
                </div>
              )}
            </div>
          )}

          {isPaid && (
            <div className="px-6 pb-6">
              <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-800">This invoice has been paid in full. Thank you!</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Sent securely via Paydar
        </p>
      </div>
    </div>
  )
}
