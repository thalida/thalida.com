'use strict';

//======================================================================
//
//	MAIN CONTROLLER
// 		The only controller used on the site, everything else is tucked
// 		away into various components and services #angular
//
//----------------------------------------------------------------------

var $requires = [
	'$scope',
	'$sce',
	'$q',
	'$http',
    'utils',
    'fancyTime',
	'fancyWeather',
    'visits',
    'PROJECTS',
    'ABOUT'
];

var MainController = function($scope, $sce, $q, $http, utils, fancyTime, fancyWeather, visits, PROJECTS, ABOUT) {
	var main = this;

    main.render = false;
	main.isInit = true;

	//	Main Init: Sets default values for objects and kicks off setting up
	// 	the fancy time and fancy weather used to render the scene
	//----------------------------------------------------------------------
	main.init = function(){
		// Updated visits counter
		visits.increment();
		main.totalVisits = visits.getTotal();

		// Get constants with ME information
		main.about = ABOUT;
		main.projectsList = PROJECTS;

		// For le copyright
        main.year = moment().format('Y');

		// Null and default settings
		main.geolocation = {
			statusType: null,
			statusText: null,
		};
        main.currFancyTime = null;
		main.currFancyWeather = null;
		main.lastUpdated = null;

		// Assign helper used in templats
	    main.sanitize = utils.sanitize;

		// PROMISE CHAINS
		main.initFancyTime()
			.then(main.getLocation)
			.then(main.initFancyWeather)
			.finally(function () {
				main.isInit = false;
			})
			.catch(function (err) {
				console.log('%cerr', 'color:green;', err);
				main.isInit = false;
			});

		// Let's not wait for all those promises to get back
		// Just start rendering stuffs
		main.render = true;
	}

	//	initFancyTime: Starts running the fancyTime and binds a callback
	//  to be run each time it updates
	//----------------------------------------------------------------------
	main.initFancyTime = function () {
		var deferred = $q.defer();
		var firstLoop = true;

		fancyTime.start(main.onFancyTimeChange);

		deferred.resolve();

		return deferred.promise;
	};

	// onFancyTimeChange: Called each time an update happens in the fancyTime service
	//----------------------------------------------------------------------
	main.onFancyTimeChange = function (newFancyTime) {
		main.currFancyTime = angular.copy(newFancyTime);
		main.lastUpdated = moment().format('MMM DD YYYY HH:mm:ss');
	};


	// getLocation: Using the google geolocation api, get the current location
	// of the site user
	//----------------------------------------------------------------------
	main.getLocation = function () {
		main.geolocation.statusType = "loading-location";

		var locationApi = 'https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyAdqHKcbHf0sWy0iyiKtXOuDEW-TLCNE6k';
		var locationQuery = $http.post($sce.trustAsResourceUrl(locationApi));

		return locationQuery
			.then(function (res) {
				main.geolocation.data = res.data.location;
				main.geolocation.statusType = 'success-location';

				// Update the location the the fancyWeather service
				fancyWeather.setLocation(main.geolocation.data);
			})
			.catch(function (err) {
				main.geolocation.statusType = 'error-location';
				main.geolocation.statusText = 'Unable to retrieve your location';
			});
	};

	//	initFancyWeather: Starts running the fancyWeather and binds a callback
	//  to be run each time it updates
	//----------------------------------------------------------------------
	main.initFancyWeather = function () {
		var deferred = $q.defer();

		main.geolocation.statusType = "loading-weather";

		fancyWeather.start(main.onFancyWeatherChange);

		deferred.resolve();

		return deferred.promise;
	};

	// onFancyWeatherChange: Called each time an update happens in the fancyWeather service
	//----------------------------------------------------------------------
	main.onFancyWeatherChange = function (currentWeather) {
		main.geolocation.statusType = null;
		main.currFancyWeather = angular.copy(currentWeather);
		main.lastUpdated = moment().format('MMM DD YYYY HH:mm:ss');
	};

	// WOOT! Let's kick things off
	main.init();
}

MainController.$inject = $requires;
module.exports = MainController;
