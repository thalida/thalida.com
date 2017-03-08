'use strict';

var $requires = ['$q', '$http', '$sce', '$interval'];
var service = function( $q, $http, $sce, $interval ){
	//======================================================================
	//
	//	Fancy Weather
	//
	//----------------------------------------------------------------------
	var FancyWeather = function(){
		this.apiKey = 'b851e4f5ae645303993f491357d17eb7';
		this.baseAPIUrl = 'https://api.darksky.net/forecast/'+this.apiKey+'/';
		this.geolocation = null;
		this.currently = null;
		this.tickInterval = null;
		this.tickCallbacks = [];
		this.waitTime = 10 * 60 * 1000;
		// this.waitTime = 1 * 1 * 1000;
	};

	FancyWeather.prototype.setLocation = function (geolocation) {
		this.geolocation = geolocation;

		return this.geolocation;
	};

	FancyWeather.prototype.fetch = function () {
		var self = this;
		var deferred = $q.defer();

		var latitude  = this.geolocation.coords.latitude;
		var longitude = this.geolocation.coords.longitude;
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

	FancyWeather.prototype.startTick = function( callback, speed ) {
		if( typeof this.tickInterval !== 'undefined' && this.tickInterval !== null ){
			$interval.cancel( this.tickInterval );
			this.tickInterval = null;
		}

		if (callback) {
			this.addTickCallback(callback);
		}

		this.onTick();

		this.tickInterval = $interval(this.onTick.bind(this), speed || this.waitTime);
	};

	FancyWeather.prototype.stopTick = function() {
		this.tickCallbacks = [];

		if( typeof this.tickInterval !== 'undefined' && this.tickInterval !== null ){
			$interval.cancel( this.tickInterval );
			this.tickInterval = null;
		}
	};

	FancyWeather.prototype.onTick = function() {
		var self = this;

		this.fetch().then(function (currFancyWeather) {
			self.tickCallbacks.forEach(function( cb ){
				if( typeof cb === 'function' ){
					cb( currFancyWeather );
				}
			});
		});
	};

	FancyWeather.prototype.addTickCallback = function (cb) {
		return this.tickCallbacks.push(cb);
	};

	return new FancyWeather();
}

service.$inject = $requires;
module.exports = service;
