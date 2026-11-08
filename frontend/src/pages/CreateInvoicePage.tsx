import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '../api/clients'
import { invoicesApi } from '../api/invoices'
import Select from '../components/ui/Select'
import { CURRENCIES, DEFAULT_CURRENCY, currencySymbol, formatMoney } from '../lib/currency'

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity:    z.coerce.number().positive('Must be > 0'),
  unitPrice:   z.coerce.number().min(0, 'Cannot be negative'),
  taxRate:     z.coerce.number().min(0).max(100).optional(),
})

const schema = z.object({
  clientId:       z.string().uuid('Select a client'),
  issueDate:      z.string().min(1, 'Required'),
  dueDate:        z.string().min(1, 'Required'),
  currency:       z.string().default(DEFAULT_CURRENCY),
  discountAmount: z.coerce.number().min(0).optional(),
  notes:          z.string().optional(),
  items:          z.array(itemSchema).min(1, 'Add at least one item'),
})

type FormData = z.infer<typeof schema>

function calcLineAmount(qty: number, price: number) {
  return isNaN(qty) || isNaN(price) ? 0 : qty * price
}

export default function CreateInvoicePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list })

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: DEFAULT_CURRENCY,
      items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedItems    = useWatch({ control, name: 'items' })
  const watchedDiscount = useWatch({ control, name: 'discountAmount' })
  const watchedCurrency = useWatch({ control, name: 'currency' })

  const subtotal = (watchedItems ?? []).reduce((sum, item) => {
    return sum + calcLineAmount(Number(item.quantity), Number(item.unitPrice))
  }, 0)

  const tax = (watchedItems ?? []).reduce((sum, item) => {
    const line = calcLineAmount(Number(item.quantity), Number(item.unitPrice))
    return sum + line * (Number(item.taxRate ?? 0) / 100)
  }, 0)

  const total = subtotal + tax - (Number(watchedDiscount) || 0)

  const { mutateAsync } = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const onSubmit = async (data: FormData) => {
    const invoice = await mutateAsync(data)
    navigate(`/invoices/${invoice.id}`)
  }

  const fmt = (n: number) => formatMoney(n, watchedCurrency)
  const symbol = currencySymbol(watchedCurrency)

  return (
    <div className="lg:px-8 lg:py-8 max-w-3xl">
      <h1 className="text-[28px] sm:text-[34px] leading-tight font-bold text-gray-900 mb-6">New invoice</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Client + dates */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Invoice details</h2>

          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  id="clientId"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Select a client…"
                  options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
                />
              )}
            />
            {errors.clientId && <p className="mt-1 text-xs text-red-600">{errors.clientId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue date</label>
              <input type="date" className="block w-full px-3 py-2 field text-sm" {...register('issueDate')} />
              {errors.issueDate && <p className="mt-1 text-xs text-red-600">{errors.issueDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <input type="date" className="block w-full px-3 py-2 field text-sm" {...register('dueDate')} />
              {errors.dueDate && <p className="mt-1 text-xs text-red-600">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select
                    id="currency"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={CURRENCIES.map((c) => ({ value: c.code, hint: c.symbol, label: `${c.name} (${c.code})` }))}
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount ({symbol})</label>
              <input type="number" step="0.01" min="0" inputMode="decimal" placeholder="0.00" className="block w-full px-3 py-2 field text-sm" {...register('discountAmount')} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Line items</h2>

          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Price ({symbol})</span>
              <span className="col-span-2 text-right">Tax %</span>
            </div>

            {/* Phones: description on its own row, then qty / price / tax with their own mini labels */}
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end sm:items-start pb-3 border-b border-gray-100 last:border-0 sm:pb-0 sm:border-0">
                <div className="col-span-12 sm:col-span-5">
                  <input
                    placeholder="Description"
                    aria-label="Description"
                    className="block w-full px-3 py-2 field text-sm"
                    {...register(`items.${i}.description`)}
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <span className="sm:hidden block text-[11px] font-medium text-gray-500 mb-0.5">Qty</span>
                  <input
                    type="number" step="0.01" min="0.01" inputMode="decimal"
                    aria-label="Quantity"
                    className="block w-full px-3 py-2 field text-sm text-right"
                    {...register(`items.${i}.quantity`)}
                  />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <span className="sm:hidden block text-[11px] font-medium text-gray-500 mb-0.5">Price ({symbol})</span>
                  <input
                    type="number" step="0.01" min="0" inputMode="decimal"
                    aria-label="Unit price"
                    className="block w-full px-3 py-2 field text-sm text-right"
                    {...register(`items.${i}.unitPrice`)}
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <span className="sm:hidden block text-[11px] font-medium text-gray-500 mb-0.5">Tax %</span>
                  <input
                    type="number" step="0.1" min="0" max="100" inputMode="decimal"
                    aria-label="Tax rate"
                    className="block w-full px-3 py-2 field text-sm text-right"
                    {...register(`items.${i}.taxRate`)}
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center pb-2 sm:pb-0 sm:pt-2">
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRate: 0 })}
            className="mt-3 text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            + Add line item
          </button>

          {/* Totals */}
          <div className="mt-5 border-t border-gray-100 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span><span>{fmt(tax)}</span>
            </div>
            {(Number(watchedDiscount) || 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span><span>−{fmt(Number(watchedDiscount))}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            rows={3}
            placeholder="Payment terms, bank details, or any other notes for the client…"
            className="block w-full px-3 py-2 field text-sm resize-none"
            {...register('notes')}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
