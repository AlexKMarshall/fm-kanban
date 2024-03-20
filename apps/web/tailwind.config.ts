import tailwindForms from '@tailwindcss/forms'
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [tailwindForms],
} satisfies Config
