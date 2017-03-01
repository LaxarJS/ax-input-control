/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const webpack = require( 'laxar-infrastructure' ).webpack( {
   context: __dirname
} );

if( process.env.NODE_ENV === 'browser-spec' ) {
   module.exports = webpack.browserSpec( './spec/spec_runner.js' );
}
else {
   module.exports = webpack.library();
}
