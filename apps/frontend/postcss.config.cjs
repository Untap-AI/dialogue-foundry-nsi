const postcssOKLabFunction = require('@csstools/postcss-oklab-function')

module.exports = {
  plugins: [
    postcssOKLabFunction({
      preserve: true,
      enableProgressiveCustomProperties: true,
      subFeatures: { displayP3: true }
    })
  ]
}
