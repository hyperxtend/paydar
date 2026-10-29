import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clientsApi } from '../api/clients'
import type { Client } from '../types/client'

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <input placeholder="Name *" className="block w-full px-3 py-2 field text-sm" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <input placeholder="Email *" type="email" className="block w-full px-3 py-2 field text-sm" {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <input placeholder="Phone" className="block w-full px-3 py-2 field text-sm" {...register('phone')} />
      <textarea placeholder="Address" rows={2} className="block w-full px-3 py-2 field text-sm resize-none" {...register('address')} />
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[34px] leading-tight font-bold text-gray-900">Clients</h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
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
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-600">{client.email}</p>
                    {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
                    {client.address && <p className="text-sm text-gray-400">{client.address}</p>}
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => setEditing(client)} className="text-gray-500 hover:text-gray-800">Edit</button>
                    <button
                      onClick={() => { if (confirm(`Delete ${client.name}?`)) deleteMutation.mutate(client.id) }}
                      className="text-red-400 hover:text-red-600"
                    >
                      Delete
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
    </div>
  )
}
