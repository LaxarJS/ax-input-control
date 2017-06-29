/**
 * Copyright 2015-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( function() {
   return {
      provideWidgetServices: provideWidgetServices,
      triggerDomEvent: triggerDomEvent,
      jQueryCompile: jQueryCompile
   };

   function jQueryCompile( $, $compile ) {
      return function( source ) {
         var compiled = $compile( source );
         return function( scope ) {
            // Ensure that the returned element wrapper includes the complete jQuery api. This makes the
            // configuration of jQuery as AngularJS dependency redundant.
            var element = compiled( scope );
            var $element = $( element );
            // We just have to re-attach the angular-specific controller method to the jQuery object again
            $element.controller = element.controller;
            return $element;
         };
      };
   }

   function provideWidgetServices( callback ) {
      return function( $provide ) {
         var configuration = {
            i18n: {
               locales: {
               }
            }
         };
         var i18n = {
            locale: 'default',
            tags: {
               default: 'de_DE'
            }
         };

         axConfiguration = {
            get: jasmine.createSpy( 'get' ).and.callFake( function( key, fallback ) {
               return configuration.hasOwnProperty( key ) ? configuration[ key ] : fallback;
            } ),
            set: function( key, value ) {
               configuration[ key ] = value;
            }
         };

         axI18n = {
            whenLocaleChanged: jasmine.createSpy( 'whenLocaleChanged' ),
            localize: jasmine.createSpy( 'localize' ).and.callFake( function( i18nValue, optionalFallback ) {
               var languageTag = axI18n.languageTag();
               if( i18nValue && typeof i18nValue === 'object' ) {
                  return i18nValue[ languageTag ] || i18nValue[ languageTag.substr( 0, 2 ) ] || i18nValue.en || optionalFallback;
               }
               return i18nValue;
            } ),
            languageTag: jasmine.createSpy( 'languageTag' ).and.callFake( function() {
               if( !i18n || !i18n.hasOwnProperty( 'tags' ) ) {
                  return 'en';
               }
               return i18n.tags[ i18n.locale ] || 'en';
            } )
         };

         var axWidgetServices = {
            axConfiguration: axConfiguration,
            axI18n: axI18n
         };
         if( callback ) {
            callback( axWidgetServices );
         }
         $provide.value( 'axWidgetServices', axWidgetServices );
      };
   }

   function triggerDomEvent( element, type ) {
      var event;
      var className = 'Event';
      var bubbles = true;
      var cancelable = true;
      switch( type ) {
         case 'keypress':
         case 'keydown':
            className = 'KeyboardEvent';
            break;
         case 'focusin':
         case 'focusout':
            cancelable = false;
            className = 'FocusEvent';
            break;
         case 'focus':
         case 'blur':
            bubbles = false;
            cancelable = false;
            className = 'FocusEvent';
            break;
      }

      try {
         event = new window[ className ]( type, {
            bubbles: bubbles,
            cancelable: cancelable
         } );
      }
      catch( error ) {
         event = document.createEvent( className );
         event.initEvent( type, bubbles, cancelable );
      }

      element.dispatchEvent( event );
   }

} );
