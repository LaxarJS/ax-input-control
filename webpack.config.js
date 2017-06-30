/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const pkg = require( './package.json' );
const path = require( 'path' );

const webpack = require( 'laxar-infrastructure' ).webpack( {
   context: __dirname,
   modules: {
      rules: []
   }
} );

module.exports = [
   webpack.library(),
   webpack.browserSpec( [
      './spec/laxar-input-control.spec.js',
      './spec/builtin-validators.spec.js'
   ], {
       includePaths: [ './node_modules/laxar/dist/polyfills.js' ]
   } )
];
