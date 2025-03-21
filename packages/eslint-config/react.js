const baseConfig = require("./index.js");

module.exports = {
  ...baseConfig,
  extends: [
    ...baseConfig.extends,
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: [
    ...baseConfig.plugins,
    // TODO: Update this dep when stable version is released
    "react-compiler"
  ],
  parserOptions: {
    ...baseConfig.parserOptions,
    babelOptions: {
      plugins: ["@babel/plugin-syntax-jsx"]
    }
  },
  rules: {
    ...baseConfig.rules,
    "react-hooks/exhaustive-deps": "error",
    "react/react-in-jsx-scope": "off",
    "react-compiler/react-compiler": "warn"
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};