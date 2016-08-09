'use strict';

var ngstorage = require('ngstorage');

angular.module('app', [
	require('angular-animate'),
	require('angular-resource'),
	require('angular-sanitize'),
	require('angular-touch'),
    require('angular-ui-router'),
    require('angular-tooltips'),
	'ngStorage',
	'app.main'
])
.config( require('./app.route.js') )
.config(['tooltipsConfProvider', function ( tooltipsConfProvider ){
    tooltipsConfProvider.configure({
        'smart' : true,
        'size'  : 'small',
        'speed' : 'medium'
    });
}]);

// Constants
require('./app.constants.js');

// Views
require('./views/main');
