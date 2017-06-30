/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const pkg = require( './package.json' );
const laxarInfrastructure = require( 'laxar-infrastructure' );

module.exports = function( config ) {
   const conf = karmaConfig();
   console.log( 'CONF: ', conf );
   config.set( conf );
};

function karmaConfig() {
   return laxarInfrastructure.karma( [
         './spec/laxar-input-control.spec.js',
         './spec/builtin-validators.spec.js'
      ], {
      context: __dirname,
      module: {
         rules: require( './webpack.config' )[ 0 ].module.rules
      }
   } );
}
