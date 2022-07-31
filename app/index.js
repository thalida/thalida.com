// Vendors
require('jquery');
require('angular');
require('moment');
require('jquery-color');

// Styles
require('angular-tooltips/lib/angular-tooltips.scss');
require('./app.scss');

// Assets
require('./assets/images');

// App
require('./app.module.js');
require('./services');
require('./components');
require('./views');

// Bootstrap the angular app (if it hasn't been done already)
var appScope = angular.element(document.querySelectorAll('.app')).scope()
if (typeof appScope === 'undefined' || appScope === null) {
    angular.bootstrap(document, ['app'])
}
