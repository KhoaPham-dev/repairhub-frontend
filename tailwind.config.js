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
        bg:              'var(--bg)',
        surface:         'var(--surface)',
        'surface-alt':   'var(--surface-alt)',
        'border-subtle': 'var(--border)',
        'text-base':     'var(--text)',
        'text-muted':    'var(--text-muted)',
        accent:          'var(--accent)',
        'accent-hover':  'var(--accent-hover)',
        overlay:         'var(--overlay)',
      },
    },
  },
  plugins: [],
};
