/** @type {import('tailwindcss').Config} */
//
//export default {
//  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
//  theme: {
//    extend: {
//      fontFamily: {
//        display: ['Syne', 'sans-serif'],
//        body:    ['Plus Jakarta Sans', 'sans-serif'],
//        sans:    ['Plus Jakarta Sans', 'sans-serif'],
//      },
//      colors: {
//        kip: {
//          base:    '#080B10',
//          surface: '#0C1018',
//          card:    '#101520',
//          blue:    '#2B7FFF',
//          'blue-bright': '#5BA3FF',
//          'blue-mid':    '#1A5FCC',
//          teal:    '#00F0C8',
//          'teal-dark':   '#00C4A4',
//          gold:    '#E8973E',
//          'gold-bright': '#FFB84D',
//          green:   '#1AE06E',
//          'green-bright':'#4DFFB4',
//          red:     '#FF4D6A',
//          violet:  '#A855F7',
//          text:    '#EEF4FF',
//          muted:   '#8BA8CC',
//          faint:   '#3D5470',
//          dark:    '#0C1018',
//          navy:    '#080B10',
//          pale:    '#8BA8CC',
//          copper: { 50: '#fefce8', 500: '#c2410c', 700: '#9a3412' },
//          zambia: { green: '#166534' }
//        }
//      },
//    }
//  },
//  plugins: []
//}


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        copper: {
          50: '#fefce8',
          500: '#c2410c',
          700: '#9a3412',
        },
        zambia: {
          green: '#166534',
        },
        kip: {
          blue: '#1E40AF',
          blueBright: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}