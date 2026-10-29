/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Lipstick
        brand: {
          50:  '#FDF0F5',
          100: '#FAD9E6',
          200: '#F4B0CB',
          500: '#CC1A5E',
          600: '#B80047',
          700: '#8A0035',
        },
        navy: {
          50:  '#EEF3FA',
          100: '#D6E2F2',
          500: '#1F4A80',
          600: '#002D62',
          700: '#001A3D',
        },
        confetti: '#DFE966',
        // iOS-style system greys, with a hint of navy in the darker steps
        gray: {
          50:  '#F2F2F7',
          100: '#EBEBF0',
          200: '#E1E1E8',
          300: '#C7C7CE',
          400: '#9A9AA3',
          500: '#6E6E78',
          600: '#545461',
          700: '#3A3F4E',
          800: '#1F2638',
          900: '#0B1B33',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['Redaction', 'Georgia', '"Times New Roman"', 'serif'],
      },
      borderRadius: {
        lg:    '0.75rem',
        xl:    '1rem',
        '2xl': '1.375rem',
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(0, 26, 61, 0.05), 0 1px 3px rgba(0, 26, 61, 0.04)',
        card: '0 1px 2px rgba(0, 26, 61, 0.04), 0 6px 20px rgba(0, 26, 61, 0.06)',
        xl:   '0 24px 60px rgba(0, 26, 61, 0.18), 0 2px 8px rgba(0, 26, 61, 0.06)',
      },
    },
  },
  plugins: [],
}
