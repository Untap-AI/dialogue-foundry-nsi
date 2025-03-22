/* eslint-env commonjs */
module.exports = {
  extends: ['@dialogue-foundry/eslint-config/react'],
  settings: {
    'import/resolver': {
      typescript: {
        project: 'packages/widget/tsconfig.json'
      }
    }
  }
}
