/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const webpack = require( 'laxar-infrastructure' ).webpack( {
   context: __dirname
} );

module.exports = [
   webpack.library(),
   webpack.browserSpec( [ './spec/laxar-input-control.spec.js', './spec/builtin-validators.spec.js' ] )
];
