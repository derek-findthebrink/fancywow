const ConfigStore = require('configstore')

const pkg = require('../../package.json')

const configDefaults = {
  clients: {
    asana: {},
  },
}

const config = new ConfigStore(pkg.name, configDefaults)

module.exports = config
