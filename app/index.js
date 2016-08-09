// Vendors
require('angular');

// Styles
require('angular-tooltips/lib/angular-tooltips.scss');
require('./app.scss');

// App
require('./app.module.js');

// Bootstrap the angular app (if it hasn't been done already)
var appScope = angular.element(document.querySelectorAll('.app')).scope()
if( typeof appScope === 'undefined' || appScope === null ){
    angular.bootstrap(document, ['app'])
}
