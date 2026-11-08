import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState, type ReactNode } from 'react'
import { Alert, Box, Button, InputAdornment, TextField } from '@mui/material'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import MailOutlineIcon from '@mui/icons-material/MailOutlined'
import PasswordField from './PasswordField'

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organisationName: z.string().min(1, 'Organisation name is required'),
})

type RegisterFormData = z.infer<typeof registerSchema>

const startIcon = (icon: ReactNode) => ({
  input: { startAdornment: <InputAdornment position="start">{icon}</InputAdornment> },
})

export default function RegisterForm() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  // MUI TextField forwards its ref to the wrapper, so pass RHF's ref via inputRef
  const field = (name: keyof RegisterFormData) => {
    const { ref, ...rest } = register(name)
    return {
      ...rest,
      id: `register-${name}`,
      inputRef: ref,
      fullWidth: true,
      error: !!errors[name],
      helperText: errors[name]?.message,
    }
  }

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('')
    try {
      await registerUser(data)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(msg ?? 'Registration failed. Please try again.')
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, rowGap: 3, columnGap: 2 }}>
          <TextField
            label="First name"
            autoComplete="given-name"
            {...field('firstName')}
            slotProps={startIcon(<PersonOutlinedIcon />)}
          />
          <TextField label="Surname" autoComplete="family-name" {...field('lastName')} />
        </Box>

        <TextField
          label="Organisation name"
          autoComplete="organization"
          placeholder="Acme Ltd"
          {...field('organisationName')}
          slotProps={startIcon(<BusinessOutlinedIcon />)}
        />

        <TextField
          type="email"
          label="Work email"
          autoComplete="email"
          placeholder="you@company.com"
          {...field('email')}
          slotProps={startIcon(<MailOutlineIcon />)}
        />

        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          {...field('password')}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          sx={{ mt: 1, py: 1.4, borderRadius: '12px', fontSize: '0.975rem' }}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Box>
    </>
  )
}
