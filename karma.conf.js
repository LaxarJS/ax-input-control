/* eslint-env node */

var laxarInfrastructure = require( 'laxar-infrastructure' );

module.exports = function( config ) {
   config.set( karmaConfig() );
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function karmaConfig() {

   return laxarInfrastructure.karma( [ './spec/laxar-input-control.spec.js', './spec/builtin-validators.spec.js' ], {
      context: __dirname
   } );

   return base;
}
