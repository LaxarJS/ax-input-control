/* eslint-env node */

const laxarInfrastructure = require( 'laxar-infrastructure' );

module.exports = config => {
   config.set(
      laxarInfrastructure.karma( [ './spec/laxar-input-control.spec.js', './spec/builtin-validators.spec.js' ], {
         context: __dirname
      } )
   );
};
