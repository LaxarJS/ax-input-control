/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'laxar',
   'laxar-uikit',
   './helpers',
   'json-loader!../messages.json'
], function( ax, ui, helpers, messages ) {
   'use strict';

   // this currently is duplicated in input.js. Thus when changing this here, remember to change it there ...
   var EVENT_REFRESH = 'axInput._refresh';

   var requiredDirectiveName = 'axInputRequired';
   var requiredDirective = [ function() {
      return {
         restrict: 'A',
         priority: 9, // ensure linking after axInput but before other validators
         require: 'axInput',
         link: function( scope, element, attrs, axInputController ) {

            axInputController.addSemanticValidator(
               function( value ) {
                  var required = scope.$eval( attrs[ requiredDirectiveName ] );
                  return !required || ( value != null && (''+value).trim() !== '' );
               },
               function() {
                  var msgKey = 'SEMANTIC_REQUIRED';
                  if( axInputController.valueType === 'select' ) {
                     msgKey += '_' + axInputController.valueType.toUpperCase();
                  }
                  return axInputController.message( msgKey );
               }
            );

            scope.$watch( attrs[ requiredDirectiveName ], function() {
               scope.$broadcast( EVENT_REFRESH );
            } );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var maximumDirectiveName = 'axInputMaximumValue';
   var maximumDirective = [ function() {
      return {
         restrict: 'A',
         require: 'axInput',
         priority: 10, // ensure linking after axInput and required validation
         link: function( scope, element, attrs, axInputController ) {

            function maximum() {
               return scope.$eval( attrs[ maximumDirectiveName ] );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            var isSmallerOrEqual = helpers.isSmallerOrEqual.bind( helpers, axInputController.valueType );
            axInputController.addSemanticValidator(
               function( value ) {
                  return value === null || isSmallerOrEqual( maximum(), value );
               },
               function() {
                  var msgKey = 'SEMANTIC_MAXIMUM_' + axInputController.valueType.toUpperCase();
                  if( axInputController.valueType === 'date' && maximum().toLowerCase() === 'now' ) {
                     msgKey += '_NOW';
                  }
                  return axInputController.message(
                     msgKey, { maximumValue: axInputController.format( maximum() ) }
                  );
               }
            );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var minimumDirectiveName = 'axInputMinimumValue';
   var minimumDirective = [ function() {
      return {
         restrict: 'A',
         require: 'axInput',
         priority: 10, // ensure linking after axInput and required validation
         link: function( scope, element, attrs, axInputController ) {

            function minimum() {
               return scope.$eval( attrs[ minimumDirectiveName ] );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            var isGreaterOrEqual = helpers.isGreaterOrEqual.bind( helpers, axInputController.valueType );
            axInputController.addSemanticValidator(
               function( value ) {
                  return value === null || isGreaterOrEqual( minimum(), value );
               },
               function() {
                  var msgKey = 'SEMANTIC_MINIMUM_' + axInputController.valueType.toUpperCase();
                  if( axInputController.valueType === 'date' && minimum().toLowerCase() === 'now' ) {
                     msgKey += '_NOW';
                  }
                  return axInputController.message(
                     msgKey, { minimumValue: axInputController.format( minimum() ) }
                  );
               }
            );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var rangeDirectiveName = 'axInputRange';
   var rangeDirective = [ function() {
      return {
         restrict: 'A',
         require: 'axInput',
         priority: 10, // ensure linking after axInput and required validation
         link: function( scope, element, attrs, axInputController ) {

            function range() {
               var rangeString = scope.$eval( attrs[ rangeDirectiveName ] );
               var rangeParts = rangeString.split( ',' ).map( function( part ) { return part.trim(); } );

               if( rangeParts.length === 2 ) {
                  return {
                     from: rangeParts[0],
                     to: rangeParts[1]
                  };
               }
               else if( rangeString ) {
                  throw new Error( 'A range must consist of two values of correct type separated by comma. ' +
                     'Instead got: ' + rangeString );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            var isInRange = helpers.isInRange.bind( helpers, axInputController.valueType );
            axInputController.addSemanticValidator(
               function( value ) {
                  var currentRange = range();
                  return isInRange( currentRange.from, currentRange.to, value );
               },
               function() {
                  return axInputController.message(
                     'SEMANTIC_RANGE_' + axInputController.valueType.toUpperCase(), {
                        minimumValue: axInputController.format( range().from ),
                        maximumValue: axInputController.format( range().to )
                     }
                  );
               }
            );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var minimumLengthDirectiveName = 'axInputMinimumLength';
   var minimumLengthDirective = [ function() {
      return {
         restrict: 'A',
         require: 'axInput',
         priority: 10, // ensure linking after axInput and required validation
         link: function( scope, element, attrs, axInputController ) {

            function minimumLength() {
               return parseInt( scope.$eval( attrs[ minimumLengthDirectiveName ] ), 10 );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            axInputController.addSemanticValidator(
               function( value ) { return value && value.length >= minimumLength(); },
               function() {
                  return axInputController.message(
                     'SEMANTIC_MINIMUM_LENGTH_STRING', {
                        minimumLength: axInputController.format( minimumLength() )
                     }
                  );
               }
            );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var maximumLengthDirectiveName = 'axInputMaximumLength';
   var maximumLengthDirective = [ function() {
      return {
         restrict: 'A',
         require: 'axInput',
         priority: 10, // ensure linking after axInput and required validation
         link: function( scope, element, attrs, axInputController ) {

            function maximumLength() {
               return parseInt( scope.$eval( attrs[ maximumLengthDirectiveName ] ), 10 );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            axInputController.addSemanticValidator(
               function( value ) { return !value || value.length <= maximumLength(); },
               function() {
                  return axInputController.message(
                     'SEMANTIC_MAXIMUM_LENGTH_STRING', {
                        maximumLength: axInputController.format( maximumLength() )
                     }
                  );
               }
            );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      addToModule: function( module ) {
         return module
            .directive( requiredDirectiveName, requiredDirective )
            .directive( maximumDirectiveName, maximumDirective )
            .directive( minimumDirectiveName, minimumDirective )
            .directive( rangeDirectiveName, rangeDirective )
            .directive( minimumLengthDirectiveName, minimumLengthDirective )
            .directive( maximumLengthDirectiveName, maximumLengthDirective );
      }
   };

} );
