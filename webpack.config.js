/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const path = require( 'path' );

const directory = __dirname;

const package = require( `${directory}/package.json` );

if( process.env.NODE_ENV === 'browser-spec' ) {
   module.exports = webpack( { context: __dirname, package } ).browserSpec( './spec/builtin_validators_spec.js', './spec/input_spec.js' );
}
else {
   module.exports = webpack( { context: __dirname, package } ).library();
}

Object.defineProperty( module.exports, 'webpack', { enumerable: false, value: webpack } );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function webpack( options ) {
   const context = path.resolve( options.context || process.cwd() );
   const package = options.package || require( `${context}/package.json` );
   const name = package.name || path.basename( context );
   const main = path.relative( context, package.main || `${name}.js` );
   const browser = path.relative( context, package.browser || `dist/${name}.js` );
   const alias = options.alias || {};
   const externals = Object.keys( package.peerDependencies ).reduce( (externals, name) => {
      const key = `${name}$`;
      const value = alias[ key ] || alias[ name ] || name;

      externals[ name ] = externals[ value ] = value;

      return externals;
   }, options.externals || {} );
   const devtool = options.devtool || '#source-map';

   const config = {
      context,
      resolve: {
         alias
      },
      module: {
         rules: []
      },
      devtool
   };

   return {
      library() {
         return this.config( {
            entry: {
               [ name ]: `./${main}`
            },
            output: {
               path: path.dirname( browser ),
               filename: path.basename( browser ).replace( name, '[name]' ),
               library: '[name]',
               libraryTarget: 'umd'
            },
            externals
         } );
      },
      bundle() {
         return this.config( {
            entry: {
               [ name ]: `./${main}`
            },
            output: {
               path: path.dirname( browser ),
               filename: path.basename( browser ).replace( name, '[name]' )
            }
         } );
      },
      browserSpec() {
         const WebpackJasmineHtmlRunnerPlugin = require( 'webpack-jasmine-html-runner-plugin' );
         return this.config( {
            entry: WebpackJasmineHtmlRunnerPlugin.entry.apply( WebpackJasmineHtmlRunnerPlugin, arguments ),
            plugins: [ new WebpackJasmineHtmlRunnerPlugin() ],
            output: {
               path: path.join( context, 'spec-output' ),
               publicPath: '/spec-output/',
               filename: '[name].bundle.js'
            }
         } );
      },
      config( options ) {
         return Object.assign( {}, config, options );
      }
   };
}
