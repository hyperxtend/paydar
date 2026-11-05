import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title:         string
  message:       ReactNode
  confirmLabel:  string
  pendingLabel?: string
  isPending?:    boolean
  error?:        string | null
  onConfirm:     () => void
  onCancel:      () => void
}

// Destructive-action confirmation, styled like RecordPaymentModal
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pendingLabel,
  isPending = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isPending) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isPending, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => { if (!isPending) onCancel() }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1.5 text-sm text-gray-600">{message}</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            autoFocus
            className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
