'use strict';

var appServices = angular.module('appServices', ['ngResource']);

appServices.factory('Project', ['$resource', function ($resource) {
    return $resource('/res/posts/:projectId', null, {
        query: {method: 'GET', isArray: true}
    });
}]);

appServices.factory('Utils', function () {
    return {
        addTime: function () {
		   	var total = false,
		   		opts = {};
		   	
		   	opts.type = arguments[0];
		   	
		   	if(opts.type === 'time'){
		   		opts.n = arguments[1];
		   		opts.format = arguments[2];
		   		switch(opts.format){
		   			case 'm':
		   				total = 60 * opts.n;
		   				break;
		   			case 'h':
		   				total = 60 * 60 * opts.n;
		   				break;
		   			case 'd':
		   				total = 24 * 60 * 60 * opts.n;
		   				break;
		   		}
		   	}
		   	
		   	return total;
	   	},
        
	   	addZero: function( num ){
	   		return ( num < 10 ) ? '0' + num : num;
	   	},
        
	   	componentToHex: function(c) {
	   	    var hex = c.toString(16);
	   	    return hex.length == 1 ? "0" + hex : hex;
	   	},
        
	   	contrastColor: function( opts ){
	   		var params = $.extend({
	   			midpoint: 131.5,
	   			dark: '#000',
	   			light: '#fff'
	   		}, opts);
	   		
	   	 var bigint = parseInt(params.hex.replace('#',''), 16),
	   	 	r = (bigint >> 16) & 255,
	   	 	g = (bigint >> 8) & 255,
	   	 	b = bigint & 255;
	   	 	
	   		return (((r*299)+(g*587)+(b*144))/1000) >= params.midpoint ? params.dark : params.light;
	   	},
        
   		formatText: function(txt, data){
   			var placeholders = {
   				'\{\{name\}\}':  data.name,
   				'\{\{greeting\}\}': data.greeting,
   				'\n': '<br />'
   			};
   			
   			_.each(placeholders, function(value, key, list){
   				var re = new RegExp(key, 'g');
   				txt = txt.replace(re, value);
   			});
   			return txt;
   		},
        
   		getDayOfYear: function(){
   			var today = new Date(),
   				startOfYear = new Date(today.getFullYear(), 0, 0),
   				msSinceStart = today - startOfYear,
   				oneDay = 1000 * 60 * 60 * 24,
   				dayOfYear = Math.ceil(msSinceStart / oneDay);
   			
   			return dayOfYear;
   		},
        
   		getTime: function(format){
   			var divisor = ( typeof format === 'undefined' || format === 's' ) ? 1000 : 1;
   			return Math.floor(new Date().getTime() / divisor);
   		},
        
   		hexToRgb: function(hex){
   			hex = hex.replace('#','');
   			var bigint = parseInt(hex, 16),
				r = (bigint >> 16) & 255,
				g = (bigint >> 8) & 255,
				b = bigint & 255;
				
			return {r:r, g:g, b:b};
   		},
        
   		isNull: function( variable ){
   			return (variable === null) ? true : false;
   		},
        
   		isUndefined: function( variable ){
   			return (typeof variable === 'undefined') ? true : false;
   		},
        
   		redirect: function(location){
   			//window.location.href = 'http://thalida.com/#' + location;
   			window.location.hash = location || "";
   		},
        
   		rgbToHex: function(r, g, b) {
   		    return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
   		},
        
   		save: function( opts ){
   			var container = opts.container;
   			localStorage[container] = opts.data;
   		},
        
   		toSeconds: function(str){
   			var time = str.split(':'),
   				maxLength = 4;//days, hours, minutes, seconds
   			
   			while(time.length < maxLength){
   				time.unshift(0);
   			}
   			
   			return (time[0] * 24 * 60 * 60) + (time[1] * 60 * 60) + (time[2] * 60) + (time[3] * 1);
   		},
        
   		transitionColor: function(start, end, transition){
   			start = this.hexToRgb( start );
   			end = this.hexToRgb( end );
   			var r = Math.floor((end.r - start.r) * transition + start.r),
   				g = Math.floor((end.g - start.g) * transition + start.g),
   				b = Math.floor((end.b - start.b) * transition + start.b);
   				
   			//return {r:r, g:g, b:b};
   			return this.rgbToHex(r, g, b);
   		},
        
   		updateBackground: function( breakpoints ){
   			var time = Math.floor(new Date().getTime() / 1000);
			if( breakpoints.dusk <= time||time < breakpoints.dawn){
				$('body').removeClass('day-mode').addClass('night-mode');
			}else{
				$('body').removeClass('night-mode').addClass('day-mode');
			}
   		},
        
   		validateName: function( str ){
   			var re = /^[a-zA-Z0-9\._\s-]{1,15}$/;
   			return re.test( str );
   		},
        
   		intervals: {
   			//borrowed from: http://stackoverflow.com/questions/8635502/how-do-i-clear-all-intervals
   		    stored : {},
   			set: function ( func, delay ) {
   		        var newInterval = setInterval.apply( window,[func, delay].concat([].slice.call(arguments, 2)) );
   				utils.intervals.stored[ newInterval ] = true;
   				return newInterval;
   		    },
   			clear: function ( id ) {
   		        return clearInterval( utils.intervals.stored[id] );
   		    },
   			clearAll: function () {
   		        var allIntervals = Object.keys( utils.intervals.stored ), 
   		        	len = allIntervals.length;
   				while ( len-- > 0 ) {
   		            clearInterval( allIntervals.shift() );
   		        }
   		    }
   		}
    };
});

