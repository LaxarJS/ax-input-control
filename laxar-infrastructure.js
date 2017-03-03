/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const path = require( 'path' );

module.exports = {
   webpack,
   karma
};

function webpack( options ) {
   const context = path.resolve( options.context || process.cwd() );
   const package = options.package || require( `${context}/package.json` );
   const name = package.name || path.basename( context );
   const main = path.relative( context, package.main || `${name}.js` );
   const browser = path.relative( context, package.browser || `dist/${name}.js` );
   const alias = options.alias || {};
   const externals = Object.keys( package.peerDependencies ).reduce( (externals, name) => {
      const key = `${name}$`;
      const value = alias[ key ] || alias[ name ] || name;

      externals[ name ] = externals[ value ] = value;

      return externals;
   }, options.externals || {} );
   const devtool = options.devtool || '#source-map';

   const config = {
      context,
      resolve: {
         alias
      },
      module: {
         rules: []
      },
      devtool
   };

   return {
      library() {
         return this.config( {
            entry: {
               [ name ]: `./${main}`
            },
            output: {
               path: path.dirname( browser ),
               filename: path.basename( browser ).replace( name, '[name]' ),
               library: '[name]',
               libraryTarget: 'umd'
            },
            externals
         } );
      },
      bundle() {
         return this.config( {
            entry: {
               [ name ]: `./${main}`
            },
            output: {
               path: path.dirname( browser ),
               filename: path.basename( browser ).replace( name, '[name]' )
            }
         } );
      },
      browserSpec() {
         const WebpackJasmineHtmlRunnerPlugin = require( 'webpack-jasmine-html-runner-plugin' );
         return this.config( {
            entry: WebpackJasmineHtmlRunnerPlugin.entry.apply( WebpackJasmineHtmlRunnerPlugin, arguments ),
         plugins: [ new WebpackJasmineHtmlRunnerPlugin() ],
         output: {
               path: path.join( context, 'spec-output' ),
               publicPath: '/spec-output/',
               filename: '[name].bundle.js'
            }
         } );
      },
      config( options ) {
         return Object.assign( {}, config, options );
      }
   };
};

function karma( options ) {
   const browsers = [];
   const isSauceAvailable = !!(process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY);

   if( process.env.BROWSER ) {
      const launcherName = isSauceAvailable ? {
         'chrome': 'SauceLabs Chrome',
         'firefox': 'SauceLabs Firefox',
         'internet explorer': 'SauceLabs IE',
         'safari': 'SauceLabs Safari',
         'phantomjs': 'PhantomJS'
      } : {
         'chrome': process.env.TRAVIS ? 'Chrome TravisCi' : 'Chrome',
         'firefox': 'Firefox',
         'internet explorer': 'IE',
         'safari': 'Safari',
         'phantomjs': 'PhantomJS'
      };

      process.env.BROWSER.split( ',' ).forEach( browser => {
         browsers.push( launcherName[ browser ] );
      } );
   }
   else {
      browsers.push( 'PhantomJS' );
   }

   return {
      browsers,
      frameworks: [ 'jasmine' ],
      preprocessors: {

      },
      proxies: {},
      webpack: webpack( options ).config(),
      webpackMiddleware: {
         noInfo: true,
         quiet: true
      },
      customLaunchers: {
         'Chrome TravisCi': {
            base: 'Chrome',
            flags: [ '--no-sandbox' ]
         },
         'SauceLabs Chrome': {
            base: 'SauceLabs',
            browserName: 'chrome'
         },
         'SauceLabs Firefox': {
            base: 'SauceLabs',
            browserName: 'firefox'
         },
         'SauceLabs IE': {
            base: 'SauceLabs',
            browserName: 'internet explorer',
            platform: 'Windows 10'
         },
         'SauceLabs Safari': {
            base: 'SauceLabs',
            browserName: 'safari',
            platform: 'macOS 10.12'
         }
      },
      browserNoActivityTimeout: 5000,
      singleRun: true,
      autoWatch: false
   };
};
