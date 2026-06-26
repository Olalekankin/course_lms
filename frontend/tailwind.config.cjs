/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        light: {
          50: '#f8fafc',  // soft off-white canvas background
          100: '#f1f5f9', // light gray secondary background
          200: '#e2e8f0', // soft border lines
          500: '#64748b', // muted gray description text
          700: '#334155', // readable dark gray body text
          900: '#0f172a', // deep dark gray heading text
        },
        accent: {
          violet: '#7c3aed', // primary brand action violet
          indigo: '#4f46e5', // gradient accent indigo
          emerald: '#10b981', // completion / success green
          rose: '#ef4444', // error highlight red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
