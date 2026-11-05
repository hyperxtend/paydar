import { useId, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clientsApi } from '../api/clients'
import type { Client } from '../types/client'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const schema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Invalid email'),
  phone:   z.string().optional(),
  address: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function ClientForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  // The add form and an edit form can be open at once, so ids must be unique per instance
  const id = useId()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label htmlFor={`${id}-name`} className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input id={`${id}-name`} className="block w-full px-3 py-2 field text-sm" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input id={`${id}-email`} type="email" className="block w-full px-3 py-2 field text-sm" {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="block text-sm font-medium text-gray-700 mb-1">
          Phone <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input id={`${id}-phone`} type="tel" className="block w-full px-3 py-2 field text-sm" {...register('phone')} />
      </div>
      <div>
        <label htmlFor={`${id}-address`} className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea id={`${id}-address`} rows={2} className="block w-full px-3 py-2 field text-sm resize-none" {...register('address')} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ClientsPage() {
  const [adding, setAdding]       = useState(false)
  const [editing, setEditing]     = useState<Client | null>(null)
  const [deleting, setDeleting]   = useState<Client | null>(null)
  const qc = useQueryClient()

  const { data: clients, isLoading } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list })

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setAdding(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => clientsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setDeleting(null) },
  })

  const cancelDelete = () => { setDeleting(null); deleteMutation.reset() }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sticks under the top bar; the negative margin cancels main's top padding so cards can't peek above */}
      <div className="sticky top-14 z-20 -mt-6 pt-6 lg:-mt-8 lg:pt-8 pb-4 mb-2 bg-[#F5F7FA] flex items-center justify-between gap-3">
        <h1 className="text-[28px] sm:text-[34px] leading-tight font-bold text-gray-900">Clients</h1>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add client
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">New client</p>
          <ClientForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setAdding(false)}
            isSubmitting={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" /></div>
      ) : clients && clients.length > 0 ? (
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="bg-white border border-gray-200 rounded-xl p-5">
              {editing?.id === client.id ? (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-3">Edit client</p>
                  <ClientForm
                    defaultValues={{ name: client.name, email: client.email, phone: client.phone, address: client.address }}
                    onSubmit={(data) => updateMutation.mutate({ id: client.id, data })}
                    onCancel={() => setEditing(null)}
                    isSubmitting={updateMutation.isPending}
                  />
                </>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 break-words">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-600">{client.email}</p>
                    {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
                    {client.address && <p className="text-sm text-gray-400">{client.address}</p>}
                  </div>
                  <div className="flex flex-shrink-0 gap-1 -mr-2 -mt-1">
                    <button
                      onClick={() => setEditing(client)}
                      aria-label={`Edit ${client.name}`}
                      title="Edit"
                      className="p-2 rounded-lg text-navy-500 hover:text-navy-700 hover:bg-navy-50 transition-colors"
                    >
                      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleting(client)}
                      aria-label={`Delete ${client.name}`}
                      title="Delete"
                      className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-500 text-sm">No clients yet.</p>
          <button onClick={() => setAdding(true)} className="mt-3 text-sm text-brand-600 font-medium hover:text-brand-700">Add your first client →</button>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete client?"
          message={<><span className="font-medium text-gray-900">{deleting.name}</span> will be permanently removed. This can't be undone.</>}
          confirmLabel="Delete client"
          pendingLabel="Deleting…"
          isPending={deleteMutation.isPending}
          error={deleteMutation.isError ? "Couldn't delete this client. Please try again." : null}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={cancelDelete}
        />
      )}
    </div>
  )
}
