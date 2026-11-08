import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import { Alert, Box, Button, InputAdornment, TextField } from '@mui/material'
import MailOutlineIcon from '@mui/icons-material/MailOutlined'
import PasswordField from './PasswordField'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const { ref: emailRef, ...emailField } = register('email')
  const { ref: passwordRef, ...passwordField } = register('password')

  const onSubmit = async (data: LoginFormData) => {
    setServerError('')
    try {
      const { mfaRequired } = await login(data)
      navigate(mfaRequired ? '/mfa-verify' : '/dashboard')
    } catch {
      setServerError('Invalid email or password. Please try again.')
    }
  }

  return (
    <>
      {serverError && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {serverError}
        </Alert>
      )}

      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        sx={{ mt: 3.5, display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <TextField
          id="login-email"
          type="email"
          label="Email Address"
          autoComplete="email"
          placeholder="you@company.com"
          fullWidth
          inputRef={emailRef}
          {...emailField}
          error={!!errors.email}
          helperText={errors.email?.message}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineIcon />
                </InputAdornment>
              ),
            },
          }}
        />

        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          fullWidth
          inputRef={passwordRef}
          {...passwordField}
          error={!!errors.password}
          helperText={errors.password?.message}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          sx={{ mt: 1, py: 1.4, borderRadius: '12px', fontSize: '0.975rem' }}
        >
          {isSubmitting ? 'Signing in…' : 'Login'}
        </Button>
      </Box>
    </>
  )
}
