import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { invoicesApi } from '../api/invoices'
import { paymentsApi } from '../api/payments'
import { PAYMENT_METHOD_LABELS } from '../types/payment'
import InvoiceStatusBadge from '../components/InvoiceStatusBadge'
import { RecordPaymentModal } from '../components/RecordPaymentModal'
import type { InvoiceStatus } from '../types/invoice'

function useShareLink(shareToken?: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!shareToken) return
    const url = `${window.location.origin}/invoice/${shareToken}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

const NEXT_ACTIONS: Partial<Record<InvoiceStatus, { label: string; status: InvoiceStatus }[]>> = {
  DRAFT:          [{ label: 'Mark as sent', status: 'SENT' }, { label: 'Void', status: 'VOID' }],
  SENT:           [{ label: 'Mark partly paid', status: 'PARTIALLY_PAID' }, { label: 'Void', status: 'VOID' }],
  PARTIALLY_PAID: [{ label: 'Void', status: 'VOID' }],
  OVERDUE:        [{ label: 'Void', status: 'VOID' }],
}

const PAYABLE_STATUSES: InvoiceStatus[] = ['SENT', 'PARTIALLY_PAID', 'OVERDUE']

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const paymentStatus = searchParams.get('payment') // 'success' | 'cancelled'

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id!),
    enabled: !!id,
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.listByInvoice(id!),
    enabled: !!id,
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: InvoiceStatus) => invoicesApi.updateStatus(id!, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice', id] }),
  })

  const { mutate: deleteInvoice } = useMutation({
    mutationFn: () => invoicesApi.delete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); navigate('/invoices') },
  })

  const { mutate: stripeCheckout, isPending: stripeLoading } = useMutation({
    mutationFn: () => paymentsApi.createStripeCheckout(id!),
    onSuccess: (data) => { window.location.href = data.checkoutUrl },
  })

  const { copied: linkCopied, copy: copyLink } = useShareLink(invoice?.shareToken)

  const downloadPdf = async () => {
    if (!invoice) return
    setPdfLoading(true)
    try {
      await invoicesApi.downloadPdf(id!, `invoice-${invoice.number}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }

  if (isLoading || !invoice) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" /></div>
  }

  const actions = NEXT_ACTIONS[invoice.status] ?? []
  const isPayable = PAYABLE_STATUSES.includes(invoice.status)
  const balanceDue = invoice.balanceDue ?? (invoice.total - (invoice.amountPaid ?? 0))

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/invoices" className="hover:text-gray-900">Invoices</Link>
        <span>/</span>
        <span className="text-gray-900">{invoice.number}</span>
      </div>

      {/* Payment feedback banner */}
      {paymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          Payment received — thank you! The invoice will be updated shortly.
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
          Payment was cancelled. No charges were made.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] leading-tight font-bold text-gray-900">{invoice.number}</h1>
          <div className="mt-1"><InvoiceStatusBadge status={invoice.status} /></div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {/* Status transition buttons */}
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => changeStatus(action.status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                action.status === 'VOID'
                  ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  : 'border-brand-600 text-brand-600 hover:bg-brand-50'
              }`}
            >
              {action.label}
            </button>
          ))}

          {/* Payment buttons */}
          {isPayable && balanceDue > 0 && (
            <>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Record payment
              </button>
              <button
                onClick={() => stripeCheckout()}
                disabled={stripeLoading}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {stripeLoading ? 'Redirecting…' : 'Pay with Stripe'}
              </button>
            </>
          )}

          {/* PDF download */}
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {pdfLoading ? 'Generating…' : 'PDF'}
          </button>

          {/* Share link */}
          <button
            onClick={copyLink}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            {linkCopied ? 'Copied!' : 'Share link'}
          </button>

          {invoice.status === 'DRAFT' && (
            <button
              onClick={() => { if (confirm('Delete this invoice?')) deleteInvoice() }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Invoice card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        {/* Header */}
        <div className="grid grid-cols-2 gap-6 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bill to</p>
            <p className="font-medium text-gray-900">{invoice.client.name}</p>
            <p className="text-sm text-gray-600">{invoice.client.email}</p>
            {invoice.client.phone && <p className="text-sm text-gray-500">{invoice.client.phone}</p>}
            {invoice.client.address && <p className="text-sm text-gray-500">{invoice.client.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dates</p>
            <p className="text-sm text-gray-700"><span className="text-gray-400">Issued </span>{formatDate(invoice.issueDate)}</p>
            <p className="text-sm text-gray-700"><span className="text-gray-400">Due </span>{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Line items */}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="pb-2 text-left">Description</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Price</th>
              <th className="pb-2 text-right">Tax</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 text-gray-800">{item.description}</td>
                <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2 text-right text-gray-600">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                <td className="py-2 text-right text-gray-500">{item.taxRate}%</td>
                <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Tax</span><span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span></div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-gray-600"><span>Discount</span><span>−{formatCurrency(invoice.discountAmount, invoice.currency)}</span></div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 text-base pt-2 border-t border-gray-200">
            <span>Total</span><span>{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>
          {(invoice.amountPaid ?? 0) > 0 && (
            <>
              <div className="flex justify-between text-green-600 text-sm">
                <span>Amount paid</span><span>−{formatCurrency(invoice.amountPaid ?? 0, invoice.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-200">
                <span>Balance due</span><span>{formatCurrency(Math.max(0, balanceDue), invoice.currency)}</span>
              </div>
            </>
          )}
        </div>

        {invoice.notes && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Payment history</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Method', 'Reference', 'Recorded by', 'Amount'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(p.paidAt))}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{PAYMENT_METHOD_LABELS[p.paymentMethod]}</td>
                  <td className="px-4 py-2.5 text-gray-500 truncate max-w-[140px]">{p.reference ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{p.recordedBy ?? 'Stripe'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          invoiceId={id!}
          balanceDue={balanceDue}
          currency={invoice.currency}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  )
}
