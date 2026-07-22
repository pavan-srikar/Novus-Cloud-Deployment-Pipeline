/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
          mono: ['Orbitron', 'monospace'],
          ubuntu: ["Ubuntu", "sans-serif"],
        },
        colors: {
            rpg: {
            dark: "#020617",
            card: "#0f172a",
            accent: "#3b82f6",
            gold: "#fbbf24",
            background: "#5B7DA7",
            element: "#152241",
            txt_blue: "#60A5FA",
            }
        }
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 👈 Add this line
  ],
}