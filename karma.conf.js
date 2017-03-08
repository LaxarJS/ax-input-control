/* eslint-env node */

var laxarInfrastructure = require( 'laxar-infrastructure' );

module.exports = function( config ) {
   config.set( karmaConfig() );
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function karmaConfig() {

   return laxarInfrastructure.karma( [ 'spec/spec_runner.js' ], {
      context: __dirname
   } );

   return base;
}
