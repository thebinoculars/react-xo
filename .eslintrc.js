module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'airbnb'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    'react'
  ],
  rules: {
    "react/jsx-filename-extension": [2, { "extensions": [".js", ".jsx"] }],
    "no-underscore-dangle": [2, { "allow": ["_id"] }],
    "indent": ["error", 2],
    "react/jsx-indent": ["error", 2],
    "react/jsx-indent-props": ["error", 2],
    "react/jsx-one-expression-per-line": 1,
    "react/prop-types": 0,
    "eqeqeq": 2,
    "quotes": [2, "single"],
    "space-unary-ops": 0,
    "spaced-comment": 0,
    "strict": 2,
    "template-curly-spacing": 0,
    "use-isnan": 2,
    "valid-jsdoc": 0,
    "valid-typeof": 2,
    "vars-on-top": 0,
    "semi": 0,
    "comma-dangle": 0
  }
}