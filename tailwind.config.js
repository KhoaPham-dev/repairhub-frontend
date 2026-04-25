/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#004EAB',
        accent: '#715DF2',
        'page-bg': '#F8F9FB',
        'input-bg': '#f8fafc',
        success: '#1D7F54',
        'success-bg': '#E0F2E9',
      },
    },
  },
  plugins: [],
};
