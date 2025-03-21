module.exports = {
  extends: ['@dialogue-foundry/eslint-config'],
  rules: {
    // Add any backend-specific rule overrides here
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }]
  },
}; 