/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#1a2332',
          800: '#1e293b',
          700: '#334155',
        },
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}
