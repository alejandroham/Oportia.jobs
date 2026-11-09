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
        apple: {
          canvas: {
            light: '#FBFBFD',
            dark: '#000000'
          },
          text: {
            primary: {
              light: '#1D1D1F',
              dark: '#F5F5F7'
            },
            secondary: {
              light: '#86868B',
              dark: '#A1A1A6'
            }
          },
          blue: '#0071E3',
          darkBlue: '#0A84FF',
          gray: '#F5F5F7',
          card: '#FFFFFF',
          darkBg: '#000000',
          darkCard: '#1C1C1E',
          darkSecondary: '#2C2C2E',
          border: 'rgba(0, 0, 0, 0.06)',
          darkBorder: 'rgba(255, 255, 255, 0.08)',
          green: '#34C759',
          orange: '#FF9F0A',
          red: '#FF3B30'
        }
      },
      fontFamily: {
        sans: [
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
        'apple-subtle': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'apple-card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'apple-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'apple-dark-card': '0 8px 24px -4px rgba(0, 0, 0, 0.5)'
      }
    },
  },
  plugins: [],
}
