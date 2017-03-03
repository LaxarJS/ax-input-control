/* eslint-env node */

module.exports = function( config ) {
   config.set( karmaConfig() );
};

var laxarInfrastructure = require( './laxar-infrastructure' );
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

   const base = laxarInfrastructure.karma( {
      context: __dirname
   } );

   return Object.assign( {}, base, {
      files: files( specsPattern, [ polyfillsPath ], assetsPatterns ),
      preprocessors: {
         [ specsPattern ]: [ 'webpack', 'sourcemap' ]
      }
   } );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function files( specPath, dependencyPatterns, assetsPatterns ) {
   return dependencyPatterns
      .concat([ specPath ])
      .concat(assetsPatterns.map(function(pattern) { return { pattern: pattern, included: false }; }));
}
