// Tailwind kalır (karar: NOTES "Tailwind kalır"). Renkler tek tasarım kaynağına (src/design/ui.css tokenları) bağlıdır.
// Kontrol paneli Tailwind'in varsayılan paletini kullanmayı sürdürür (extend: varsayılanlar silinmez).
const v = (name) => `var(--${name})`;
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ground: v("bg"),
        surface: { 1: v("surface-1"), 2: v("surface-2"), 3: v("surface-3"), 4: v("surface-4") },
        line: { DEFAULT: v("line"), soft: v("line-soft") },
        ink: { 1: v("text-1"), 2: v("text-2"), 3: v("text-3") },
        primary: v("primary"), success: v("success"), warning: v("warning"), danger: v("danger")
      }
    }
  },
  plugins: []
};
