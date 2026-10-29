import type { ReactNode } from 'react'
import { Link as RouterLink, useMatch } from 'react-router-dom'
import { Box, Button, Paper, Typography } from '@mui/material'
import { colors } from '../../theme'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

const tabs = [
  { label: 'Login', to: '/login' },
  { label: 'Register', to: '/login/register' },
]

/**
 * Stacks every child in the same grid cell so the container is always as tall
 * as the tallest one; inactive layers are hidden (and removed from tab order
 * and the accessibility tree via visibility: hidden).
 */
function Layers({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid' }}>{children}</Box>
}

function Layer({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <Box sx={{ gridArea: '1 / 1', minWidth: 0, visibility: active ? 'visible' : 'hidden' }}>
      {children}
    </Box>
  )
}

/** Radar mark + two-tone "Paydar" (the "dar" picks up the radar's blip colour). */
function Wordmark() {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
      <Box component="img" src="/radar-logo.svg" alt="" sx={{ width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 }, display: 'block' }} />
      <Typography
        component="span"
        sx={{
          fontWeight: 800,
          fontSize: { xs: '2.25rem', sm: '2.625rem' },
          lineHeight: 1,
          letterSpacing: '-0.045em',
          color: colors.midnight,
        }}
      >
        Pay<Box component="span" sx={{ color: colors.lipstick }}>dar</Box>
      </Typography>
    </Box>
  )
}

const headings = {
  login: { title: 'Welcome back', subtitle: 'Sign in to keep an eye on your invoices' },
  register: { title: 'Create your account', subtitle: 'Set up your organisation in under a minute' },
}

export default function AuthLayout() {
  const isRegister = !!useMatch('/login/register')

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        // Brand-colour glows tint the doodle tile, all over a cool off-white base
        background: [
          'radial-gradient(700px 500px at 0% 0%, rgba(184, 0, 71, 0.16), transparent 70%)',
          'radial-gradient(700px 500px at 100% 100%, rgba(223, 233, 102, 0.30), transparent 70%)',
          'radial-gradient(900px 600px at 100% 0%, rgba(0, 45, 98, 0.12), transparent 70%)',
          'url(/auth-pattern.svg) 0 0 / 400px 400px repeat',
          '#F5F7FA',
        ].join(', '),
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          // Frosted card so the colour behind bleeds through softly
          bgcolor: 'rgba(255, 255, 255, 0.86)',
          backdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 1px 2px rgba(0, 26, 61, 0.06), 0 24px 56px rgba(0, 26, 61, 0.14)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Box component="h1" aria-label="Paydar" sx={{ m: 0 }}>
            <Wordmark />
          </Box>

          <Box sx={{ mt: 3, width: '100%' }}>
            <Layers>
              {(['login', 'register'] as const).map((key) => (
                <Layer key={key} active={(key === 'register') === isRegister}>
                  <Typography
                    component="h2"
                    sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2, letterSpacing: '-0.03em', color: 'text.primary' }}
                  >
                    {headings[key].title}
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', fontWeight: 500, letterSpacing: '-0.01em', color: 'text.secondary' }}>
                    {headings[key].subtitle}
                  </Typography>
                </Layer>
              ))}
            </Layers>
          </Box>
        </Box>

        {/* Login / Register segmented control */}
        <Box
          component="nav"
          aria-label="Authentication"
          sx={{
            mt: 3.5,
            p: 0.5,
            display: 'flex',
            gap: 0.5,
            borderRadius: '12px',
            bgcolor: '#EEF1F5',
          }}
        >
          {tabs.map((tab) => {
            const active = (tab.to === '/login/register') === isRegister
            return (
              <Button
                key={tab.to}
                fullWidth
                component={RouterLink}
                to={tab.to}
                replace
                aria-current={active ? 'page' : undefined}
                sx={{
                  py: 1,
                  borderRadius: '9px',
                  color: active ? 'text.primary' : 'text.secondary',
                  bgcolor: active ? colors.white : 'transparent',
                  boxShadow: active ? '0 1px 3px rgba(0, 26, 61, 0.12)' : 'none',
                  '&:hover': { bgcolor: active ? colors.white : 'rgba(0, 26, 61, 0.04)' },
                }}
              >
                {tab.label}
              </Button>
            )
          })}
        </Box>

        {/* Both forms stay mounted so the card keeps the same height across tabs */}
        <Layers>
          <Layer active={!isRegister}>
            <LoginForm />
          </Layer>
          <Layer active={isRegister}>
            <RegisterForm />
          </Layer>
        </Layers>
      </Paper>
    </Box>
  )
}
