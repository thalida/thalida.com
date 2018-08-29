var App = angular.module('App', ['ngRoute', 'appServices', 'appFilters', 'appControllers']);

App.value( 'ForecastIO', new ForecastIO() );

App.config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/home', {
            templateUrl: 'public/partials/home.html'
        })
        .when('/about', {
            templateUrl: 'public/partials/about.html'
        })
        .when('/project/:projectId', {
            templateUrl: 'public/partials/project.html'
        })
        .otherwise({
            redirectTo: '/home'
        });
  }]);