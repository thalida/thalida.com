'use strict';

var $requires = ['$q', '$http', '$sce', '$interval'];
var service = function( $q, $http, $sce, $interval ){
	//======================================================================
	//
	//	Fancy Weather
	//
	//----------------------------------------------------------------------
	var FancyWeather = function(){
		// weather api
		this.apiKey = 'b851e4f5ae645303993f491357d17eb7';
		this.baseAPIUrl = 'https://api.darksky.net/forecast/'+this.apiKey+'/';

		this.geolocation = null;
		this.currently = null;

		this.interval = null;
		this.onUpdateCallback = [];
		// 20 minute wait time
		this.waitTime = 30 * 60 * 1000;
		// this.waitTime = 1 * 1 * 1000;
	};

	FancyWeather.prototype.setLocation = function (geolocation) {
		this.geolocation = geolocation;

		return this.geolocation;
	};

	FancyWeather.prototype.fetch = function () {
		var self = this;
		var deferred = $q.defer();

		var latitude  = this.geolocation.lat;
		var longitude = this.geolocation.lng;
		var apiUrl = [this.baseAPIUrl + latitude + ',' + longitude + '?exclude=minutely,hourly,daily,alerts,flags'].join('');
		var trustedUrl = $sce.trustAsResourceUrl(apiUrl);

		$http
			.jsonp(trustedUrl)
			.then(function (res) {
				self.currently = res.data.currently;
				deferred.resolve(self.currently);
			});

		return deferred.promise;
	};

	FancyWeather.prototype.update = function() {
		var self = this;

		this.fetch().then(function (currFancyWeather) {
			self.onUpdateCallback.forEach(function( cb ){
				if( typeof cb === 'function' ){
					cb( currFancyWeather );
				}
			});
		});
	};

	FancyWeather.prototype.start = function( callback, speed ) {
		if( typeof this.interval !== 'undefined' && this.interval !== null ){
			$interval.cancel( this.interval );
			this.interval = null;
		}

		if (callback) {
			this.addUpdateCallback(callback);
		}

		this.update();

		this.interval = $interval(this.update.bind(this), speed || this.waitTime);
	};

	FancyWeather.prototype.stop = function() {
		this.onUpdateCallback = [];

		if( typeof this.interval !== 'undefined' && this.interval !== null ){
			$interval.cancel( this.interval );
			this.interval = null;
		}
	};

	FancyWeather.prototype.addUpdateCallback = function (cb) {
		return this.onUpdateCallback.push(cb);
	};

	return new FancyWeather();
}

service.$inject = $requires;
module.exports = service;
