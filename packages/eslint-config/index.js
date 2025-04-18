module.exports = {
  env: {
    browser: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:promise/recommended",
  ],
  plugins: ["jsdoc", "no-null", "prettier", "node"],
  rules: {
    "id-denylist": [
      "error"
    ],
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "object",
          "type",
        ],
      },
    ],
    "no-null/no-null": "error",
    "no-unused-vars": "error",
    "prettier/prettier": [
      "warn",
      {
        arrowParens: "avoid",
        semi: false,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: "none",
      },
    ],
    "promise/prefer-await-to-then": "error",
    "no-param-reassign": ["error", { props: true }],
    "import/no-cycle": "error",
    "no-restricted-globals": ["error", "isNaN"],
    "prefer-template": "error"
  },
  ignorePatterns: ["src/index.html", "src/entry/index.d.ts", "dist/**/*", "node_modules/**/*", "**/*.cjs", "**/*.cjs.map"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:import/typescript",
      ],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
      },
      rules: {
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-shadow": [
          "error",
          { builtinGlobals: true, allow: ["event"] },
        ],
        "@typescript-eslint/switch-exhaustiveness-check": "error",
      },
    },
    {
      files: ["**/*.js", "**/*.jsx"],
      parser: "@babel/eslint-parser",
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        requireConfigFile: false,
      },
    },
  ],
  settings: {
    'import/resolver': {
      typescript: {}
    }
  }
};