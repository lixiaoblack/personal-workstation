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
        primary: '#3c83f6',
        'primary-hover': '#2d6ed4',
        'bg-primary': '#101722',
        'bg-secondary': '#101722',
        'bg-tertiary': '#282e39',
        'border-color': '#1e2939',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
