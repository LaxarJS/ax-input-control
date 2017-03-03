/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */
const laxarInfrastructure = require( './laxar-infrastructure' );

module.exports = laxarInfrastructure.webpack( {
   context: __dirname
} ).library();
