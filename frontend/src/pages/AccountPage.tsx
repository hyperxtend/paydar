import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { mfaApi } from '../api/mfa'

export default function AccountPage() {
  const { user } = useAuth()
  const { data: mfaStatus } = useQuery({
    queryKey: ['mfa-status'],
    queryFn:  mfaApi.status,
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[34px] leading-tight font-bold text-gray-900">Account</h1>
        <p className="text-sm text-gray-500 mt-1">Your profile and security settings</p>
      </div>

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
              {user?.role}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">Organisation</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{user?.organisationName}</p>
        </div>
      </div>

      {/* MFA card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Two-Factor Authentication</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {mfaStatus?.mfaEnabled
                ? 'MFA is enabled — your account requires a code at each login.'
                : 'Add an extra layer of security to your account.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mfaStatus?.mfaEnabled ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Enabled
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Disabled
              </span>
            )}
            <Link
              to="/account/mfa"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
            >
              {mfaStatus?.mfaEnabled ? 'Manage' : 'Set up'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
