import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mfaApi } from '../api/mfa'

type Step = 'idle' | 'scan' | 'confirm' | 'backup-codes' | 'done'

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['scan', 'confirm', 'backup-codes']
  const labels = ['Scan QR', 'Verify', 'Save codes']
  const idx = steps.indexOf(current)
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold
            ${i <= idx ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i <= idx ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
            {labels[i]}
          </span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  )
}

export default function MfaSetupPage() {
  const qc = useQueryClient()
  const [step, setStep]               = useState<Step>('idle')
  const [confirmCode, setConfirmCode] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')
  const [copied, setCopied]           = useState(false)

  const { data: status } = useQuery({
    queryKey: ['mfa-status'],
    queryFn:  mfaApi.status,
  })

  const { data: enrolData, mutate: beginEnrol, isPending: enrolling } = useMutation({
    mutationFn: mfaApi.beginEnrol,
    onSuccess:  () => setStep('scan'),
  })

  const { mutate: confirmEnrol, isPending: confirming } = useMutation({
    mutationFn: () => mfaApi.confirmEnrol(parseInt(confirmCode)),
    onSuccess: (codes) => {
      setBackupCodes(codes)
      setStep('backup-codes')
      qc.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: () => {
      setConfirmError('Invalid code — try again.')
      setConfirmCode('')
    },
  })

  const { mutate: disable, isPending: disabling } = useMutation({
    mutationFn: () => mfaApi.disable(parseInt(disableCode)),
    onSuccess: () => {
      setDisableCode('')
      setDisableError('')
      qc.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: () => setDisableError('Invalid code — try again.'),
  })

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Disabled state (MFA already enabled) ────────────────────────────────
  if (status?.mfaEnabled && step !== 'backup-codes') {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-[34px] leading-tight font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 mt-1">Your account is protected with TOTP MFA.</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">MFA is enabled</p>
            <p className="text-xs text-green-600">Your account requires a TOTP code at every login.</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Disable MFA</h2>
          <p className="text-xs text-gray-500 mb-4">
            Enter your current authenticator code to disable two-factor authentication.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              className="flex-1 field px-3 py-2 text-sm font-mono tracking-widest"
            />
            <button
              onClick={() => disable()}
              disabled={disabling || disableCode.length < 6}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {disabling ? 'Disabling…' : 'Disable'}
            </button>
          </div>
          {disableError && <p className="mt-2 text-xs text-red-600">{disableError}</p>}
        </div>
      </div>
    )
  }

  // ── Step: idle (not yet enrolled) ────────────────────────────────────────
  if (step === 'idle') {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-[34px] leading-tight font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            {[
              { icon: '📱', title: 'Get an authenticator app', body: 'Install Google Authenticator, Authy, or 1Password on your phone.' },
              { icon: '🔍', title: 'Scan the QR code',        body: 'We\'ll show you a QR code to link your account.' },
              { icon: '✅', title: 'Verify the code',          body: 'Enter the 6-digit code from the app to confirm setup.' },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex-1 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-xs font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500 mt-1">{body}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => beginEnrol()}
            disabled={enrolling}
            className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {enrolling ? 'Generating QR code…' : 'Set up MFA'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: scan QR code ───────────────────────────────────────────────────
  if (step === 'scan' && enrolData) {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-[34px] leading-tight font-bold text-gray-900">Set up MFA</h1>
        <StepIndicator current="scan" />

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <p className="text-sm text-gray-600">
            Scan this QR code with your authenticator app. If you can't scan it,
            enter the key manually.
          </p>

          <div className="flex justify-center">
            <img src={enrolData.qrCodeBase64} alt="MFA QR code" className="w-48 h-48 rounded-lg border border-gray-200" />
          </div>

          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Manual entry key</p>
            <p className="text-sm font-mono font-medium text-gray-900 break-all tracking-wider">
              {enrolData.secret}
            </p>
          </div>

          <button
            onClick={() => setStep('confirm')}
            className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            I've scanned it →
          </button>
        </div>
      </div>
    )
  }

  // ── Step: confirm with TOTP code ─────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-[34px] leading-tight font-bold text-gray-900">Set up MFA</h1>
        <StepIndicator current="confirm" />

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code shown in your authenticator app to confirm the setup.
          </p>

          {confirmError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {confirmError}
            </div>
          )}

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000 000"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value.replace(/\s/g, ''))}
            className="block w-full px-4 py-3 text-center text-2xl font-mono tracking-widest field"
            autoFocus
          />

          <div className="flex gap-3">
            <button
              onClick={() => setStep('scan')}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => confirmEnrol()}
              disabled={confirming || confirmCode.length < 6}
              className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {confirming ? 'Verifying…' : 'Enable MFA'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step: show backup codes ──────────────────────────────────────────────
  if (step === 'backup-codes') {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-[34px] leading-tight font-bold text-gray-900">Set up MFA</h1>
        <StepIndicator current="backup-codes" />

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Save these backup codes now.</span> They're shown only once and can be used
          if you lose access to your authenticator app. Each code works once.
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <div key={code} className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-sm text-gray-800 text-center tracking-widest">
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyBackupCodes}
              className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy all'}
            </button>
            <button
              onClick={() => setStep('done')}
              className="flex-1 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              Done →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step: done ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">MFA is now active</h2>
        <p className="text-sm text-gray-500">
          Your account is secured. You'll be asked for a code from your
          authenticator app each time you log in.
        </p>
      </div>
    </div>
  )
}
