/**
 * Copyright 2015 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
define( [
   'moment'
], function( moment ) {
   'use strict';

   var ISO_DATE_FORMAT = 'YYYY-MM-DD';
   var ISO_TIME_FORMAT = 'HH:mm:ss';

   function isActiveElement( element ) {
      return element === document.activeElement;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isInRange( valueType, from, to, value ) {
      return isGreaterOrEqual( valueType, from, value ) && isSmallerOrEqual( valueType, to, value );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isGreaterOrEqual( valueType, minimum, value ) {
      switch( valueType ) {
         case 'decimal':
         case 'integer':
            return parseFloat( minimum ) <= value;

         case 'date':
         case 'time':
            var mMinimum = toMoment( valueType, minimum );
            var mValue = toMoment( valueType, value );

            return mMinimum.isBefore( mValue ) || mMinimum.isSame( mValue );

         default:
            throw new Error( 'Unsupported type for comparisons: ' + valueType );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isSmallerOrEqual( valueType, maximum, value ) {
      switch( valueType ) {
         case 'decimal':
         case 'integer':
            return parseFloat( maximum ) >= value;

         case 'date':
         case 'time':
            var mMaximum = toMoment( valueType, maximum );
            var mValue = toMoment( valueType, value );

            return mMaximum.isAfter( mValue ) || mMaximum.isSame( mValue );

         default:
            throw new Error( 'Unsupported type for comparisons: ' + valueType );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /** @private */
   function toMoment( valueType, value ) {
      if( !value || value.toLowerCase() === 'now' ) {
         // just returning `moment()` isn't sufficient, as for dates the time is expected to be 00:00:00.
         // We thus take this rather pragmatic approach.
         value = moment().format( valueType === 'time' ? ISO_TIME_FORMAT : ISO_DATE_FORMAT );
      }
      return moment( value, valueType === 'time' ? ISO_TIME_FORMAT : ISO_DATE_FORMAT );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      isActiveElement: isActiveElement,
      isInRange: isInRange,
      isGreaterOrEqual: isGreaterOrEqual,
      isSmallerOrEqual: isSmallerOrEqual
   };

} );
