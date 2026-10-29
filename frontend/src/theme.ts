import { createTheme } from '@mui/material/styles'

export const colors = {
  black: '#000000',
  darkBlue: '#002D62',
  midnight: '#001A3D',
  slateBlue: '#4A5D7A',
  lipstick: '#B80047',
  lipstickDark: '#8A0035',
  confetti: '#DFE966',
  white: '#FFFFFF',
  // Neutrals for fields, borders and icons
  border: '#D9DEE7',
  borderHover: '#B8C1D1',
  icon: '#8A96A8',
}

// Brand display face for headings (@font-face in index.css)
export const displayFont = '"Redaction", Georgia, "Times New Roman", serif'

const theme = createTheme({
  palette: {
    // Navy leads; lipstick is kept for small accents only
    primary: {
      main: colors.darkBlue,
      dark: colors.midnight,
      contrastText: colors.white,
    },
    secondary: {
      main: colors.lipstick,
      dark: colors.lipstickDark,
      contrastText: colors.white,
    },
    text: {
      primary: colors.midnight,
      secondary: colors.slateBlue,
    },
    background: {
      default: colors.white,
      paper: colors.white,
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.01em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          transition: 'transform 120ms ease, background-color 150ms ease, box-shadow 150ms ease',
          '&:active': { transform: 'scale(0.98)' },
          variants: [
            {
              props: { variant: 'contained', color: 'primary' },
              style: {
                boxShadow: '0 1px 2px rgba(0, 26, 61, 0.12)',
                '&:hover': { backgroundColor: colors.midnight, boxShadow: '0 4px 14px rgba(0, 26, 61, 0.22)' },
              },
            },
          ],
        },
      },
    },
    // Clean outlined fields: white fill, hairline border, soft navy ring on focus
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: colors.white,
          transition: 'box-shadow 150ms ease',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border, transition: 'border-color 150ms ease' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.borderHover },
          '&.Mui-focused': { boxShadow: '0 0 0 4px rgba(0, 45, 98, 0.10)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.darkBlue, borderWidth: 1 },
          '&.Mui-error.Mui-focused': { boxShadow: '0 0 0 4px rgba(211, 47, 47, 0.10)' },
        },
        // Slightly slimmer than MUI's 56px default (~46px tall)
        input: { paddingTop: 12, paddingBottom: 12, fontSize: '0.9375rem' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          // Re-centre the resting label to match the slimmer input
          '&.MuiInputLabel-outlined:not(.MuiInputLabel-shrink)': { transform: 'translate(14px, 12px) scale(1)' },
        },
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: { color: colors.icon, '& .MuiSvgIcon-root': { fontSize: 20 } },
      },
    },
  },
})

export default theme
