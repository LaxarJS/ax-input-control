/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const laxarInfrastructure = require( 'laxar-infrastructure' );

module.exports = config => {
   config.set(
      laxarInfrastructure.karma( [ './spec/laxar-input-control.spec.js', './spec/builtin-validators.spec.js' ], {
         context: __dirname
      } )
   );
};
