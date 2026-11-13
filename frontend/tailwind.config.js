/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDF9',
          100: '#E6F6F2',
          200: '#C2EBE1',
          300: '#8AD9C4',
          400: '#4EBDA4',
          500: '#20A88A', // Color Primario Oficial
          600: '#18856D', // Hover / Enfoque
          700: '#146B58',
          800: '#125647',
          900: '#0F473B',
          DEFAULT: '#20A88A'
        },
        ink: {
          DEFAULT: '#173B50',
          muted: '#64748B',
          light: '#F4F7F9',
          dark: '#142B3D'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#142B3D',
          card: '#FFFFFF',
          darkCard: '#1E3B50'
        },
        success: {
          DEFAULT: '#10B981',
          light: '#ECFDF5',
          dark: '#065F46'
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
          dark: '#92400E'
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEF2F2',
          dark: '#991B1B'
        },
        oportia: {
          petrol: '#173B50',
          jade: '#20A88A',
          coral: '#FF906F',
          mist: '#EDF3F5',
          deep: '#243F55',
          mint: '#8AD9C4',
          warm: '#F4C56A',
          slate: '#64748B',
          bgLight: '#F4F7F9',
          borderLight: '#DCE5EA',
          bgDark: '#142B3D',
          surfaceDark: '#1E3B50',
          borderDark: '#365368',
          textDarkSec: '#B7C9D6'
        },
        apple: {
          canvas: {
            light: '#F4F7F9',
            dark: '#142B3D'
          },
          text: {
            primary: {
              light: '#173B50',
              dark: '#F4F7F9'
            },
            secondary: {
              light: '#64748B',
              dark: '#B7C9D6'
            }
          },
          blue: '#173B50',
          darkBlue: '#20A88A',
          gray: '#EDF3F5',
          card: '#FFFFFF',
          darkBg: '#142B3D',
          darkCard: '#1E3B50',
          darkSecondary: '#243F55',
          border: 'rgba(23, 59, 80, 0.08)',
          darkBorder: 'rgba(255, 255, 255, 0.08)',
          green: '#20A88A',
          orange: '#FF906F',
          red: '#FF4D4D'
        }
      },
      fontFamily: {
        sans: [
          'Manrope',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        'apple-subtle': '0 2px 10px rgba(23, 59, 80, 0.04)',
        'apple-card': '0 4px 20px -2px rgba(23, 59, 80, 0.06)',
        'apple-glass': '0 8px 32px 0 rgba(23, 59, 80, 0.08)',
        'apple-dark-card': '0 8px 24px -4px rgba(10, 20, 30, 0.5)'
      }
    },
  },
  plugins: [],
}
