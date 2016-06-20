/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'jquery',
   'angular',
   'laxar',
   'laxar-uikit',
   'bootstrap/tooltip',
   './lib/helpers',
   './lib/builtin_validators',
   'json!./messages.json'
], function( $, ng, ax, ui, bootstrapTooltip, helpers, builtinValidators, messages ) {
   'use strict';

   var assert = ax.assert;

   var ERROR_CLASS = 'ax-error';
   var ERROR_PENDING_CLASS = 'ax-error-pending';
   var ERROR_KEY_SYNTAX = 'syntax';
   var ERROR_KEY_SEMANTIC = 'semantic';

   var EVENT_VALIDATE = 'axInput.validate';

   // This currently is duplicated in builtin_validators.js.
   // Thus when changing this here, remember to change it there ...
   var EVENT_REFRESH = 'axInput._refresh';

   var DEFAULT_FORMATTING = {
      groupingSeparator: ',',
      decimalSeparator: '.',
      decimalPlaces: 2,
      decimalTruncation: 'FIXED',
      dateFormat: 'M/D/YYYY',
      dateFallbackFormats: [ 'M/D/YY', 'D.M.YY', 'D.M.YYYY', 'YYYY-M-D' ],
      dateTwoDigitYearWrap: 68,
      timeFormat: 'H:m',
      timeFallbackFormats: [ 'H', 'HHmm' ]
   };

   var KNOWN_TYPES = [ 'date', 'time', 'decimal', 'integer', 'string', 'select' ];

   var ERROR_CLASS_REGEXP = new RegExp( '(^| )' + ERROR_CLASS + '( |$)', 'g' );
   var ERROR_PENDING_CLASS_REGEXP = new RegExp( '(^| )' + ERROR_PENDING_CLASS + '( |$)', 'g' );

   // because the title attribute confuses bootstrap-tooltip, temporarily store it under this attribute
   var TOOLTIP_SOURCE_TITLE = 'ax-input-source-title';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function configValue( key, fallback ) {
      return ax.configuration.get( 'lib.laxar-uikit.controls.input.' + key, fallback );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var controllerName = 'AxInputController';
   var controller = [ function() {
      var validators = [];

      ax.object.extend( this, {

         initialize: function( type, formattingOptions, languageTagProvider ) {
            assert.state(
               KNOWN_TYPES.indexOf( type ) !== -1,
               'Type has to be one of \\[' + ( KNOWN_TYPES.join( ', ' ) ) + '] but got ' + type + '.'
            );

            this.valueType = type;
            this.parse = createParser( type, formattingOptions );
            this.format = createFormatter( type, formattingOptions );

            this.languageTagProvider = languageTagProvider;
            this.messagesProvider = this.defaultMessagesProvider = function() {
               return ax.i18n.localizeRelaxed( languageTagProvider(), messages );
            };
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         valueType: null,

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         parse: $.noop,

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         format: $.noop,

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         addSemanticValidator: function( validationFunction, messageFunction ) {
            assert( validationFunction ).hasType( Function ).isNotNull();
            assert( messageFunction ).hasType( Function ).isNotNull();

            validators.push( {
               validate: validationFunction,
               createMessage: messageFunction
            } );
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         performSemanticValidations: function( value ) {
            var validationMessages = [];
            validators.forEach( function( entry ) {
               if( !entry.validate( value ) ) {
                  validationMessages.push( entry.createMessage( value ) );
               }
            } );
            return validationMessages;
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         setCustomValidationMessageProvider: function( messagesProvider ) {
            if( typeof messagesProvider === 'function' ) {
               this.messagesProvider = messagesProvider;
            }
            else {
               this.messagesProvider = this.defaultMessagesProvider;
            }
         },

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         message: function( key, optionalSubstitutions ) {
            var messageOrMessages = this.messagesProvider();
            var message = messageOrMessages[ key ] || messageOrMessages;
            if( !message || ( typeof message === 'object' && !message.hasOwnProperty( key ) ) ) {
               return ax.string.format(
                  'No message found for language tag "[languageTag]" and key "[key]".', {
                     key: key,
                     languageTag: this.languageTagProvider()
                  }
               );
            }
            return optionalSubstitutions ? ax.string.format( message, optionalSubstitutions ) : message;
         }

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createParser( type, formattingOptions ) {
         if( type === 'select' ) {
            return function( value ) {
               return ui.parser.success( value );
            };
         }
         return ui.parser.create( type, formattingOptions );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createFormatter( type, formattingOptions ) {
         if( type === 'select' ) {
            return function( value ) {
               return value;
            };
         }
         return ui.formatter.create( type, formattingOptions );
      }

   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var directiveName = 'axInput';
   var directive = [ '$injector', '$window', function( $injector, $window ) {

      var $animate = $injector.has( '$animate' ) ? $injector.get( '$animate' ) : {
         enabled: function() {
            throw new Error( 'UNREACHABLE' );
         }
      };

      var idCounter = 0;
      var defaultDisplayErrorsImmediately = configValue( 'displayErrorsImmediately', true );

      return {
         restrict: 'A',
         priority: 8,
         controller: controllerName,
         require: [ 'ngModel', 'axInput' ],
         link: function( scope, element, attrs, controllers ) {
            var removeGroupingAndKeepCursorPositionTimeout;
            var validationMessage = '';
            var previousValidationMessage = '';

            var ngModelController = controllers[0];
            var axInputController = controllers[1];
            var formattingOptions = getFormattingOptions( scope, attrs );

            scope.$watch( 'i18n', updateFormatting, true );
            scope.$watch( attrs.axInputFormatting, updateFormatting, true );

            function languageTagProvider() {
               return ui.i18n.languageTagFromScope( scope );
            }

            function updateFormatting( newValue, oldValue ) {
               if( newValue === oldValue ) { return; }
               formattingOptions = getFormattingOptions( scope, attrs );
               axInputController.initialize( valueType, formattingOptions, languageTagProvider );
               ngModelController.$viewValue = axInputController.format( ngModelController.$modelValue );
               runFormatters();
               ngModelController.$render();
            }

            var valueType = ( isCheckbox( element ) || isRadio( element ) || isSelect( element ) ) ?
               'select' : attrs[ directiveName ] || 'string';

            scope.$on( '$destroy', function() {
               clearTimeout( removeGroupingAndKeepCursorPositionTimeout );
               clearTimeout( fixTooltipPositionTimeout );
            } );

            var tooltipId;
            var fixTooltipPositionTimeout;
            var tooltipHideInProgress = false;
            var tooltipHolder = attrs.axInputTooltipOnParent !== undefined ?
               element.parent() :
               element;

            axInputController.initialize( valueType, formattingOptions, languageTagProvider );

            initializeDisplayErrors();

            //////////////////////////////////////////////////////////////////////////////////////////////////

            scope.$on( EVENT_REFRESH, function() {
               $animate.enabled( false );
               // force re-validation by running all parsers
               var value = ngModelController.$viewValue;
               ngModelController.$parsers.forEach( function( f ) {
                  value = f( value );
               } );
               $animate.enabled( true );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function initializeDisplayErrors() {
               var displayErrorsImmediately;
               var displayErrorsImmediatelyBinding = attrs.axInputDisplayErrorsImmediately;
               if( displayErrorsImmediatelyBinding ) {
                  displayErrorsImmediately = scope.$eval( displayErrorsImmediatelyBinding );
                  scope.$watch( displayErrorsImmediatelyBinding, function( newValue, oldValue ) {
                     if( newValue === oldValue ) { return; }
                     displayErrorsImmediately = newValue;
                     axInputController.validationPending = !newValue;
                     runFormatters();
                  } );
               }
               else {
                  displayErrorsImmediately = defaultDisplayErrorsImmediately;
               }
               axInputController.validationPending = !displayErrorsImmediately;

               scope.$on( EVENT_VALIDATE, function() {
                  if( !axInputController.validationPending ) { return; }
                  axInputController.validationPending = false;
                  runFormatters();
               } );

               // Override $setPristine to make sure tooltip and css classes are reset when form is reset
               var ngSetPristine = ngModelController.$setPristine.bind( ngModelController );
               ngModelController.$setPristine = function() {
                  ngSetPristine();
                  axInputController.validationPending = !displayErrorsImmediately;
                  runFormatters();
               };
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function runFormatters() {
               ngModelController.$formatters.reduceRight( function( acc, f ) {
                  return f( acc );
               }, ngModelController.$modelValue );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function mustDisplayErrors() {
               return !axInputController.waitingForBlur &&
                  ( ngModelController.$dirty || !axInputController.validationPending );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            var hasFocus = false;
            tooltipHolder.on( 'focusin', function( event ) {
               if( hasFocus ) { return; }
               hasFocus = true;
               if( ngModelController.$invalid && mustDisplayErrors() ) {
                  showTooltip();
               }

               if( [ 'decimal', 'integer' ].indexOf( valueType ) !== -1 ) {
                  if( !ngModelController.$error[ ERROR_KEY_SYNTAX ] ) {
                     removeGroupingAndKeepCursorPosition();
                  }
               }

               tooltipHolder.one( 'focusout', function( e ) {
                  hasFocus = false;
                  hideTooltip();
                  if( valueType === 'select' ) {
                     // Prevent reformatting of the value for select/radio (AngularJS takes care of them).
                     return;
                  }
                  if( !ngModelController.$error[ ERROR_KEY_SYNTAX ] ) {
                     element.val( axInputController.format( ngModelController.$modelValue ) );
                  }
               } );
            } );


            //////////////////////////////////////////////////////////////////////////////////////////////////

            ngModelController.$formatters.push( toggleErrorClass );
            ngModelController.$formatters.push( toggleTooltip );
            ngModelController.$formatters.push( valueFormatter);
            ngModelController.$formatters.push( semanticValidation );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            var lastValidValue = null;
            ngModelController.$parsers.unshift( toggleErrorClass );
            ngModelController.$parsers.unshift( toggleTooltip );
            ngModelController.$parsers.unshift( semanticValidation );
            ngModelController.$parsers.unshift( valueParser );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            // Using named functions for formatters and parsers here for three reasons:
            // better readability, easier testing and better debugging.
            function valueParser( value ) {
               var result = axInputController.parse( value );
               ngModelController.$setValidity( ERROR_KEY_SYNTAX, result.ok );
               previousValidationMessage = validationMessage;
               if( result.ok ) {
                  lastValidValue = result.value;
                  validationMessage = '';
               }
               else {
                  validationMessage = axInputController.message( 'SYNTAX_TYPE_' + valueType.toUpperCase() );
               }
               return lastValidValue;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function valueFormatter( value ) {
               return axInputController.format( value );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function semanticValidation( value ) {
               if( ngModelController.$error[ ERROR_KEY_SYNTAX ] === true ) { return value; }

               var validationMessages = axInputController.performSemanticValidations( value );
               var valid = validationMessages.length === 0;

               ngModelController.$setValidity( ERROR_KEY_SEMANTIC, valid );
               validationMessage = valid ? '' : validationMessages[0];

               return value;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function removeGroupingAndKeepCursorPosition() {
               var focusFormat = ui.formatter.create( valueType, ax.object.options( {
                  groupingSeparator: ''
               }, formattingOptions ) );

               // We need to do this asynchronously because of Google Chrome.
               clearTimeout( removeGroupingAndKeepCursorPositionTimeout );
               removeGroupingAndKeepCursorPositionTimeout = setTimeout( function() {
                  var selection = {
                     start: element[0].selectionStart,
                     end: element[0].selectionEnd
                  };
                  var elementValue = element.val();
                  var wasProbablyTabbed = selection.start === 0 && selection.end === element.val().length;

                  element.val( focusFormat( axInputController.parse( elementValue ).value ) );
                  if( !helpers.isActiveElement( element[0] ) ) {
                     // The user already selected another element. Thus prevent from stealing the focus here.
                     return;
                  }

                  if( wasProbablyTabbed ) {
                     element[0].setSelectionRange( 0, element.val().length );
                     return;
                  }

                  var newSelection = selection.end;
                  if( formattingOptions.groupingSeparator ) {
                     var noOfSeparators = elementValue.substr( 0, selection.end )
                           .split( formattingOptions.groupingSeparator ).length - 1;
                     newSelection -= noOfSeparators;
                  }

                  element[0].setSelectionRange( newSelection, newSelection );
               }, 0 );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function toggleErrorClass( value ) {
               var displayErrors = mustDisplayErrors();
               var axErrorState = ngModelController.$invalid && displayErrors;
               var axErrorPendingState = ngModelController.$invalid && !displayErrors;

               if( isRadio( element ) ) {
                  radioGroup().each( function( i, button ) {
                     updateErrorState( button );
                     updateErrorState( domLabel( button ) );
                  } );
               }
               else {
                  updateErrorState( element[0] );
                  updateErrorState( domLabel( element[0] ) );
               }

               /** Must be efficient, otherwise validation of larger forms *will* be slow (measured). */
               function domLabel( domElement ) {
                  var id = domElement.id;
                  if( id ) {
                     var domLabel = document.querySelector( 'label[for="' + id + '"]' );
                     if( domLabel ) { return domLabel; }
                  }
                  var domAncestor = domElement;
                  do {
                     domAncestor = domAncestor.parentNode;
                  } while ( domAncestor && domAncestor.nodeName !== 'label' );
                  return domAncestor;
               }

               /** Must be efficient, otherwise validation of larger forms *will* be slow (measured). */
               function updateErrorState( domElement ) {
                  if( !domElement ) { return; }
                  var className = domElement.className;
                  var hasErrorClass = ERROR_CLASS_REGEXP.test( className );
                  var hasErrorPendingClass = ERROR_PENDING_CLASS_REGEXP.test( className );
                  ERROR_CLASS_REGEXP.lastIndex = 0;
                  ERROR_PENDING_CLASS_REGEXP.lastIndex = 0;
                  if( axErrorState ) {
                     if( !hasErrorClass ) {
                        className += (' ' + ERROR_CLASS);
                     }
                  }
                  else if( axErrorPendingState && !hasErrorPendingClass ) {
                     className += ' ' + ERROR_PENDING_CLASS;
                  }

                  if( !axErrorState && hasErrorClass ) {
                     className = className.replace( ERROR_CLASS_REGEXP, ' ' );
                  }

                  if( !axErrorPendingState && hasErrorPendingClass ) {
                     className = className.replace( ERROR_PENDING_CLASS_REGEXP, ' ' );
                  }

                  domElement.className = className;
               }

               return value;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////
            // Tooltip handling
            //////////////////////////////////////////////////////////////////////////////////////////////////

            function showTooltip() {
               if( !tooltipId ) {
                  tooltipId = createTooltip();
               }
               if( tooltipHideInProgress ) {
                  tooltipHideInProgress = false;
                  return;
               }
               // always wait for initial render so that no adjustment is needed afterwards
               setTimeout( function() {
                  if( !tooltipId || tooltipHideInProgress ) { return; }
                  tooltipHolder.tooltip( 'show' );
               }, 0 );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function hideTooltip() {
               if( tooltipId ) {
                  tooltipHideInProgress = true;
                  // some custom controls (e.g. bootstrap-select) generate superflouus focusout events,
                  // so we delay the hiding:
                  setTimeout( function() {
                     if( !tooltipHideInProgress ) { return; }
                     tooltipHideInProgress = false;
                     destroyTooltip();
                  }, 25 );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function createTooltip() {
               var id = ++idCounter;
               var title = tooltipHolder.attr( 'title' );
               if( title != null ) {
                  tooltipHolder.attr( TOOLTIP_SOURCE_TITLE, title );
                  tooltipHolder.attr( 'title', null );
               }
               tooltipHolder.tooltip( {
                  animation: true,
                  trigger: 'manual',
                  title: tooltipMessage(),
                  template: tooltipTemplate(),
                  placement: tooltipPlacement(),
                  // 1. Stay in the same scroll container as the form element.
                  // 2. Climb up to get on top of nearby form controls (z-index-wise).
                  container: tooltipHolder.parent().parent()
               } )
               .on( 'shown.bs.tooltip', onTooltipShown )
               .on( 'hide.bs.tooltip', onTooltipHide );
               return id;

               ///////////////////////////////////////////////////////////////////////////////////////////////

               function tooltipMessage() {
                  return validationMessage;
               }

               function tooltipTemplate() {
                  return '<div data-ax-input-tooltip-id="' + id + '" class="tooltip error">' +
                  '<div class="tooltip-arrow"></div>' +
                  '<div class="tooltip-inner"></div>' +
                  '</div>';
               }

               function onTooltipShown() {
                  if( fixTooltipPositionTimeout !== null ) { return; }
                  var lastPosition = pos();
                  fixTooltipPositionTimeout = setTimeout( function() {
                     if( lastPosition === pos() ) { return; }
                     tooltipHolder.tooltip( 'show' );
                  }, 200 );

                  function pos() {
                     var position = element.offset();
                     return position.left + '_' + position.top;
                  }
               }

               function onTooltipHide() {
                  clearTimeout( fixTooltipPositionTimeout );
                  fixTooltipPositionTimeout = null;
               }

               function tooltipPlacement() {
                  var anchor = tooltipHolder[0];
                  return isSelect( element ) ?
                     function() {
                        var rect = anchor.getBoundingClientRect();
                        var screenWidth = $window.innerWidth;
                        return rect.left > Math.max( 0, screenWidth - rect.right ) ? 'left' : 'right';
                     } :
                     function() {
                        var rect = anchor.getBoundingClientRect();
                        var screenHeight = $window.innerHeight;
                        return ( screenHeight - rect.bottom ) > 150 ? 'bottom' : 'top';
                     };
               }

            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function destroyTooltip() {
               if( tooltipId ) {
                  var title = tooltipHolder.attr( TOOLTIP_SOURCE_TITLE );
                  if( title != null ) {
                     tooltipHolder.attr( 'title', title );
                     tooltipHolder.attr( TOOLTIP_SOURCE_TITLE, null );
                  }
                  tooltipHolder
                     .off( 'shown hidden' )
                     .tooltip( 'hide' )
                     .tooltip( 'destroy' );
                  clearTimeout( fixTooltipPositionTimeout );
                  $( '[data-ax-input-tooltip-id=' + tooltipId + ']' ).remove();
                  tooltipId = null;
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function toggleTooltip( value ) {
               if( ngModelController.$invalid && hasFocus && mustDisplayErrors() ) {
                  if( !tooltipId || previousValidationMessage !== validationMessage ) {
                     showTooltip();
                  }
               }
               else {
                  hideTooltip();
               }
               return value;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            scope.$on( '$destroy', function() {
               try {
                  destroyTooltip();
                  tooltipHolder.off( 'focusin focusout' );
               }
               catch( e ) {
                  // Ignore. DOM node has been destroyed before the directive.
               }
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function radioGroup() {
               var form = element.parents( 'form' ).first();
               return form.find( 'input[type="radio"][name="' + attrs.name + '"]' );
            }
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function getFormattingOptions( scope, attrs ) {
         var languageTag = ui.i18n.languageTagFromScope( scope );
         var momentFormat = ui.i18n.momentFormatForLanguageTag( languageTag );
         var numberFormat = ui.i18n.numberFormatForLanguageTag( languageTag );
         var format = ax.object.options( {
            decimalSeparator: numberFormat.d,
            groupingSeparator: numberFormat.g,
            dateFormat: momentFormat.date,
            timeFormat: momentFormat.time
         }, DEFAULT_FORMATTING );

         return ax.object.options( scope.$eval( attrs.axInputFormatting ), format );
      }

   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   // ngModelOptions: Forward application-wide defaults to the ngModel controller (if they have not been
   // overridden locally). To achieve this, the ngModel directive is decorated:
   // http://www.jonsamwell.com/angularjs-set-default-blur-behaviour-on-ngmodeloptions
   var configureNgModelOptions = [ '$provide', function( $provide ) {
      $provide.decorator( 'ngModelDirective', [ '$delegate', function( $delegate ) {
         var defaultNgModelOptions = configValue( 'ngModelOptions', {} );
         var directive = $delegate[ 0 ];
         var compile = directive.compile;
         directive.compile = function() {
            var link = compile.apply( this, arguments );
            return {
               pre: function( scope, element, attributes, controllers ) {
                  link.pre.apply( this, arguments );
                  if( !attributes[ directiveName ] || !isText( element ) ) {
                     return;
                  }

                  var ngModelController = controllers[ 0 ];
                  ng.forEach( defaultNgModelOptions, function( value, key ) {
                     // if the option is specified by the developer, leave it unmodified:
                     ngModelController.$options = ngModelController.$options || {};
                     if( !( key in ngModelController.$options ) ) {
                        ngModelController.$options[ key ] = ax.object.deepClone( value );
                     }
                  } );
               },
               post: function() {
                  link.post.apply( this, arguments );
               }
            };
         };
         return $delegate;
      } ] );
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var validationMessageDirectiveName = 'axInputValidationMessage';
   var validationMessageDirective = [ function() {
      return {
         restrict: 'A',
         require: 'axInput',
         priority: 12, // ensure linking after axInput and validators
         link: function( scope, element, attrs, axInputController ) {
            axInputController.setCustomValidationMessageProvider( function() {
               return scope.$eval( attrs[ validationMessageDirectiveName ] );
            } );
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isText( element ) {
      var el = element[0];
      return el.nodeName.toLowerCase() === 'input' && el.type === 'text' || !el.type;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isRadio( element ) {
      return element[0].nodeName.toLowerCase() === 'input' && element[0].type === 'radio';
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isCheckbox( element ) {
      return element[0].nodeName.toLowerCase() === 'input' && element[0].type === 'checkbox';
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isSelect( element ) {
      return element[0].nodeName.toLowerCase() === 'select';
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var module = ng.module( directiveName + 'Control', [] )
      .config( configureNgModelOptions )
      .controller( controllerName, controller )
      .directive( directiveName, directive )
      .directive( validationMessageDirectiveName, validationMessageDirective );

   return builtinValidators.addToModule( module );

} );
