'use strict';

var $requires = [
	'$scope',
	'$sce',
	'$q',
    'utils',
    'fancyTime',
	'fancyWeather',
    'visits',
    'PROJECTS',
    'ABOUT'
];


var MainController = function($scope, $sce, $q, utils, fancyTime, fancyWeather, visits, PROJECTS, ABOUT) {
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
			statusType: null,
			statusText: null,
			hasData: false,
		};
        main.currFancyTime = null;
		main.currFancyWeather = null;
		main.lastUpdated = null;
	    main.sanitize = utils.sanitize;

		main.initFancyTime()
			.then(main.fetchGeolocationPermissions)
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

	main.refresh = function () {
		fancyTime.onTick();
	};

	main.fetchGeolocationPermissions = function () {
		var query = navigator.permissions.query({name:'geolocation'});

		query.then(function (res) {
			main.geolocation.permissions = res;
		});

		return $q.when(query);
	};

	main.getLocation = function () {
		var deferred = $q.defer();

		if (main.isInit && main.geolocation.permissions.state !== 'granted') {
			main.geolocation.statusType = main.geolocation.permissions.state + '-location';
			deferred.reject();
			return deferred.promise;
		}

		if (!navigator.geolocation){
			main.geolocation.statusType = 'error';
			main.geolocation.statusText = 'Geolocation is not supported by your browser.';
			return;
		}

		function success(position) {
			$scope.$apply(function () {
				main.geolocation.data = position;
				main.geolocation.hasData = true;
				main.geolocation.statusType = 'success-location';
				fancyWeather.setLocation(main.geolocation.data);
				deferred.resolve();
			});
		}

		function error(res) {
			$scope.$apply(function () {
				main.geolocation.statusType = 'error';
				main.geolocation.statusText = 'Unable to retrieve your location';
				deferred.reject(res);
			});
		}

		main.geolocation.statusType = "loading-location";

		navigator.geolocation.watchPosition(success, error);

		return deferred.promise;
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
		fancyWeather.startTick(main.saveFancyWeather);
		deferred.resolve();

		return deferred.promise;
	};

	main.saveFancyWeather = function (currentWeather) {
		main.geolocation.statusType = null;
		main.currFancyWeather = angular.copy(currentWeather);
	};

	main.actions = {
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
