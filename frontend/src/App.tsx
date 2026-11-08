import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Route-level code splitting: each page is fetched on first visit
const AppLayout = lazy(() => import('./components/layout/AppLayout'))
const AuthLayout = lazy(() => import('./components/auth/AuthLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'))
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'))
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const NotificationRulesPage = lazy(() => import('./pages/NotificationRulesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const MfaVerifyPage = lazy(() => import('./pages/MfaVerifyPage'))
const MfaSetupPage = lazy(() => import('./pages/MfaSetupPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const PublicInvoicePage = lazy(() => import('./pages/PublicInvoicePage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              {/* Public — login and register are tabs of one page (AuthLayout renders both forms) */}
              <Route path="/login" element={<AuthLayout />}>
                <Route index           element={null} />
                <Route path="register" element={null} />
              </Route>
              <Route path="/register"   element={<Navigate to="/login/register" replace />} />
              <Route path="/mfa-verify" element={<MfaVerifyPage />} />
              <Route path="/invoice/:token" element={<PublicInvoicePage />} />

              {/* Protected — inside sidebar layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard"        element={<DashboardPage />} />
                <Route path="/invoices"         element={<InvoicesPage />} />
                <Route path="/invoices/new"     element={<CreateInvoicePage />} />
                <Route path="/invoices/:id"     element={<InvoiceDetailPage />} />
                <Route path="/clients"             element={<ClientsPage />} />
                <Route path="/notifications"      element={<NotificationsPage />} />
                <Route path="/notification-rules" element={<NotificationRulesPage />} />
                <Route path="/reports"            element={<ReportsPage />} />
                <Route path="/account"           element={<AccountPage />} />
                <Route path="/account/mfa"       element={<MfaSetupPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
