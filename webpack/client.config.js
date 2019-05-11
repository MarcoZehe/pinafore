const webpack = require('webpack')
const config = require('sapper/config/webpack.js')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin')
const terser = require('./terser.config')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const { mode, dev, resolve, define } = require('./shared.config')

const output = Object.assign(config.client.output(), {
  // enables HMR in workers
  globalObject: 'this',
  // Zeit does not like filenames with "$" in them, so just keep things simple
  filename: '[hash]/[id].js',
  chunkFilename: '[hash]/[id].js'
})

module.exports = {
  entry: config.client.entry(),
  output,
  resolve,
  mode,
  module: {
    rules: [
      {
        test: /\.html$/,
        use: {
          loader: 'svelte-loader',
          options: {
            dev,
            hydratable: true,
            store: true,
            hotReload: dev
          }
        }
      },
      {
        test: /\.m?js$/,
        include: /node_modules\/emoji-mart/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              [
                'transform-react-remove-prop-types',
                {
                  removeImport: true,
                  additionalLibraries: [
                    '../../utils/shared-props'
                  ]
                }
              ]
            ]
          }
        }
      }
    ].filter(Boolean)
  },
  node: {
    setImmediate: false
  },
  optimization: dev ? {} : {
    minimizer: [
      terser()
    ],
    splitChunks: {
      chunks: 'async',
      minSize: 5000,
      maxAsyncRequests: Infinity,
      maxInitialRequests: Infinity,
      name: false // these chunk names can be annoyingly long
    }
  },
  plugins: [
    new webpack.DefinePlugin(Object.assign({
      'process.browser': true,
      'process.env.NODE_ENV': JSON.stringify(mode)
    }, define)),
    new webpack.NormalModuleReplacementPlugin(
      /\/_database\/database\.js$/, // this version plays nicer with IDEs
      './database.prod.js'
    ),
    new LodashModuleReplacementPlugin(),
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true,
      cwd: process.cwd()
    })
  ].concat(dev ? [
    new webpack.HotModuleReplacementPlugin({
      requestTimeout: 120000
    })
  ] : [

    new BundleAnalyzerPlugin({ // generates report.html
      analyzerMode: 'static',
      openAnalyzer: false,
      logLevel: 'silent'
    })
  ]),
  devtool: dev ? 'inline-source-map' : 'source-map',
  performance: {
    hints: dev ? false : 'error' // fail if we exceed the default performance budgets
  }
}
