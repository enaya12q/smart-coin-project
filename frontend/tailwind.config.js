// إعداد Tailwind CSS
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FFD700", // اللون الذهبي
        secondary: "#000000", // اللون الأسود
        accent: "#00FFFF", // لون التأكيد (الفيروزي)
        dark: "#121212",
        light: "#F5F5F5",
      },
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
