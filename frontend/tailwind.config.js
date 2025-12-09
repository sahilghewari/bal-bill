import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#208080',
        secondary: '#5e5240',
        success: '#208080',
        warning: '#a84b2f',
        danger: '#c0152f',
        bg: {
          light: '#fcfcf9',
          default: '#f5f5f5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [forms(), typography()],
}
