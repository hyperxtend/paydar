import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { mfaApi } from '../api/mfa'

export default function MfaVerifyPage() {
  const { mfaChallenge, completeMfa, logout } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // If user lands here without a pending challenge, send them back to login
    if (!mfaChallenge) navigate('/login', { replace: true })
    inputRef.current?.focus()
  }, [mfaChallenge, navigate])

  const { mutate, isPending } = useMutation({
    mutationFn: () => mfaApi.verify(mfaChallenge!.mfaPendingToken, code),
    onSuccess: (data) => {
      completeMfa(data.user as never, data.accessToken, data.refreshToken)
      navigate('/dashboard', { replace: true })
    },
    onError: () => {
      setError('Invalid code — please try again.')
      setCode('')
      inputRef.current?.focus()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 6) return
    setError('')
    mutate()
  }

  const handleCancel = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full card p-8 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-brand-50 flex items-center justify-center">
            <svg className="h-7 w-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the 6-digit code from your authenticator app, or one of your backup codes.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="000 000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
            className="block w-full px-4 py-3 text-center text-xl font-mono tracking-widest field"
          />

          <button
            type="submit"
            disabled={isPending || code.trim().length < 6}
            className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <button
          onClick={handleCancel}
          className="w-full text-sm text-gray-400 hover:text-gray-600 text-center"
        >
          ← Back to login
        </button>
      </div>
    </div>
  )
}
