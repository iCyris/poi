'use strict'
const Path = require('path')
const fs = require('fs-promise')
const co = require('co')
const exists = require('path-exists')
const babel = require('babel-core')
const requireFromString = require('require-from-string')
const deepAssign = require('deep-assign')
const build = require('./build')
const dev = require('./dev')
const _ = require('./utils')
const updateConfig = require('./update-config')

module.exports = co.wrap(function* (options) {
  const configFile = Path.join(
    process.cwd(),
    typeof options.config === 'string'
      ? options.config
      : 'vbuild.js'
  )

  let fileConfig
  let devConfig
  let prodConfig
  if (options.config) {
    if (yield exists(configFile)) {
      let code = yield fs.readFile(configFile, 'utf8')
      code = babel.transform(code, {
        presets: [require('babel-preset-es2015'), require('babel-preset-stage-0')]
      }).code

      fileConfig = requireFromString(code, {
        prependPaths: [_.dir('node_modules')]
      }).default

      devConfig = fileConfig.development
      prodConfig = fileConfig.production
      delete fileConfig.development
      delete fileConfig.production
    }
  }

  deepAssign(
    options,
    options.dev ? devConfig : prodConfig,
    options.dev ? options.development : options.production
  )

  options.dist = options.dist || 'dist'

  let webpackConfig = options.dev
    ? require('./webpack.config.dev')
    : require('./webpack.config.prod')

  /**
   * Update webpackConfig
   */
  webpackConfig = yield updateConfig(webpackConfig, options)

  if (options.dev) {
    yield dev(webpackConfig, options)
  } else {
    yield build(webpackConfig, options)
  }
})