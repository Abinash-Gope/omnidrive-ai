/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1a73e8',
          hoverBlue: '#1557b0',
          bg: '#f8fafe',
          sidebar: '#f0f4f9',
          card: '#ffffff',
          border: '#e0e5eb',
          text: '#1f1f1f',
          subtext: '#5f6368',
          activeNav: '#c2e7ff',
          activeNavText: '#001d35',
        },
      },
    },
  },
  plugins: [],
}
