'use strict';

var $requires = [
    '$stateProvider',
    '$urlRouterProvider',
    '$locationProvider'
];

var route = function( $stateProvider, $urlRouterProvider, $locationProvider ){
    $urlRouterProvider.otherwise('/');
    $locationProvider.html5Mode( true );

    $urlRouterProvider.rule(function($injector, $location){
        var path = $location.path();
        var hasTrailingSlash = path[path.length - 1] === '/';

        if( !hasTrailingSlash ){
            return path += '/'
        }
    });
}

route.$inject = $requires;
module.exports = route;
