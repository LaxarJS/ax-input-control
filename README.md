# AxInputControl

This directive can be used in combination with ngModel to enrich a simple input field with type information in order to perform automatic syntactical validation, parsing and formatting.
Additionally it is possible to add semantical validators based on simple AngularJS directives using a simple interface of a controller defined within the input directive.
Whenever there is an error (be it semantical or syntactical) a tooltip is shown as long as the input field is focussed.
Additionally the input field receives the class `ax-error`.

Supported value types are `string`, `decimal`, `integer`, `date` and `time`.

Basic semantic validation directives that are already available are:
- `ax-input-required` (all types): Requires a value to be entered into the input field
- `ax-input-maximum-value="$maximum"` (all except string): requires the value to be below or equal to `$maximum`.
  For dates the value `'now'` can also be used.
- `ax-input-minimum-value="$minimum"` (all except string): requires the value to be greater or equal to `$minimum`.
  For dates also the value `'now'` can be used.
- `ax-input-range="$minimum, $maximum"` (all except string): requires the value to be greater or equal to `$minimum` AND below or equal to `$maximum`
- `ax-input-maximum-length="$maximumLength"` (string only): requires the string's length to be below or equal to `$maximumLength`
- `ax-input-minimum-length="$minimumLength"` (string only): requires the string's length to be greater than or equal to `$minimumLength`
- `ax-input-display-errors-immediately="$immediately"`: If `$immediately` evaluates to `true`, validation errors are presented to the user immediately by CSS styling and tooltip.
  Otherwise, errors are only shown when the field has been changed (ngModelController.$dirty) or when the event `axInput.validate` has been received.
  The default is `true` but will be changed to `false` in future major releases.
  It can be changed using the configuration 'controls.ax-input-control.displayErrorsImmediately'.
  
Writing an own semantic validator is as easy as writing a directive requiring the axInputController and calling `addSemanticValidator` with the validator function as first argument and an error message generator function as second argument.
A look at the [included semantic validators](lib/builtin_validators.js) should be sufficient to know how this works.

Formatting of the displayed value can be controlled using the `ax-input-formatting` attribute.
This takes an object having the following entries:
- *groupingSeparator* (default: `.`): Grouping seperator for decimal and integer values
- *decimalSeparator* (default: `,`): Decimal separator for decimal values
- *decimalPlaces* (default: 2): Number of decimal places to display. Applies rounding if necessary.
- *decimalTruncation* (default: `FIXED`): How to treat insignificant decimal places (trailing zeros):
  - `FIXED`: uses a fraction length of exactly `decimalPlaces`, padding with zeros
  - `BOUNDED`: uses a fraction length up to `decimalPlaces`, no padding
  - `NONE`: unbounded fraction length (only limited by numeric precision), no padding
- *dateFormat* (default: `MM/DD/YYYY`): Format for date values
- *dateTwoDigitYearWrap* (default: 68): the two digit year value where below or equal 20xx is assumed and above 19xx
- *timeFormat*: (default: `HH:mm`): Format for time values
- *dateFallbackFormats*: an array of formats to try parsing the value when using `dateFormat` fails
- *timeFallbackFormats*: an array of formats to try parsing the value when using `timeFormat` fails
Formats for date and time are given in [Moment.js](http://momentjs.com/docs/#/displaying/format/) syntax.

**Examples:**

A required decimal input with maximum value:
```js
<input ng-model="someDecimal"
       ax-input="decimal"
       ax-input-maximum-value="100000"
       ax-input-required="true">
```
A date input with value range and date picker control:
```js
<input ng-model="someDate"
       ax-input="date"
       ax-input-range="'2010-01-02, 2014-03-01'"
       ax-input-required="true"
       ax-datepicker>
```
A decimal input with special formatting:
```js
<input ng-model="someDecimal"
       ax-input="decimal"
       ax-input-formatting="{groupingSeparator: '_', decimalPlaces: 4}">
```

## Installation

To retrieve a copy of this control you can either clone it directly using git or alternatively install it via Bower.
For general information on installing, styling and optimizing controls, have a look at the [LaxarJS documentation](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/installing_controls.md).

### Setup Using Bower

Install the control:

```sh
bower install laxarjs.ax-input-control
```

Add RequireJS paths for the jQuery dependency to your `require_config.js`, if you have not already done so:

```js
   paths: [
      // ...
      jquery: 'jquery/dist/jquery'
   ]
```

Since Moment.js internally loads own assets (for example i18n files) using a CommonJS style, we need to set it up as a package in the `require_config.js`:

```js
   packages: [
      // ...
      {
         name: 'moment',
         location: 'moment',
         main: 'moment'
      }
   ]
```

Reference the control from the `widget.json` of your widget:

```json
   "controls": [ "laxarjs.ax-input-control" ]
```
