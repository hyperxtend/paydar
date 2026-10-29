import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '../api/payments'
import { PAYMENT_METHOD_LABELS } from '../types/payment'
import type { PaymentMethod } from '../types/payment'

const METHODS: PaymentMethod[] = ['BANK_TRANSFER', 'CARD', 'CASH', 'CHEQUE', 'OTHER']

const schema = z.object({
  amount:        z.coerce.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1),
  reference:     z.string().optional(),
  notes:         z.string().optional(),
  paidAt:        z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  invoiceId:  string
  balanceDue: number
  currency:   string
  onClose:    () => void
}

export function RecordPaymentModal({ invoiceId, balanceDue, currency, onClose }: Props) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: balanceDue,
      paymentMethod: 'BANK_TRANSFER',
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) =>
      paymentsApi.record(invoiceId, {
        amount:        data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        reference:     data.reference || undefined,
        notes:         data.notes || undefined,
        paidAt:        data.paidAt ? new Date(data.paidAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Balance due: <span className="font-medium text-gray-700">{currency} {balanceDue.toFixed(2)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit((d) => mutate(d))} className="px-6 py-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ({currency})
            </label>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              min="0.01"
              className="w-full field px-3 py-2 text-sm"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
            <select
              {...register('paymentMethod')}
              className="w-full field px-3 py-2 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('reference')}
              placeholder="e.g. bank ref, cheque number"
              className="w-full field px-3 py-2 text-sm"
            />
          </div>

          {/* Payment date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment date <span className="text-gray-400 font-normal">(defaults to today)</span>
            </label>
            <input
              {...register('paidAt')}
              type="datetime-local"
              className="w-full field px-3 py-2 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full field px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Recording…' : 'Record payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
