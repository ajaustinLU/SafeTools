/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        navy: {
          950: '#0F172A',
          900: '#1E293B',
          800: '#1a2540',
          700: '#253352',
        },
        accent: {
          cyan: '#06B6D4',
          amber: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
};
