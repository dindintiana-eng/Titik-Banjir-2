/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#163b36',
        muted: '#788780',
        canvas: '#f5f7f2',
        safe: '#26896e',
        watch: '#e49b31',
        danger: '#d6604d'
      },
      boxShadow: {
        card: '0 12px 40px rgba(27, 57, 48, 0.06)'
      }
    }
  },
  plugins: []
};
