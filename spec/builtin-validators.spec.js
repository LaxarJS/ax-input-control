/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   '../laxar-input-control',
   './helpers',
   './builtin-validators-spec-data',
   'jquery',
   'angular',
   'angular-mocks'
], function( inputModule, helpers, data, $, ng ) {
   'use strict';

   describe( 'builtin validators', function() {

      var $compile;
      var $rootScope;
      var $input;
      var scope;
      var ngModel;

      beforeEach( ng.mock.module( helpers.provideWidgetServices() ) );
      beforeEach( ng.mock.module( inputModule.name ) );
      beforeEach( ng.mock.inject( function( _$compile_, _$rootScope_ ) {
         $compile = helpers.jQueryCompile( $, _$compile_ );
         $rootScope = _$rootScope_;

         scope = $rootScope.$new();
      } ) );

      beforeEach( function() {
         $.fn.tooltip = jasmine.createSpy( 'tooltip' ).and.returnValue( {
            on: function() { return this; }
         } );

         jasmine.clock().install();
      } );

      afterEach( function() {
         jasmine.clock().uninstall();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      data.simpleTests.forEach( function( testGroup ) {

         describe( 'for type ' + testGroup.type, function() {

            testGroup.tests.forEach( function( test ) {

               describe( 'a ' + test.constraint + ' validator' , function() {

                  beforeEach( function() {
                     var html = '<input ' +
                        'ax-input="' + testGroup.type + '" ' +
                        'ng-model="modelValue" ' +
                        'ax-input-' + test.constraint + '="' + test.constraintValue + '">';
                     $input = $compile( html )( scope );

                     ngModel = $input.controller( 'ngModel' );

                     scope.$apply( function() {
                        scope.modelValue = testGroup.initialValue;
                     } );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'accepts the valid input ' + testGroup.validInput, function() {
                     enter( $input, testGroup.validInput );

                     expect( ngModel.$error.semantic ).toBeUndefined();
                     expect( scope.modelValue ).toEqual( testGroup.validExpected );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  test.inputs.forEach( function( input, index ) {

                     it( 'sets a semantic error for invalid input "' + input + '", but updates the model', function() {
                        enter( $input, input );

                        expect( ngModel.$error.semantic ).toBe( true );
                        expect( scope.modelValue ).toEqual( test.expected[ index ] );
                     } );

                  } );

               } );

            } );

         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'for bound constraint values', function() {

         data.boundConstraintsTests.forEach( function( testGroup ) {

            describe( 'for constraint ' + testGroup.constraint, function() {

               beforeEach( function() {
                  var html = '<input ng-model="modelValue" ' +
                     'ax-input="' + testGroup.valueType + '" ' +
                     'ax-input-' + testGroup.constraint + '="constraintBinding">';

                  scope.constraintBinding = testGroup.initialConstraintValue;
                  scope.modelValue = testGroup.initialValue;

                  $input = $compile( html )( scope );

                  scope.$digest();

                  ngModel = $input.controller( 'ngModel' );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'reads its initial constraint value for validation', function() {
                  enter( $input, testGroup.invalidValue );
                  expect( ngModel.$error.semantic ).toBe( true );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               describe( 'when the constraint value is changed', function() {

                  beforeEach( function() {
                     enter( $input, testGroup.resetValue );// trigger a value change
                     scope.$apply( function() {
                        scope.constraintBinding = testGroup.secondConstraintValue;
                     } );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'applies its new value on validation (jira ATP-8140)', function() {
                     enter( $input, testGroup.invalidValue );
                     expect( ngModel.$error.semantic ).toBeUndefined(
                        'Constraint: ' + testGroup.constraint +
                           ', Value: ' + testGroup.invalidValue +
                           ', new constraint value: ' + testGroup.secondConstraintValue
                     );
                  } );

               } );

            } );

         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function enter( $input, value ) {
      $input.val( value );
      helpers.triggerDomEvent( $input[0], 'change' );
   }

} );