appServices.service('SceneService', 
    ['$http', '$interval', '$timeout', '$q', '$rootScope', 'Utils', 'ForecastIO', 
    function($http, $interval, $timeout, $q, $rootScope, Utils, forecast){
        this.data = {
            'lat': null,
            'long': null,
            'breakpoints': { "midnight": 0, "dawn": 0, "afternoon": 0,  "dusk": 0,  "night": 0 }, 
            'temp': 0, 
            'weather': null,
            'isNorth': true,
            'interval': {}
        };

        this._breakpoints = {};

        this.run = function( callback ){
            var deferred = $q.defer(); 
            this.setDailyData();
            this.setHourlyData();

            this._breakpoints = this.getBreakpoints();
            this._breakpoints.afternoon -= Utils.toSeconds('01:00:00');
            this._breakpoints.dusk -= Utils.toSeconds('01:00:00');
            this._breakpoints.night += Utils.toSeconds('01:30:00');

            var midnightTomorrow = new Date().setHours(24,0,0,0) / 1000;
            $timeout(this.getDailyData, midnightTomorrow - Utils.getTime());

            deferred.resolve();
            return deferred.promise;
        }.bind(this);

        this.getLocation = function(){
            var deferred = $q.defer();
            if(navigator.geolocation){
                navigator.geolocation.getCurrentPosition(this.setCoords,this.setCoords);
                deferred.resolve();
            }else{
                this.setCoords();
                deferred.resolve();
            }
            return deferred.promise;
        }.bind(this);

        this.getDailyData = function(){
            var updateNeeded = false;

            if( Utils.isUndefined(sessionStorage.dailyData) ){
                updateNeeded = true;
            }else{
                var currentTime = Utils.getTime(),
                    storedData = JSON.parse(sessionStorage.dailyData);
                if(currentTime - storedData.lastUpdate >= Utils.toSeconds('12:00:00')){
                    updateNeeded = true;
                }
            }

            if( updateNeeded && this.get('lat') && this.get('long') ){
                var weeklyConditions = forecast.getForecastWeek(this.get('lat'), this.get('long')),
                    today = new Date().getDate(),
                    breakpoints = {};

                $.each(weeklyConditions, function(index, thisCondition){
                    if( thisCondition.getSunrise('D') == today ){

                        breakpoints.midnight =  new Date().setHours(0,0,0,0) / 1000;
                        breakpoints.dawn = thisCondition.getSunrise();
                        breakpoints.dusk = thisCondition.getSunset();
                        breakpoints.afternoon = Math.floor( (breakpoints.dawn + breakpoints.dusk) / 2  );
                        breakpoints.night = Math.floor( breakpoints.dusk + 1800 );

                        breakpoints.array = $.map(breakpoints, function(v, i) { return [v]; });
                        breakpoints.array.sort(function(a,b){return (+a)-(+b)});

                        return false;
                    }
                });

                this.set('breakpoints', breakpoints);

                sessionStorage.dailyData = JSON.stringify( {breakpoints: breakpoints, lastUpdate: Utils.getTime()} );

                this._breakpoints = _.omit(this.getBreakpoints(), 'array');
                this._breakpoints.afternoon -= Utils.toSeconds('01:00:00');
                this._breakpoints.dusk -= Utils.toSeconds('01:30:00');
                this._breakpoints.night += Utils.toSeconds('01:30:00');
                this._breakpoints.array = $.map(this._breakpoints, function(v, i) { return [v]; });
                this._breakpoints.array.sort(function(a,b){return (+a)-(+b)});
                var midnightTomorrow = new Date().setHours(24,0,0,0) / 1000;
                window.setTimeout(this.getDailyData, midnightTomorrow - Utils.getTime());
            }
        }.bind(this);

        this.getHourlyData = function(){
            var updateNeeded = false;

            if( Utils.isUndefined(sessionStorage.hourlyData) ){
                updateNeeded = true;
            }else{
                var currentTime = Utils.getTime(),
                    storedData = JSON.parse(sessionStorage.hourlyData);

                if(currentTime - storedData.lastUpdate >= Utils.toSeconds('15:00')){	
                    updateNeeded = true;
                }
            }

            if(updateNeeded === true && this.get('lat') && this.get('long') ){
                var hourlyCondition = forecast.getCurrentConditions(this.get('lat'), this.get('long'));

                this.data.temp = hourlyCondition.getTemperature(),
                this.data.weather = hourlyCondition.getIcon();

                sessionStorage.hourlyData = JSON.stringify( {temp: this.data.temp, weather: this.data.weather, lastUpdate: Utils.getTime()} );
            }
        }.bind(this);

        this.setCoords = function( position ){
            if( typeof position.coords !== 'undefined')
                this.extend(this.data, { lat: position.coords.latitude, long: position.coords.longitude });

            sessionStorage.location = this.data.lat + ',' + this.data.long;

            this.extend(this.data, {isNorth: (this.data.lat >= 0) ? true : false});
        }.bind(this);

        this.setDailyData = function(){
            var updateNeeded = true;

            if( !Utils.isUndefined(sessionStorage.dailyData) ){
                var currentTime = Utils.getTime(),
                    storedData = JSON.parse(sessionStorage.dailyData);

                if(currentTime - storedData.lastUpdate < Utils.toSeconds('12:00:00')){
                    updateNeeded = false;
                    this.set('breakpoints', storedData.breakpoints);
                }
            }

            if(updateNeeded === true) this.getDailyData();
        }.bind(this);

        this.setHourlyData = function(){
            var updateNeeded = true;

            if( !Utils.isUndefined(sessionStorage.hourlyData) ){
                var currentTime = Utils.getTime(),
                    storedData = JSON.parse(sessionStorage.hourlyData);

                if(currentTime - storedData.lastUpdate < Utils.toSeconds('15:00')){	
                    updateNeeded = false;
                    this.data.temp = storedData.temp;
                    this.data.weather = storedData.weather;
                }
            }

            if(updateNeeded === true) this.getHourlyData();
        }.bind(this);

        this.getBreakpoints = function() {
            return $.extend(true, {}, this.get('breakpoints'));
        }.bind(this);

        this.extend = function(obj, value){
            _.extend(obj, value);
        }.bind(this);

        this.set = function(item, value){
            this.data[item] = _.extend(this.data[item], value);
        }.bind(this);

        this.get = function(item){
            return this.data[item];
        }.bind(this);

        this.getTimeData = function( time ){
            var	breakpoints = this._breakpoints,
                array = _.clone(breakpoints.array),
                data = {};

            data.newKey = _.sortedIndex(array, time);
            data.startKey = (data.newKey - 1 >= 0) ? data.newKey - 1 : array.length - 1,
            data.endTime = (data.newKey < array.length) ? array[data.newKey] : breakpoints.midnight + Utils.toSeconds('23:59:59');

            return {key: data.startKey, elapsedTime: time - array[data.startKey], duration: data.endTime - array[data.startKey]};
        }.bind(this);

        this.parseTime = function(){
            if( this.get('lat') && this.get('long') ){
                var currentTime = Utils.getTime(),
                    timeData = this.getTimeData( currentTime ),
                    clock = { 
                        h: new Date().getHours(), 
                        m: new Date().getMinutes(), 
                        s: new Date().getSeconds(), 
                        hours: {}, 
                        minutes: {}, 
                        seconds: {}
                    };

                clock.hours.deg = clock.h * 30 + (clock.m / 2);
                clock.minutes.deg = clock.m * 6;
                clock.seconds.deg = clock.s * 6;

                var greeting = '';
                if( timeData.key === 0 )
                    greeting = 'Greetings!';
                if( timeData.key === 1 )
                    greeting = 'Good Morning!';
                if( timeData.key === 2 )
                    greeting = 'Good Afternoon!';
                if( timeData.key === 3 )
                    greeting = 'Good Evening!';
                if( timeData.key === 4 )
                    greeting = 'Good Night!';


                return {
                    greeting: greeting,
                    hour: clock.h,
                    rotH: clock.hours.deg % 360,
                    rotM: clock.minutes.deg % 360,
                    rotS: clock.seconds.deg % 360,
                    time:  Utils.addZero( clock.h ) + ' : ' + Utils.addZero( clock.m ),
                    secondsSinceMidnight: currentTime - this.data.breakpoints.midnight
                };
            }else{
                return undefined;
            }
        }.bind(this);

        this.parseWeather = function(){
           var weatherTypes = {
                'clear-day' : {name: 'Clear', color: '#9adfe1'},
                'clear-night' : {name: 'Clear', color: '#094662'},
                'rain' : {name: 'Raining', color: '#88a1b0'},
                'snow' : {name: 'Snowing', color: '#c2d3d3'},
                'sleet' : {name: 'Sleet', color: '#b2c6c8'},
                'wind' : {name: 'Windy', color: '#dfe0df'},
                'fog' : {name: 'Fog', color: '#8399a0'},
                'cloudy' : {name: 'Cloudy', color: '#c0d7df'},
                'partly-cloudy-day' : {name: 'Partly Cloudy', color: '#b3d9e6'},
                'partly-cloudy-night' : {name: 'Partly Cloudy', color: '#303740'}
            };
            if( this.data.weather !== null){
                //var weather = 'snow';
                var weather = this.data.weather;
                var currWeather = weatherTypes[ weather ];
                return {
                    condition: {
                      class: weather,
                      name: currWeather.name
                    },
                    temp: Math.floor( this.data.temp ),
                    showClouds: (weather === 'rain' || weather === 'snow' || weather === 'sleet')
                };
            }else{
                return undefined;
            }
        }.bind(this);

        var that = this;
        $rootScope.$watch(function() {
            return that.data;
        }, function ( newData, oldData ) {
            if( oldData.lat !== newData.lat || oldData.long !== newData.long ){
                sessionStorage.removeItem('dailyData');
                sessionStorage.removeItem('hourlyData');
                that.run().then(function(){
                    console.log('Updated LiveDataService');
                    console.log( newData );
                    that.data = newData;
                });
            }
        }, true);
    }
]);