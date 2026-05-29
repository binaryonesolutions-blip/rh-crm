/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Rhombus Concrete brand colours
        'rhombus-blue': '#185FA5',
        'rhombus-light': '#E6F1FB',
        'rc-bg': '#F8FAFC',
        // Keep legacy alias in case anything still references it
        rhombus: {
          blue:  '#185FA5',
          light: '#E6F1FB',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
