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
        epoch: {
          bg: '#EEE9DC',
          surface: '#FAF8F1',
          surfaceElevated: '#E6EDEB',
          nav: '#F7F4EB',
          border: '#D7DEDC',
          borderSubtle: '#E2E8E6',
          borderLight: '#CBD5D2',
          text: '#172126',
          textMuted: '#667579',
          teal: '#167F78',
          terrain: '#587A68',
          amber: '#C58A24',
          coral: '#C95050',
          blue: '#397FA8',
          // Aliases for component compatibility
          card: '#FAF8F1',
          cardHover: '#E6EDEB',
          cardMuted: '#EAE6DB',
          cyan: '#167F78',
          red: '#C95050',
          green: '#587A68',
          muted: '#667579'
        }
      },
      fontFamily: {
        brand: ['Allura', 'Caveat', 'cursive'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        'panel': '12px',
        'card': '10px'
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(23, 33, 38, 0.06)',
        'subtle-hover': '0 4px 14px rgba(23, 33, 38, 0.09)',
        'nav': '0 2px 8px rgba(23, 33, 38, 0.06)',
        'panel': '0 2px 10px rgba(23, 33, 38, 0.06)'
      }
    },
  },
  plugins: [],
}



