/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#8B5CF6', // Our main purple for buttons, headers
                dark: '#1F2937', // Dark gray-black for backgrounds
                accent: '#D1D5DB', // Light gray for text or highlights
            },
        },
    },
    plugins: [],
};
