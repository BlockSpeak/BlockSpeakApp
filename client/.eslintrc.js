// .eslintrc.js
// ESLint configuration for BlockSpeak client
// Configures linting rules for JavaScript and React

module.exports = {
  env: {
    browser: true, // Enables browser globals like window
    es2021: true, // Enables modern JavaScript features
    node: true, // Enables Node.js globals like module
  },
  extends: [
    'airbnb', // Use Airbnb's base rules
    'plugin:react/recommended', // React-specific rules
    'plugin:react-hooks/recommended', // React Hooks rules
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true, // Enable JSX syntax
    },
    ecmaVersion: 12, // Use ECMAScript 2021
    sourceType: 'module', // Treat files as ES Modules
  },
  plugins: [
    'react', // Enable React plugin
    'react-hooks', // Enable React Hooks plugin
  ],
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/prop-types': 'off', // Disable PropTypes validation
    'no-use-before-define': ['error', { variables: false }], // Allow variables to be used before definition
    'comma-dangle': ['error', 'always-multiline'], // Require trailing commas in multi-line objects/arrays
    'linebreak-style': ['error', 'unix'], // Enforce LF line endings
    indent: ['error', 2], // Use 2-space indentation
    'max-len': ['error', { code: 120, ignoreStrings: true }], // Allow longer lines (120), ignore strings
    quotes: ['error', 'single'], // Enforce single quotes
    'no-alert': 'off', // Allow alert for now
    'no-console': 'off', // Allow console for now
    'consistent-return': 'off', // Disable for async functions for now
    'react/jsx-one-expression-per-line': 'off', // Allow multiple expressions per line in JSX
    'jsx-a11y/label-has-associated-control': 'off', // Disable for now, fix later
    'react/button-has-type': 'off', // Disable for now, fix later
    'react/no-array-index-key': 'off', // Allow array index keys for now
    'object-curly-newline': ['error', { consistent: true }], // Consistent object brace newlines
    'import/extensions': ['error', 'ignorePackages', { js: 'never', jsx: 'never' }], // Allow no extensions for .js/.jsx
  },
  ignorePatterns: [
    '**/web3.min.js', // Ignore web3.min.js
    '**/dist/**', // Ignore build output
    '**/*.css', // Ignore CSS files
  ],
  settings: {
    react: {
      version: 'detect', // Automatically detect React version
    },
  },
};
