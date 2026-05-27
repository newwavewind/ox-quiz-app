/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'home-year-pct-idle',
    'home-year-pct-active',
    'home-year-pct-done',
    'home-year-bar-idle',
    'home-year-bar-active',
    'home-year-bar-done',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
