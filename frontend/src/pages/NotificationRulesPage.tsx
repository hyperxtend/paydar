import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { notificationsApi } from '../api/notifications'
import { CHANNEL_LABELS } from '../types/notification'
import type { NotificationChannel, NotificationRule } from '../types/notification'

const CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP']

const ruleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  triggerDaysOffset: z.coerce.number().int('Must be a whole number'),
  channels: z.array(z.string()).min(1, 'Select at least one channel'),
  active: z.boolean(),
})

type RuleForm = z.infer<typeof ruleSchema>

function offsetLabel(offset: number): string {
  if (offset < 0) return `${Math.abs(offset)} day${Math.abs(offset) !== 1 ? 's' : ''} before due date`
  if (offset === 0) return 'On the due date'
  return `${offset} day${offset !== 1 ? 's' : ''} after due date (overdue)`
}

function RuleModal({
  rule,
  onClose,
}: {
  rule?: NotificationRule
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: rule?.name ?? '',
      triggerDaysOffset: rule?.triggerDaysOffset ?? 0,
      channels: rule?.channels ?? ['EMAIL'],
      active: rule?.active ?? true,
    },
  })

  const offsetValue = watch('triggerDaysOffset')

  const { mutate, isPending } = useMutation({
    mutationFn: (data: RuleForm) => {
      const payload = {
        name: data.name,
        triggerDaysOffset: data.triggerDaysOffset,
        channels: data.channels as NotificationChannel[],
        active: data.active,
      }
      return rule ? notificationsApi.updateRule(rule.id, payload) : notificationsApi.createRule(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {rule ? 'Edit Rule' : 'New Notification Rule'}
          </h2>
        </div>

        <form onSubmit={handleSubmit((d) => mutate(d))} className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule name</label>
            <input
              {...register('name')}
              placeholder="e.g. 3-day overdue reminder"
              className="w-full field px-3 py-2 text-sm"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Trigger offset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trigger timing
            </label>
            <input
              {...register('triggerDaysOffset')}
              type="number"
              className="w-full field px-3 py-2 text-sm"
            />
            <p className="mt-1.5 text-xs text-brand-600 font-medium">
              → {offsetLabel(Number(offsetValue))}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Negative = before due date · 0 = on due date · Positive = overdue reminder
            </p>
            {errors.triggerDaysOffset && (
              <p className="mt-1 text-xs text-red-500">{errors.triggerDaysOffset.message}</p>
            )}
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
            <Controller
              name="channels"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map((ch) => {
                    const checked = field.value.includes(ch)
                    return (
                      <label
                        key={ch}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => {
                            field.onChange(
                              checked ? field.value.filter((v) => v !== ch) : [...field.value, ch]
                            )
                          }}
                        />
                        <span
                          className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            checked ? 'bg-brand-600 border-brand-600' : 'border-gray-300'
                          }`}
                        >
                          {checked && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                              <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm">{CHANNEL_LABELS[ch]}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            />
            {errors.channels && <p className="mt-1 text-xs text-red-500">{errors.channels.message}</p>}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    field.value ? 'bg-brand-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      field.value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            />
            <span className="text-sm text-gray-700">Rule is active</span>
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
              {isPending ? 'Saving…' : rule ? 'Save changes' : 'Create rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: NotificationRule
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${rule.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{rule.name}</h3>
            {!rule.active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
          <p className="text-xs text-brand-600 font-medium mt-1">{offsetLabel(rule.triggerDaysOffset)}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {rule.channels.map((ch) => (
              <span key={ch} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {CHANNEL_LABELS[ch]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationRulesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationRule | undefined>()

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['notification-rules'],
    queryFn: notificationsApi.listRules,
  })

  const { mutate: deleteRule } = useMutation({
    mutationFn: notificationsApi.deleteRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-rules'] }),
  })

  function openCreate() { setEditing(undefined); setModalOpen(true) }
  function openEdit(rule: NotificationRule) { setEditing(rule); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(undefined) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[34px] leading-tight font-bold text-gray-900">Notification Rules</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automate when and how clients receive payment reminders
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Rule
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : rules.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">No rules yet</p>
          <p className="text-xs mt-1">Create your first rule to start sending automated reminders</p>
          <button
            onClick={openCreate}
            className="mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            + Create a rule
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => openEdit(rule)}
              onDelete={() => deleteRule(rule.id)}
            />
          ))}
        </div>
      )}

      {modalOpen && <RuleModal rule={editing} onClose={closeModal} />}
    </div>
  )
}
