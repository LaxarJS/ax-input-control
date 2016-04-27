# AxInputControl

> An AngularJS directive that adds powerful interactive validation to form elements, for LaxarJS widgets.

This directive can be used in combination with `ngModel` to enrich a simple input field with type information in order to perform automatic syntactical validation, parsing and formatting.
Additionally it is possible to add semantic validators based on simple AngularJS directives using a simple interface of a controller defined within the input directive.
Whenever there is an error (be it semantic or syntactic) a tooltip is shown as long as the input field is focused.
Additionally the input field receives the class `ax-error`.


## Installation

To retrieve a copy of this control you can either clone it directly using git or alternatively install it via Bower.
For general information on installing, styling and optimizing controls, have a look at the [LaxarJS documentation](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/installing_controls.md).

### Setup Using Bower

Install the control:

```sh
bower install laxar-input-control
```

Make sure that `moment`, `jquery` and `bootstrap` can be found by RequireJS.
For example, assuming that your `baseUrl` is `'bower_components'`, add this to the `paths` section of your `require_config.js`:

```js
jquery: 'jquery/dist/jquery',
'bootstrap': 'bootstrap-sass-official/assets/javascripts/bootstrap'
```

Since Moment.js internally loads its own assets (for example i18n files) using a CommonJS style, we need to set it up as a package in the `require_config.js`:

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

Additionally, it is necessary to specify the correct load order by adding a `shim` entry:

```js
shim: {
   // ...
   'bootstrap/tooltip': [ 'jquery' ]
}
```

Reference the control from the `widget.json` of your widget:

```json
"controls": [ "laxar-input-control" ]
```


## Usage

Add the `axInput` directive to your form controls, along with `ngModel`.
Supported value types for `ax-input` are `string`, `decimal`, `integer`, `date` and `time`.


### Examples

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


### Builtin Validation Directives

Basic semantic validation directives that are already available are:

- `ax-input-required` (all types): Requires a value to be entered into the input field
- `ax-input-maximum-value="$maximum"` (all except string): requires the value to be below or equal to `$maximum`.
  For dates the value `'now'` can also be used.
- `ax-input-minimum-value="$minimum"` (all except string): requires the value to be greater or equal to `$minimum`.
  For dates also the value `'now'` can be used.
- `ax-input-range="$minimum, $maximum"` (all except string): requires the value to be greater or equal to `$minimum` AND below or equal to `$maximum`
- `ax-input-maximum-length="$maximumLength"` (string only): requires the string's length to be below or equal to `$maximumLength`
- `ax-input-minimum-length="$minimumLength"` (string only): requires the string's length to be greater than or equal to `$minimumLength`
- `ax-input-tooltip-on-parent`: if set, the tooltip is attached to the parent of the form control.
- `ax-input-display-errors-immediately="$immediately"`: If `$immediately` evaluates to `true`, validation errors are presented to the user immediately by CSS styling and tooltip.
  Otherwise, errors are only shown when the field has been changed (ngModelController.$dirty) or when the event `axInput.validate` has been received.
  The default is `true` but will be changed to `false` in future major releases.
  It can be changed using the configuration 'lib.laxar-uikit.controls.input.displayErrorsImmediately'.

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


### Custom Validation Messages

The `axInput` control comes with a default set of [validation messages](messages.json) for its builtin validators, available for german (`de`) and english (`en` and `en_GB`) localization.
Although we may add some more localizations in the future (hey, this could be the chance for your first [contribution](CONTRIBUTING.md) ;-)) it may always be necessary to use custom validation messages in a widget.

This can be achieved by using the `axInputValidationMessage` directive.
Its value can be any valid *AngularJS* expression, that evaluates to either a map defining translations for any of the keys found in the provided [messages.json](messages.json) file, or a single string that should be used for any kind of validation error.

Example: Using a simple constant within a template
```html
<input ng-model="value"
       ax-input="decimal"
       ax-input-validation-message="'Please insert a correct decimal number.'">
```

Example: Binding to the scope of e.g. a widget
```html
<input ng-model="value"
       ax-input="decimal"
       ax-input-validation-message="validationMessages">
```

```js
$scope.value = 13;
$scope.validationMessages = {
   SYNTAX_TYPE_DECIMAL: 'Insert a valid decimal number!',
   // ... more messages
};
```
