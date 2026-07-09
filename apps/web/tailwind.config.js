const preset = require('@ultrathing/ui/preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // El preset compartido es la única fuente de verdad del color (tema negro/dorado).
  presets: [preset],
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};
