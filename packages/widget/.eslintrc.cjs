/* eslint-env commonjs */
module.exports = {
  extends: ['@dialogue-foundry/eslint-config/react'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
        alwaysTryTypes: true
      }
    }
  }
}
