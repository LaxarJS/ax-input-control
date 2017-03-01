/* eslint-env node */

module.exports = function( config ) {
   config.set( karmaConfig() );
};

var path = require( 'path' );

var resolve = function(p) { return path.join( path.dirname( __filename ), p ); };
var polyfillsPath = resolve( 'node_modules/laxar/dist/polyfills.js' );
var specsPattern = resolve( 'spec/spec_runner.js' );
var assetsPatterns = [
   resolve( '*.theme/css/*.css' ),
   resolve( '*.theme/*.html' ),
   polyfillsPath + '.map'
];

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function karmaConfig() {

   var browsers = [
      'PhantomJS',
      'Firefox',
      process.env.TRAVIS ? 'ChromeTravisCi' : 'Chrome'
   ];

   //browsers.splice(1);

   return {
      frameworks: [ 'jasmine' ],
      files: files( specsPattern, [ polyfillsPath ], assetsPatterns ),
      preprocessors: {
         [ specsPattern ]: [ 'webpack', 'sourcemap' ]
      },
      proxies: {},
      webpack: webpackConfig(),
      webpackMiddleware: {
         noInfo: true,
         quiet: true
      },

      //reporters: [ 'progress' ],
      //port: 9876,
      browsers: browsers,
      customLaunchers: {
         ChromeTravisCi: {
            base: 'Chrome',
            flags: [ '--no-sandbox' ]
         }
      },
      browserNoActivityTimeout: 100000,
      singleRun: true,
      autoWatch: false
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function webpackConfig() {
   var config = Object.assign( {}, require('./webpack.config' ) );
   config.devtool = 'inline-source-map';
   delete config.externals;
   delete config.entry;
   delete config.output;
   return config;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function files( specPath, dependencyPatterns, assetsPatterns ) {
   return dependencyPatterns
      .concat([ specPath ])
      .concat(assetsPatterns.map(function(pattern) { return { pattern: pattern, included: false }; }));
}
