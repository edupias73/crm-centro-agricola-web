/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00a884',
          dark: '#005c4b',
          bg: '#f0f2f5',
          chat: '#efeae2',
          text: '#111b21',
          gray: '#667781',
        },
      },
    },
  },
  plugins: [],
};
