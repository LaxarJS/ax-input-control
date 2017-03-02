/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   '../ax-input-control',
   './helpers',
   'laxar',
   'jquery',
   'angular',
   'angular-mocks'
], function( inputModule, helpers, ax, $, ng ) {
   'use strict';

   var axConfiguration;
   var axI18n;

   describe( 'An axInput control', function() {

      var $compile;
      var $rootScope;

      beforeEach( ng.mock.module( helpers.provideWidgetServices( function( services ) {
         axConfiguration = services.axConfiguration;
         axI18n = services.axI18n;
      } ) ) );
      beforeEach( ng.mock.module( inputModule.name ) );

      beforeEach( ng.mock.inject( function( _$compile_, _$rootScope_ ) {
         $compile = helpers.jQueryCompile( $, _$compile_ );
         $rootScope = _$rootScope_;

         $rootScope.i18n = {
            locale: 'default',
            tags: {
               'default': 'de_DE'
            }
         };
      } ) );

      beforeEach( function() {
         $.fn.tooltip = jasmine.createSpy( 'tooltip' ).and.returnValue( {
            on: function() { return this; }
         } );

         jasmine.clock().install();
      } );

      afterEach( function() {
         jasmine.clock().uninstall();
         window.scrollTo( 0, 0 );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'needs a model controller', function() {
         expect( function() { $compile( '<input data-ax-input/>' )( $rootScope.$new() ); } )
            .toThrow();
         expect( function() { $compile( '<input data-ax-input data-ng-model="something"/>' )( $rootScope.$new() ); } )
            .not.toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'creates an axInputController instance', function() {
         var $element = $compile( '<input data-ax-input ng-model="something"/>' )( $rootScope.$new() );
         var controller = $element.controller( 'axInput' );

         expect( controller.initialize ).toBeDefined();
         expect( controller.valueType ).toEqual( 'string' );
         expect( controller.parse ).toBeDefined();
         expect( controller.format ).toBeDefined();
         expect( controller.addSemanticValidator ).toBeDefined();
         expect( controller.performSemanticValidations ).toBeDefined();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'for the model controller', function() {

         function formatterByName( name ) {
            return ngModelController.$formatters.filter( function( formatter ) {
               return functionName( formatter ) === name;
            } )[ 0 ];

         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function parserByName( name ) {
            return ngModelController.$parsers.filter( function( formatter ) {
               return functionName( formatter ) === name;
            } )[0];
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         // replacement for non-standard Function.protoype.name, "good enough" for these tests
         function functionName( f ) {
            var match = f.toString().match( /^function\s*([^\s(]+)/);
            return match ? match[ 1 ] : '';
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         var ngModelController;
         var axInputController;

         beforeEach( function() {
            var $element = $compile( '<input data-ax-input="decimal" data-ng-model="something"/>' )( $rootScope.$new() );
            ngModelController = $element.controller( 'ngModel' );
            axInputController = $element.controller( 'axInput' );

            axInputController.addSemanticValidator( function( value ) {
               return value < 50000;
            }, function() {
               return 'Value must be smaller than 50000';
            } );

            spyOn( axInputController, 'performSemanticValidations' ).and.callThrough();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'adds a simple value formatter', function() {
            expect( formatterByName( 'valueFormatter' )( 12345.56 ) ).toEqual( '12.345,56' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'adds a formatter that does semantic validation', function() {
            expect( axInputController.performSemanticValidations ).not.toHaveBeenCalled();

            formatterByName( 'semanticValidation' )( 12345.56 );

            expect( axInputController.performSemanticValidations ).toHaveBeenCalledWith( 12345.56 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////


         describe( 'adds a simple syntax parser and validator', function() {

            var parsedValue;

            beforeEach( function() {
               parsedValue = parserByName( 'valueParser' )( '12.345,56' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'that simply parses correct values', function() {
               expect( parsedValue ).toEqual( 12345.56 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'returns the last valid value on parser error', function() {
               expect( parserByName( 'valueParser' )( 'vsa' ) ).toEqual( parsedValue );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sets an error for key "syntax" in the ngModelController', function() {
               expect( ngModelController.$error.syntax ).toBeUndefined();
               parserByName( 'valueParser' )( 'vsa' );
               expect( ngModelController.$error.syntax ).toBe( true );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'adds a parser that does semantic validation', function() {

            beforeEach( function() {
               parserByName( 'semanticValidation' )( 12345.56 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'that delegates to axInputController.performSemanticValidations', function() {
               expect( axInputController.performSemanticValidations ).toHaveBeenCalledWith(  12345.56 );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'that sets an error for key "semantic" in the ngModelController', function() {
               expect( ngModelController.$error.semantic ).toBeUndefined();
               ngModelController.$parsers[1]( 52345.56 );
               expect( ngModelController.$error.semantic ).toBe( true );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'that is omitted if there is pending syntactical error', function() {
               axInputController.performSemanticValidations.calls.reset();
               ngModelController.$error.syntax = true;
               ngModelController.$parsers[1]( 12345.56 );

               expect( axInputController.performSemanticValidations ).not.toHaveBeenCalled();
            } );

         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when the value is numeric with grouping separators', function() {

         var $element;
         var scope;

         beforeEach( function() {
            scope = $rootScope.$new();

            $element = $compile( '<input data-ax-input="integer" data-ng-model="someValue"/>' )( scope );
            $element.appendTo( 'body' );
            scope.$apply( function() {
               scope.someValue = 1231442;
            } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            $element.remove();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'renders the value with grouping separators by default', function() {
            expect( $element.val() ).toEqual( '1.231.442' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'removes the grouping separators on focus and re-adds them on blur', function() {
            $element.trigger( 'focusin' );
            jasmine.clock().tick( 0 );

            expect( $element.val() ).toEqual( '1231442' );

            $element.trigger( 'focusout' );
            expect( $element.val() ).toEqual( '1.231.442' );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when configured with user-defined placement', function() {

         var $element;
         var scope;
         var html = '<input data-ax-input="integer" data-ng-model="someValue" ' +
                    'data-ax-input-tooltip-placement="%PLACEMENT%" ' +
                    'data-ax-input-display-errors-immediately="true" ax-input-minimum-value="100"/>';

         beforeEach( function() {
            scope = $rootScope.$new();
            scope.someValue = 50;
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            $element.remove();
         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'configured on the left, when an error tooltip is shown', function() {

            beforeEach( function() {
               scope.$apply( function() {
                  $element = $compile( html.replace( /%PLACEMENT%/, 'left' ) )( scope );
                  $element.appendTo( 'body' );
               } );
               $element.trigger( 'focusin' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'places the tooltip on the left', function() {
               expect( $.fn.tooltip.calls.count() ).toEqual(1);
               var options = $.fn.tooltip.calls.argsFor(0)[0];
               expect( options.placement() ).toEqual( 'left' );
            } );

         } );

         //////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'configured on the top, when an error tooltip is shown', function() {

            beforeEach( function() {
               scope.$apply( function() {
                  $element = $compile( html.replace( /%PLACEMENT%/, 'top' ) )( scope );
                  $element.appendTo( 'body' );
               } );
               $element.trigger( 'focusin' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'places the tooltip on the left', function() {
               expect( $.fn.tooltip.calls.count() ).toEqual(1);
               var options = $.fn.tooltip.calls.argsFor(0)[0];
               expect( options.placement() ).toEqual( 'top' );
            } );

         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when configured with ngModelOptions', function() {

         var $element;
         var scope;
         var html = '<input data-ax-input="integer" data-ng-model="someValue" ' +
                    'data-ng-model-options="{ \'updateOn\': \'NG_MODEL_OPTIONS\' }"' +
                    'data-ax-input-display-errors-immediately="true" ax-input-minimum-value="100"/>';

         beforeEach( function() {
            scope = $rootScope.$new();
            scope.someValue = 200;
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            $element.remove();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'with updateOn set to "default"', function() {

            beforeEach( function() {
               $element = $compile( html.replace( /NG_MODEL_OPTIONS/, 'default' ) )( scope );
               $element.appendTo( 'body' );
            } );

            it( 'updates its validation state on change', function() {
               $element[0].value = '50';
               helpers.triggerDomEvent( $element[0], 'change' );
               expect( $element.hasClass( 'ax-error' ) ).toBe( true );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'with updateOn set to "keypress"', function() {

            beforeEach( function() {
               $element = $compile( html.replace( /NG_MODEL_OPTIONS/, 'keypress' ) )( scope );
               $element.appendTo( 'body' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'updates its validation state on keypress', function() {
               $element[0].value = '50';
               helpers.triggerDomEvent( $element[0], 'change' );
               expect( $element.hasClass( 'ax-error' ) ).toBe( false );


               helpers.triggerDomEvent( $element[0], 'keypress' );
               expect( $element.hasClass( 'ax-error' ) ).toBe( true );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'with updateOn set to "focusout"', function() {

            beforeEach( function() {
               $element = $compile( html.replace( /NG_MODEL_OPTIONS/, 'focusout' ) )( scope );
               $element.appendTo( 'body' );
            } );

            it( 'updates its validation state on focusout', function() {
               $element[0].value = '50';
               helpers.triggerDomEvent( $element[0], 'keydown' );
               helpers.triggerDomEvent( $element[0], 'change' );
               expect( $element.hasClass( 'ax-error' ) ).toBe( false );

               helpers.triggerDomEvent( $element[0], 'focusout' );
               expect( $element.hasClass( 'ax-error' ) ).toBe( true );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'set through configuration', function() {

            var html = '<input data-ax-input="integer" data-ng-model="someValue" ' +
                       'data-ax-input-display-errors-immediately="true" ax-input-minimum-value="100"/>';

            var configKey = 'controls.laxar-input-control.ngModelOptions';

            //////////////////////////////////////////////////////////////////////////////////////////////////

            describe( 'with updateOn set to "focusout"', function() {

               beforeEach( function() {
                  axConfiguration.set( configKey, { 'updateOn': 'focusout' } );
                  $element = $compile( html )( scope );
                  $element.appendTo( 'body' );
               } );

               it( 'updates its validation state on focusout', function() {
                  $element[0].value = '50';
                  helpers.triggerDomEvent( $element[0], 'change' );
                  expect( $element.hasClass( 'ax-error' ) ).toBe( false );

                  helpers.triggerDomEvent( $element[0], 'focusout' );
                  expect( $element.hasClass( 'ax-error' ) ).toBe( true );
               } );

            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'with updateOn not set at all', function() {

            var html = '<input data-ax-input="integer" data-ng-model="someValue" ' +
                       'data-ax-input-display-errors-immediately="true" ax-input-minimum-value="100"/>';

            beforeEach( function() {
               $element = $compile( html )( scope );
               $element.appendTo( 'body' );
            } );

            it( 'updates on every change', function() {
               $element[0].value = '150';
               $element.trigger( 'change' );
               expect( $element.hasClass( 'ax-error' ) ).toBe( false );
            } );

         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when the value is erroneous', function() {

         var $element;
         var scope;

         beforeEach( function() {
            scope = $rootScope.$new();

            $element = $compile( '<input ' +
               'title="ignore me"' +
               'ng-model="someValue" ' +
               'ax-input="integer" ' +
               'ax-input-display-errors-immediately="showImmediately" ' +
               'ax-input-minimum-value="1000"/>' )( scope );
            $element.appendTo( 'body' );
            scope.$apply( function() {
               scope.someValue = 12;
            } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            $element.remove();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'and errors must be displayed immediately', function() {

            beforeEach( function() {
               scope.$apply( function() {
                  scope.showImmediately = true;
               } );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'does not create a tooltip unless needed', function() {
               expect( $.fn.tooltip ).not.toHaveBeenCalled();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'creates, then shows a tooltip on focus', function() {
               $.fn.tooltip.calls.reset();

               $element.trigger( 'focusin' );
               expect( $.fn.tooltip ).toHaveBeenCalledWith( jasmine.any( Object ) );
               jasmine.clock().tick( 0 );
               expect( $.fn.tooltip ).toHaveBeenCalledWith( 'show' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'masks any title attribute so it does not change the validation message', function() {
               $.fn.tooltip.calls.reset();

               $element.trigger( 'focusin' );
               expect( $.fn.tooltip ).toHaveBeenCalledWith( jasmine.any( Object ) );
               jasmine.clock().tick( 0 );
               expect( $element.attr( 'title' ) ).toBeUndefined();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sets the class "ax-error" on the input field', function() {
               expect( $element.hasClass( 'ax-error-pending' ) ).toBe( false );
               expect( $element.hasClass( 'ax-error' ) ).toBe( true );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'clears the validation-pending flag', function() {
               expect( $element.controller( 'axInput' ).validationPending ).toBe( false );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'hides the tooltip on blur', function() {
               $element.trigger( 'focusin' );
               $.fn.tooltip.calls.reset();
               $element.trigger( 'blur' );
               jasmine.clock().tick( 100 );
               expect( $.fn.tooltip ).toHaveBeenCalledWith( 'hide' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'restores any title attribute on blur', function() {
               $element.trigger( 'focusin' );
               $.fn.tooltip.calls.reset();
               $element.trigger( 'blur' );
               jasmine.clock().tick( 200 );
               expect( $element.attr( 'title' ) ).toEqual( 'ignore me' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            describe( 'and the field becomes valid again', function() {

               beforeEach( function() {
                  $element.trigger( 'focusin' );
                  $.fn.tooltip.calls.reset();
                  scope.$apply( function() {
                     scope.someValue = 1200;
                  } );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'removes the class "ax-error" from the input field', function() {
                  expect( $element.hasClass( 'false' ) ).toBe( false );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'hides the tooltip', function() {
                  jasmine.clock().tick( 100 );
                  expect( $.fn.tooltip ).toHaveBeenCalledWith( 'hide' );
               } );

            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'and errors must not be displayed immediately', function() {

            beforeEach( function() {
               scope.$apply( function() {
                  scope.showImmediately = false;
               } );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'does not show a tooltip on focus', function() {
               $.fn.tooltip.calls.reset();
               $element.trigger( 'focusin' );
               expect( $.fn.tooltip ).not.toHaveBeenCalledWith( 'show' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sets the class "ax-error-pending" on the input field', function() {
               expect( $element.hasClass( 'ax-error-pending' ) ).toBe( true );
               expect( $element.hasClass( 'ax-error' ) ).toBe( false );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sets the validation-pending flag', function() {
               expect( $element.controller( 'axInput' ).validationPending ).toBe( true );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            describe( 'and validation is requested', function() {

               beforeEach( function() {
                  scope.$apply( function() {
                     scope.$broadcast( 'axInput.validate' );
                  } );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'shows a tooltip on focus', function() {
                  $.fn.tooltip.calls.reset();
                  $element.trigger( 'focusin' );
                  expect( $.fn.tooltip ).toHaveBeenCalledWith( jasmine.any( Object ) );
                  jasmine.clock().tick( 0 );
                  expect( $.fn.tooltip ).toHaveBeenCalledWith( 'show' );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'sets the class "ax-error" on the input field', function() {
                  expect( $element.hasClass( 'ax-error' ) ).toBe( true );
                  expect( $element.hasClass( 'ax-error-pending' ) ).toBe( false );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               it( 'clears the validation-pending flag', function() {
                  expect( $element.controller( 'axInput' ).validationPending ).toBe( false );
               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               describe( 'and then the form is reset using $setPristine', function() {

                  beforeEach( function() {
                     scope.$apply( function() {
                        $element.controller( 'ngModel' ).$setPristine();
                     } );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'does not show a tooltip on focus', function() {
                     $.fn.tooltip.calls.reset();
                     $element.focus();
                     expect( $.fn.tooltip ).not.toHaveBeenCalledWith( 'show' );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'sets the class "ax-error-pending" on the input field', function() {
                     expect( $element.hasClass( 'ax-error' ) ).toBe( false );
                     expect( $element.hasClass( 'ax-error-pending' ) ).toBe( true );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'sets the validation-pending flag', function() {
                     expect( $element.controller( 'axInput' ).validationPending ).toBe( true );
                  } );

               } );

               ///////////////////////////////////////////////////////////////////////////////////////////////

               describe( 'and then the control is reset using the axInput.setPristine event', function() {

                  beforeEach( function() {
                     scope.$apply( function() {
                        scope.$broadcast( 'axInput.setPristine' );
                     } );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'does not show a tooltip on focus', function() {
                     $.fn.tooltip.calls.reset();
                     $element.focus();
                     expect( $.fn.tooltip ).not.toHaveBeenCalledWith( 'show' );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'sets the class "ax-error-pending" on the input field', function() {
                     expect( $element.hasClass( 'ax-error' ) ).toBe( false );
                     expect( $element.hasClass( 'ax-error-pending' ) ).toBe( true );
                  } );

                  ////////////////////////////////////////////////////////////////////////////////////////////

                  it( 'sets the validation-pending flag', function() {
                     expect( $element.controller( 'axInput' ).validationPending ).toBe( true );
                  } );

               } );
            } );

         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'for type select', function() {

         var scope;
         beforeEach( function() {
            scope = $rootScope.$new();
            scope.$apply( function() {
               scope.showImmediately = false;
               scope.opts = [ 'A', 'B', 'C' ];
               scope.someValue = 'A';
            } );
         } );

         var $element;
         beforeEach( function() {
            scope.$apply( function() {
               $element = $compile( '<select ax-input ax-input-required="true" ' +
                                    ' ng-model="scope.someValue" ng-options="value for value in opts"><option value="">Nothing</option></select>' )( scope );
               $element.appendTo( 'body' );
            } );
            $element.trigger( 'focusin' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         afterEach( function() {
            $element.remove();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'configures the tooltip to open to either left or right', function() {
            var options = $.fn.tooltip.calls.argsFor(0)[0];
            expect( [ 'left', 'right' ].indexOf( options.placement() ) ).not.toBe( -1 );
         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An AxInputController', function() {

      var DEFAULT_FORMATTING = {
         groupingSeparator: '.',
         decimalSeparator: ',',
         decimalPlaces: 2,
         decimalTruncation: 'FIXED',
         dateFormat: 'DD.MM.YYYY',
         dateFallbackFormats: [ 'YY', 'YYYY', 'MM.YY', 'MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD' ],
         timeFormat: 'HH:mm',
         timeFallbackFormats: [ 'HH', 'HH:mm', 'HHmm' ]
      };
      var controller;

      beforeEach( ng.mock.module( helpers.provideWidgetServices( function( services ) {
         axConfiguration = services.axConfiguration;
         axI18n = services.axI18n;
      } ) ) );
      beforeEach( ng.mock.module( inputModule.name ) );
      beforeEach( ng.mock.inject( function( $controller ) {
         controller = $controller( 'AxInputController' );
      } ) );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'must be initialized with a supported type and formatting options', function() {
         expect( function() { controller.initialize( 'date', DEFAULT_FORMATTING ); } ).not.toThrow();
         expect( function() { controller.initialize( 'time', DEFAULT_FORMATTING ); } ).not.toThrow();
         expect( function() { controller.initialize( 'decimal', DEFAULT_FORMATTING ); } ).not.toThrow();
         expect( function() { controller.initialize( 'integer', DEFAULT_FORMATTING ); } ).not.toThrow();
         expect( function() { controller.initialize( 'string', DEFAULT_FORMATTING ); } ).not.toThrow();
         expect( function() { controller.initialize( 'select', DEFAULT_FORMATTING ); } ).not.toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'throws an exception if the type is omitted or unsupported', function() {
         var assertionError =
            'Assertion error: State does not hold. ' +
            'Details: Type has to be one of \\[date, time, decimal, integer, string, select] but got ';

         expect( function() { controller.initialize( null, DEFAULT_FORMATTING ); } )
            .toThrow( new Error( assertionError + 'null.' ) );
         expect( function() { controller.initialize( 'boolean', DEFAULT_FORMATTING ); } )
            .toThrow( new Error( assertionError + 'boolean.' ) );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when correctly initialized', function() {

         beforeEach( function() {
            controller.initialize( 'decimal', DEFAULT_FORMATTING );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'has a public property for the value type', function() {
            expect( controller.valueType ).toEqual( 'decimal' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'instantiates a parser for the given type', function() {
            expect( controller.parse( '12.345,12' ) )
               .toEqual( { ok: true, value: 12345.12 } );
            expect( controller.parse( 'Hi' ) ).toEqual( { ok: false } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'instantiates a formatter for the given type', function() {
            expect( controller.format( 12345.12 ) ).toEqual( '12.345,12' );
            expect( function() { controller.format( 'Hi' ); } )
               .toThrow( new Error( 'Expected argument of type number, but got "string". Value: Hi' ) );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'for type select', function() {

         beforeEach( function() {
            controller.initialize( 'select', DEFAULT_FORMATTING );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'creates a parser simply returning the identity of the input (jira ATP-7858)', function() {
            expect( controller.parse( { my: 'object' } ) )
               .toEqual( { ok: true, value: { my: 'object' } } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'creates a formatter simply returning the identity of the input (jira ATP-7858)', function() {
            expect( controller.format( { my: 'object' } ) )
               .toEqual( { my: 'object' } );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'supports registration of semantic validators as validation and separate message function', function() {
         expect( function() {
            controller.addSemanticValidator();
         } ).toThrow();
         expect( function() {
            controller.addSemanticValidator( function(){} );
         } ).toThrow();
         expect( function() {
            controller.addSemanticValidator( function(){}, function(){} );
         } ).not.toThrow();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'with registered semantic validators', function() {

         var successfulValidator;
         var successfulMessage;
         var failingValidator;
         var failingMessage;
         var result;

         beforeEach( function() {
            successfulValidator = jasmine.createSpy( 'successfulValidator' ).and.returnValue( true );
            successfulMessage = jasmine.createSpy( 'successfulMessage' ).and.returnValue( 'Dont call on me!' );
            failingValidator = jasmine.createSpy( 'failingValidator' ).and.returnValue( false );
            failingMessage = jasmine.createSpy( 'failingMessage' ).and.returnValue( 'There was an error.' );

            controller.addSemanticValidator( successfulValidator, successfulMessage );
            controller.addSemanticValidator( failingValidator, failingMessage );
            controller.addSemanticValidator( failingValidator, failingMessage );

            result = controller.performSemanticValidations( 12345 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'calls all validators with the given value', function() {
            expect( successfulValidator.calls.count() ).toEqual( 1 );
            expect( successfulValidator.calls.argsFor(0)[0] ).toEqual( 12345 );

            expect( failingValidator.calls.count() ).toEqual( 2 );
            expect( failingValidator.calls.argsFor(0)[0] ).toEqual( 12345 );
            expect( failingValidator.calls.argsFor(1)[0] ).toEqual( 12345 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'calls the message factories for all failing validators with the given value', function() {
            expect( successfulMessage.calls.count() ).toEqual( 0 );

            expect( failingMessage.calls.count() ).toEqual( 2 );
            expect( failingMessage.calls.argsFor(0)[0] ).toEqual( 12345 );
            expect( failingMessage.calls.argsFor(1)[0] ).toEqual( 12345 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'returns the error messages of all failed validators', function() {
            expect( result ).toEqual( [ 'There was an error.', 'There was an error.' ] );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'allows configuration of custom messages providers', function() {
         controller.setCustomValidationMessageProvider( function() {
            return {
               ERROR_1: 'Error one',
               ERROR_2: 'Error two with [subst].'
            };
         } );

         expect( controller.message( 'ERROR_1' ) ).toEqual( 'Error one' );
         expect( controller.message( 'ERROR_2', { subst: 'more info' } ) )
            .toEqual( 'Error two with more info.' );
      } );

   } );

   ////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'An axInputValidationMessage directive', function() {

      var scope;
      var element;
      var axInputController;

      beforeEach( ng.mock.module( helpers.provideWidgetServices( function( services ) {
         axConfiguration = services.axConfiguration;
         axI18n = services.axI18n;
      } ) ) );
      beforeEach( ng.mock.module( inputModule.name ) );
      beforeEach( function() {
         ng.mock.module( function( $provide ) {
            $provide.decorator( '$controller', function( $delegate ) {
               return function( controllerName ) {
                  var controller = $delegate.apply( null, arguments );
                  var constructor;
                  if( controllerName === 'AxInputController' ) {
                     axInputController = controller();
                     constructor = function() {
                        return axInputController;
                     };

                     Object.keys( axInputController ).forEach( function( prop ) {
                        if( typeof axInputController[ prop ] === 'function' ) {
                           spyOn( axInputController, prop ).and.callThrough();
                        }
                     } );
                     Object.keys( controller ).forEach( function( prop ) {
                        constructor[ prop ] = controller[ prop ];
                     } );

                     return constructor;
                  }
                  return controller;
               };
            } );
         } );

         ng.mock.inject( function( $compile, $rootScope ) {
            scope = $rootScope.$new();
            scope.value = 'Hi there';
            scope.validationMessage = 'This is wrong!';
            element = $compile( '<input ng-model="value" ax-input="string" ax-input-validation-message="validationMessage">' )( scope );
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'sets a message provider function on the axInputController', function() {
         expect( axInputController.setCustomValidationMessageProvider )
            .toHaveBeenCalledWith( jasmine.any( Function ) );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns the currently bound error message in its message provider function', function() {
         var func = axInputController.setCustomValidationMessageProvider.calls.argsFor(0)[0];
         expect( func() ).toEqual( 'This is wrong!' );
      } );

   } );

} );
