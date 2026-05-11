/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:       ['Helvetica', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        compressed: ['Helvetica', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        body:       ['Helvetica', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        brand: {
          navy: '#023494',
          red:  '#DE0100',
        },
        mood: {
          happy:      '#D7DE00',
          sad:        '#008DDE',
          productive: '#00DE30',
          tired:      '#6F00DE',
          neutral:    '#DE6B00',
          angry:      '#990303',
        },
      },
    },
  },
  plugins: [],
}
