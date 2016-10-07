/* tslint:disable: variable-name max-line-length */
/**
 * Try to not make your own edits to this file, use the constants folder instead. 
 * If more constants should be added file an issue or create PR.
 */
import 'ts-helpers';

import {
  DEV_PORT, PROD_PORT, EXCLUDE_SOURCE_MAPS, HOST,
  USE_DEV_SERVER_PROXY, DEV_SERVER_PROXY_CONFIG, DEV_SERVER_WATCH_OPTIONS,
  DEV_SOURCE_MAPS, PROD_SOURCE_MAPS, MY_COPY_FOLDERS,
  MY_CLIENT_PLUGINS, MY_CLIENT_PRODUCTION_PLUGINS, MY_CLIENT_RULES
} from './constants';

const {
  ContextReplacementPlugin,
  DefinePlugin,
  ProgressPlugin,
  NoErrorsPlugin
} = require('webpack');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const { ForkCheckerPlugin } = require('awesome-typescript-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NamedModulesPlugin = require('webpack/lib/NamedModulesPlugin');
const UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin');

const { root } = require('./helpers.js');

const EVENT = process.env.npm_lifecycle_event;
const AOT = EVENT.includes('aot');
const DEV_SERVER = EVENT.includes('webdev');
const DLL = EVENT.includes('dll');
const PROD = EVENT.includes('prod');

let port: number;
if (PROD) {
  port = PROD_PORT;
} else {
  port = DEV_PORT;
}

const PORT = port;

console.log('PRODUCTION BUILD: ', PROD);
console.log('AOT: ', AOT);
if (DEV_SERVER) {
  console.log(`Starting dev server on: http://${HOST}:${PORT}`);
}

const CONSTANTS = {
  AOT: AOT,
  ENV: PROD ? JSON.stringify('production') : JSON.stringify('development'),
  HOST: JSON.stringify(HOST),
  PORT: PORT
};

const COPY_FOLDERS = [
  { from: 'src/assets', to: 'assets' },
  { from: 'src/index.html' },
  ...MY_COPY_FOLDERS
];


const clientConfig = function webpackConfig(): WebpackConfig {
  let config: WebpackConfig = Object.assign({});

  config.cache = true;
  PROD ? config.devtool = PROD_SOURCE_MAPS : config.devtool = DEV_SOURCE_MAPS;

  config.module = {
    rules: [
      {
        test: /\.js$/,
        loader: 'source-map-loader',
        exclude: [EXCLUDE_SOURCE_MAPS]
      },
      {
        test: /\.ts$/,
        loaders: [
          'awesome-typescript-loader',
          'angular2-template-loader',
          'angular2-router-loader?loader=system&genDir=src/compiled/src/app&aot=' + AOT
        ],
        exclude: [/\.(spec|e2e|d)\.ts$/]
      },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html/, loader: 'raw-loader', exclude: [root('src/index.html')] },
      { test: /\.css$/, loader: 'raw-loader' },
      ...MY_CLIENT_RULES
    ]
  };

  config.plugins = [
    new ContextReplacementPlugin(
      /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
      root('./src')
    ),
    new ProgressPlugin(),
    new ForkCheckerPlugin(),
    new DefinePlugin(CONSTANTS),
    new NamedModulesPlugin(),
    new CopyWebpackPlugin(COPY_FOLDERS, { ignore: ['*dist_root/*'] }),
    new CopyWebpackPlugin([{ from: 'src/assets/dist_root' }]),
    ...MY_CLIENT_PLUGINS
  ];

  if (DEV_SERVER) {
    config.plugins.push(
      new HtmlWebpackPlugin({
        template: 'src/index.html',
        inject: false
      })
    );
  }

  if (PROD) {
    config.plugins.push(
      new NoErrorsPlugin(),
      new UglifyJsPlugin({
        beautify: false,
        comments: false
      }),
      ...MY_CLIENT_PRODUCTION_PLUGINS
    );
  }

  if (AOT) {
    config.entry = {
      main: './src/main.browser.aot'
    };
  } else {
    config.entry = {
      main: './src/main.browser'
    };
  }

  config.output = {
    path: root('dist/client'),
    filename: 'index.js'
  };

  config.devServer = {
    contentBase: AOT ? './src/compiled' : './src',
    port: CONSTANTS.PORT,
    historyApiFallback: true,
    host: '0.0.0.0',
    watchOptions: DEV_SERVER_WATCH_OPTIONS
  };

  if (USE_DEV_SERVER_PROXY) {
    Object.assign(config.devServer, {
      proxy: DEV_SERVER_PROXY_CONFIG
    });
  }

  config.node = {
    global: true,
    process: true,
    Buffer: false,
    crypto: true,
    module: false,
    clearImmediate: false,
    setImmediate: false,
    clearTimeout: true,
    setTimeout: true
  };

  config.resolve = {
    extensions: ['.ts', '.js', '.json']
  };

  return config;

} ();

console.log('BUILDING APP');
module.exports = clientConfig;

