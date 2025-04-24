module.exports = {
    darkMode: 'class', // Enables class-based dark mode, apply `dark` class to `html` or `body` to trigger it
    theme: {
      extend: {
        colors: {
          // Define custom colors for both light and dark modes
          background: '#ffffff', // Default background for light mode
          text: '#000000', // Default text color for light mode
          darkBackground: '#121212', // Dark mode background
          darkText: '#ffffff', // Dark mode text color
        },
        // You can also extend fonts, spacing, borders, etc.
      },
    },
    plugins: [],
  }
  