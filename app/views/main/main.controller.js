'use strict';

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

	main.init = function(){
		main.about = ABOUT;
		main.projectsList = PROJECTS;
        visits.increment();
		main.totalVisits = visits.getTotal();
        main.year = moment().format('Y');
		main.geolocation = {
			cached: false,
			statusType: null,
			statusText: null,
			hasData: false,
		};
        main.currFancyTime = null;
		main.currFancyWeather = null;
		main.lastUpdated = null;
	    main.sanitize = utils.sanitize;

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

		main.render = true;
	}

	main.getLocation = function () {
		main.geolocation.statusType = "loading-location";

		var locationApi = 'https://www.googleapis.com/geolocation/v1/geolocate?key=AIzaSyAdqHKcbHf0sWy0iyiKtXOuDEW-TLCNE6k';
		var locationQuery = $http.post($sce.trustAsResourceUrl(locationApi));

		return locationQuery
			.then(function (res) {
				main.geolocation.data = res.data.location;
				main.geolocation.hasData = true;
				main.geolocation.statusType = 'success-location';
				fancyWeather.setLocation(main.geolocation.data);
			})
			.catch(function (err) {
				main.geolocation.statusType = 'error-location';
				main.geolocation.statusText = 'Unable to retrieve your location';
			});
	};

	main.initFancyTime = function () {
		var deferred = $q.defer();
		var firstLoop = true;

		fancyTime.startTick(main.saveFancyTime);

		deferred.resolve();

		return deferred.promise;
	};

	main.saveFancyTime = function (newFancyTime) {
		main.currFancyTime = angular.copy(newFancyTime);
		main.lastUpdated = main.currFancyTime.time.now.format('MMM DD YYYY HH:mm:ss');
	};

	main.initFancyWeather = function () {
		var deferred = $q.defer();
		main.geolocation.statusType = "loading-weather";
		main.hasFancyWeather = true;
		fancyWeather.startTick(main.saveFancyWeather);
		deferred.resolve();

		return deferred.promise;
	};

	main.saveFancyWeather = function (currentWeather) {
		main.geolocation.statusType = null;
		main.currFancyWeather = angular.copy(currentWeather);
	};

	main.actions = {
		refresh: function () {
			fancyTime.onTick();
			fancyWeather.onTick();
		},
		getWeather: function () {
			main.getLocation()
				.then(main.initFancyWeather)
				.catch(function (err) {
					console.log('%cerr', 'color:green;', err);
				});
		}
	};

	main.init();
}

MainController.$inject = $requires;
module.exports = MainController;
