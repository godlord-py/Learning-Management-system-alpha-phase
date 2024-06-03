const { defineConfig } = require('cypress')

module.exports = {
    e2e: {
      setupNodeEvents(on, config) {
      },
      supportFile: false,
      "chromeWebSecurity": false,
      baseUrl: 'http://localhost:3000'
    },
  }
  
