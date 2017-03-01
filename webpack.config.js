/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const path = require( 'path' );
const webpack = require( 'webpack' );

const directory = __dirname;

const package = require( `${directory}/package.json` );
const name = package.name;
const main = path.resolve( directory, package.main || `${name}.js` );
const browser = path.relative( directory, package.browser || `dist/${name}.js` );
const alias = {
   laxar$: 'laxar/dist/laxar-compatibility.with-deps'
};
const externals = Object.keys( package.peerDependencies ).reduce( (externals, name) => {
   const key = `${name}$`;
   const value = alias[ key ] || alias[ name ] || name;

   externals[ name ] = externals[ value ] = value;

   return externals;
}, {} );

function relative( file ) {
   return './' + path.relative( process.cwd(), file );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const config = module.exports = {
   entry: {
      [ name ]: relative( main )
   },
   output: {
      path: directory,
      filename: browser,
      libraryTarget: 'umd',
      umdNamedDefine: true
   },
   externals,
   resolve: {
      alias
   },
   devtool: '#source-map',
   module: {
      rules: [
      ]
   }
};
