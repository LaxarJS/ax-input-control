/**
 * Copyright 2015-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'jquery',
   'angular',
   'laxar',
   'laxar-uikit',
   'imports-loader?jQuery=jquery!bootstrap/js/tooltip',
   './lib/helpers',
   './lib/builtin_validators',
   'json-loader!./messages.json'
], function( $, ng, ax, ui, bootstrapTooltip, helpers, builtinValidators, messages ) {
   'use strict';

   var assert = ax.assert;

   var ERROR_CLASS = 'ax-error';
   var ERROR_PENDING_CLASS = 'ax-error-pending';
   var ERROR_KEY_SYNTAX = 'syntax';
   var ERROR_KEY_SEMANTIC = 'semantic';

   // When received, perform validation on the control and enable display of errors (if currently off).
   var EVENT_VALIDATE = 'axInput.validate';
   // When received, reset validation state of the control (like calling ngModelController.$setPristine).
   var EVENT_RESET = 'axInput.setPristine';

   // This currently is duplicated in builtin_validators.js.
   // Thus when changing this here, remember to change it there ...
   var EVENT_REFRESH = 'axInput._refresh';

   var KNOWN_TYPES = [ 'date', 'time', 'decimal', 'integer', 'string', 'select' ];

   var ERROR_CLASS_REGEXP = new RegExp( '(^| )' + ERROR_CLASS + '( |$)', 'g' );
   var ERROR_PENDING_CLASS_REGEXP = new RegExp( '(^| )' + ERROR_PENDING_CLASS + '( |$)', 'g' );

   // because the title attribute confuses bootstrap-tooltip, temporarily store it under this attribute
   var TOOLTIP_SOURCE_TITLE = 'ax-input-source-title';

   var CONFIG_PREFIX = 'controls.laxar-input-control.';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var controllerName = 'AxInputController';
   var controller = [ 'axWidgetServices', function( services ) {
      var validators = [];

      var axI18n = services.axI18n;

      this.initialize = function( type, formattingOptions ) {
         assert.state(
            KNOWN_TYPES.indexOf( type ) !== -1,
            'Type has to be one of \\[' + ( KNOWN_TYPES.join( ', ' ) ) + '] but got ' + type + '.'
         );

         this.valueType = type;
         this.parse = createParser( type, formattingOptions );
         this.format = createFormatter( type, formattingOptions );

         this.messagesProvider = this.defaultMessagesProvider = function() {
            return axI18n.localize( messages );
         };
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      this.valueType = null;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      this.parse = $.noop;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      this.format = $.noop;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      this.addSemanticValidator = function( validationFunction, messageFunction ) {
         assert( validationFunction ).hasType( Function ).isNotNull();
         assert( messageFunction ).hasType( Function ).isNotNull();

         validators.push( {
            validate: validationFunction,
            createMessage: messageFunction
         } );
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      this.performSemanticValidations = function( value ) {
         var validationMessages = [];
         validators.forEach( function( entry ) {
            if( !entry.validate( value ) ) {
               validationMessages.push( entry.createMessage( value ) );
            }
         } );
         return validationMessages;
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      this.setCustomValidationMessageProvider = function( messagesProvider ) {
         if( typeof messagesProvider === 'function' ) {
            this.messagesProvider = messagesProvider;
         }
         else {
            this.messagesProvider = this.defaultMessagesProvider;
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      this.message = function( key, optionalSubstitutions ) {
         var messageOrMessages = this.messagesProvider();
         var message = messageOrMessages[ key ] || messageOrMessages;
         if( !message || ( typeof message === 'object' && !message.hasOwnProperty( key ) ) ) {
            return ax.string.format(
               'No message found for language tag "[languageTag]" and key "[key]".', {
                  key: key,
                  languageTag: axI18n.languageTag()
               }
            );
         }
         return optionalSubstitutions ? ax.string.format( message, optionalSubstitutions ) : message;
      };

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
   var directive = [ '$injector', '$window', 'axWidgetServices', function( $injector, $window, services ) {

      var $animate = $injector.has( '$animate' ) ? $injector.get( '$animate' ) : {
         enabled: function() {
            throw new Error( 'UNREACHABLE' );
         }
      };

      var axI18n = services.axI18n;
      var axConfiguration = services.axConfiguration;

      var idCounter = 0;
      var defaultDisplayErrorsImmediately = axConfiguration.get( CONFIG_PREFIX + 'displayErrorsImmediately', true );

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
            var formattingOptions = getFormattingOptions();

            axI18n.whenLocaleChanged( updateFormatting );
            scope.$watch( attrs.axInputFormatting, updateFormatting, true );

            function getFormattingOptions() {
               var options = scope.$eval( attrs.axInputFormatting );
               return ui.localized( axI18n ).options( options );
            }

            function updateFormatting( newValue, oldValue ) {
               if( newValue === oldValue ) { return; }
               formattingOptions = getFormattingOptions();
               axInputController.initialize( valueType, formattingOptions );
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
            var tooltipHolder = $( attrs.axInputTooltipOnParent !== undefined ?
               element.parent() :
               element );

            axInputController.initialize( valueType, formattingOptions );

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

            // Set the `validationPending` flag:
            //  - `true` indicates that the validation state needs to shown to the user as soon as the next
            //    `axInput.validate` event is received (or when the user modifies the control).
            //  - `false` indicates that the validation state is already being presented to the user.
            function setValidationPending( newValue ) {
               axInputController.validationPending = newValue;
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function initializeDisplayErrors() {
               var displayErrorsImmediately;
               var displayErrorsImmediatelyBinding = attrs.axInputDisplayErrorsImmediately;
               if( displayErrorsImmediatelyBinding ) {
                  displayErrorsImmediately = scope.$eval( displayErrorsImmediatelyBinding );
                  scope.$watch( displayErrorsImmediatelyBinding, function( newValue, oldValue ) {
                     if( newValue === oldValue ) { return; }
                     displayErrorsImmediately = newValue;
                     setValidationPending( !displayErrorsImmediately );
                     runFormatters();
                  } );
               }
               else {
                  displayErrorsImmediately = defaultDisplayErrorsImmediately;
               }
               setValidationPending( !displayErrorsImmediately );

               scope.$on( EVENT_VALIDATE, function() {
                  if( !axInputController.validationPending ) { return; }
                  setValidationPending( false );
                  runFormatters();
               } );

               // Override $setPristine to make sure tooltip and css classes are reset when form is reset
               var ngSetPristine = ngModelController.$setPristine.bind( ngModelController );
               function setPristine() {
                  ngSetPristine();
                  setValidationPending( !displayErrorsImmediately );
                  runFormatters();
               }
               ngModelController.$setPristine = setPristine;
               scope.$on( EVENT_RESET, setPristine );
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

            var showingTimeout;
            function showTooltip() {
               if( tooltipId && validationMessage && previousValidationMessage &&
                   validationMessage !== previousValidationMessage ) {
                  // must destroy tooltip to reflect updated text
                  destroyTooltip();
                  setTimeout( showTooltip, 0 );
                  return;
               }

               if( !tooltipId ) {
                  tooltipId = createTooltip();
               }
               if( tooltipHideInProgress ) {
                  tooltipHideInProgress = false;
                  return;
               }
               // always wait for initial render so that no adjustment is needed afterwards
               clearTimeout( showingTimeout );
               showingTimeout = setTimeout( function() {
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
                  var fixedPlacement = attrs.axInputTooltipPlacement;
                  if( fixedPlacement ) {
                     return function() {
                        return fixedPlacement;
                     };
                  }

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
               tooltipHideInProgress = false;
               if( tooltipId ) {
                  var title = tooltipHolder.attr( TOOLTIP_SOURCE_TITLE );
                  if( title != null ) {
                     tooltipHolder.attr( 'title', title );
                     tooltipHolder.attr( TOOLTIP_SOURCE_TITLE, null );
                  }
                  tooltipHolder.off( 'shown hidden' );
                  // Don't chain: tooltip returns the angular.element, without $.fn decorations
                  tooltipHolder.tooltip( 'hide' );
                  tooltipHolder.tooltip( 'destroy' );
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

   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   // ngModelOptions: Forward application-wide defaults to the ngModel controller (if they have not been
   // overridden locally). To achieve this, the ngModel directive is decorated:
   // http://www.jonsamwell.com/angularjs-set-default-blur-behaviour-on-ngmodeloptions
   var configureNgModelOptions = [ '$provide', function( $provide ) {
      $provide.decorator( 'ngModelDirective', [ '$delegate', 'axWidgetServices', function( $delegate, services ) {
         var axConfiguration = services.axConfiguration;
         var defaultNgModelOptions = axConfiguration.get( CONFIG_PREFIX + 'ngModelOptions', {} );
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

                  if( ngModelController.$options && ngModelController.$options.createChild ) {
                     // since Angular 1.6, see: https://github.com/angular/angular.js/issues/12884
                     var newOptions = ax.object.deepClone( defaultNgModelOptions );
                     newOptions['*'] = '$inherit';
                     ngModelController.$options = ngModelController.$options.createChild( newOptions );
                  }
                  else {
                     ng.forEach( defaultNgModelOptions, function( value, key ) {
                        // if the option is specified by the developer, leave it unmodified:
                        ngModelController.$options = ngModelController.$options || {};
                        if( !( key in ngModelController.$options ) ) {
                           ngModelController.$options[ key ] = ax.object.deepClone( value );
                        }
                     } );
                  }
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
