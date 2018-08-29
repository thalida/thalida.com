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

appServices.service('LiveDataService', ['$http', '$interval', '$q', '$rootScope', 'Utils', 'ForecastIO', function($http, $interval, $q, $rootScope, Utils, forecast){
    this.data = {
        'lat': '38.8977',
        'long': '-77.0366',
        'breakpoints': { "midnight": 0,  "predawn": 0,  "dawn": 0,  "midmorn": 0,  "afternoon": 0,  "dusk": 0,  "night": 0 }, 
        'temp': 0, 
        'weather': '',
        'isNorth': true,
        'person' : {visits: 0},
        'interval': {}
    };
                                        
    this._breakpoints = {};
    
    this.init = function(){
        var deferred = $q.defer(),
            that = this;
        
        this.getLocation().then(function(){
            return that.run();
        }).then(function(){   
            that.data.interval.hourlyData = $interval(that.getHourlyData, Utils.toSeconds('01:00:00')*1000);
            that.data.interval.personData = $interval(that.setPersonData, 1000);
            that.data.interval.background = $interval(that.setBackground, 1000);

            if( !Utils.isUndefined(localStorage.personData) ){
                that.set('person', JSON.parse(localStorage.personData));
            }
            deferred.resolve( that.data );
        });
        return deferred.promise;
    }.bind(this);
    
    this.run = function( callback ){
        var deferred = $q.defer(); 
        this.setDailyData();
        this.setHourlyData();
				
        this._breakpoints = this.getBreakpoints();
        this._breakpoints.afternoon -= Utils.toSeconds('01:00:00');
        this._breakpoints.dusk -= Utils.toSeconds('01:00:00');
        this._breakpoints.night += Utils.toSeconds('01:30:00');

        this.setPersonData();
		this.setBackground();
				
        var midnightTomorrow = new Date().setHours(24,0,0,0) / 1000;
        window.setTimeout(this.getDailyData, midnightTomorrow - Utils.getTime());
				
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
        var weeklyConditions = forecast.getForecastWeek(this.get('lat'), this.get('long')),
            today = new Date().getDate(),
            breakpoints = {};

        $.each(weeklyConditions, function(index, thisCondition){
            if( thisCondition.getSunrise('D') == today ){

                breakpoints.midnight =  new Date().setHours(0,0,0,0) / 1000;
                breakpoints.dawn = thisCondition.getSunrise();
                breakpoints.dusk = thisCondition.getSunset();

                breakpoints.predawn = Math.floor( (breakpoints.midnight + breakpoints.dawn) / 2  );
                breakpoints.afternoon = Math.floor( (breakpoints.dawn + breakpoints.dusk) / 2  );
                breakpoints.midmorn = Math.floor( (breakpoints.dawn + breakpoints.afternoon) / 2  );
                breakpoints.night = Math.floor( breakpoints.dusk + 1800 );

                breakpoints.array = $.map(breakpoints, function(v, i) { return [v]; });
                breakpoints.array.sort(function(a,b){return (+a)-(+b)});

                return false;
            }
        });

        this.set('breakpoints', breakpoints);

        sessionStorage.dailyData = JSON.stringify( {breakpoints: breakpoints, lastUpdate: Utils.getTime()} );

        this._breakpoints = this.getBreakpoints();
        this._breakpoints.afternoon -= Utils.toSeconds('01:00:00');
        this._breakpoints.dusk -= Utils.toSeconds('01:00:00');
        this._breakpoints.night += Utils.toSeconds('01:30:00');
        this.savePerson( this.get('person') );
        var midnightTomorrow = new Date().setHours(24,0,0,0) / 1000;
        window.setTimeout(this.getDailyData, midnightTomorrow - Utils.getTime());
    }.bind(this);

    this.getHourlyData = function(){
        var hourlyCondition = forecast.getCurrentConditions(this.get('lat'), this.get('long'));
        
        this.data.temp = hourlyCondition.getTemperature(),
        this.data.weather = hourlyCondition.getIcon();
        
        sessionStorage.hourlyData = JSON.stringify( {temp: this.data.temp, weather: this.data.weather, lastUpdate: Utils.getTime()} );
        this.savePerson( this.get('person') );
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

            if(currentTime - storedData.lastUpdate < Utils.toSeconds('30:00')){	
                updateNeeded = false;
                this.data.temp = storedData.temp;
                this.data.weather = storedData.weather;
            }
        }

        if(updateNeeded === true) this.getHourlyData();
    }.bind(this);

    this.setPersonData = function(){
        var time = Utils.getTime(),
            data = {};

        if( this._breakpoints.dawn <= time&&time < this._breakpoints.afternoon ){
            if( time >= this._breakpoints.afternoon - Utils.toSeconds('01:00:00') ){
                data.greeting = 'Greetings';
                data.name = 'Brunch Master';
                data.message = 'It&rsquo;s almost lunch time... did you just get up? Lucky. Anyway, eat some brunch, and check out my site!';	
            }else{
                data.greeting = 'Good Morning';
                data.name = 'Early Bird';
                data.message = 'I hope you had a good nights rest. Did you battle any dragons in your sleep?';
            }
        }else if( this._breakpoints.afternoon <= time&&time < this._breakpoints.dusk ){
            data.greeting = 'Good Afternoon';
            data.name = 'Hungry Hippo';
            data.message = 'How was your lunch? I probably had a good one, the food in the DC area is amazingly amazing.';
        }else if( this._breakpoints.dusk <= time&&time < this._breakpoints.night ){
            data.greeting = 'Good Evening';
            data.name = 'Amazing Person';
            data.message = 'You should wind-down and relax after such a productive day. Watch some cat videos or fight some zombies.';
        }else{
            data.greeting = 'Greetings';
            data.name = 'Night Owl';
            data.message = 'Burning the night oil I see. Well, you&rsquo;ve landed in my home, take a chance to explore a bit. Then, go to sleep!';
        }

        data = $.extend(true, data, this.get('person'));
        this.savePerson( data );
    }.bind(this);
			
    this.setBackground = function(){
        Utils.updateBackground( this.getBreakpoints() );
    }.bind(this);

    this.savePerson = function( data ){
        this.set('person', data);
        localStorage.personData = JSON.stringify(_.pick(this.get('person'), 'name', 'visits'));
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
        var	breakpoints = this.data.breakpoints,
            array = _.clone(breakpoints.array),
            data = {};

        data.newKey = _.sortedIndex(array, time);
        data.startKey = (data.newKey - 1 >= 0) ? data.newKey - 1 : array.length - 1,
        data.endTime = (data.newKey < array.length) ? array[data.newKey] : breakpoints.midnight + Utils.toSeconds('23:59:59');
        
        return {key: data.startKey, elapsedTime: time - array[data.startKey], duration: data.endTime - array[data.startKey]};
    }.bind(this);
    
    this.parseTime = function(){
        var currentTime = Utils.getTime(),
            timeData = this.getTimeData( currentTime ),
            colors = [
                ['#0f0f2e', '#ffeed9'], //predawn
                ['#ffeed9', '#10eed9'], //dawn
                ['#10eed9', '#0fee9a'], //midmorning
                ['#0fee9a', '#fbff99'], //afternoon
                ['#fbff99', '#ff1399'], //dusk
                ['#ff1399', '#252564'], //night
                ['#252564', '#0d0d33']  //midnight
            ],
            currentColor = colors[ timeData.key ],
            interval = timeData.elapsedTime / timeData.duration,
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
        
        return {
            rotH: "rotate(" + clock.hours.deg + "deg)", 
            rotM: "rotate(" + clock.minutes.deg + "deg)", 
            rotS: "rotate(" + clock.seconds.deg + "deg)", 
            time:  Utils.addZero( clock.h ) + ' : ' + Utils.addZero( clock.m ), 
            colors: currentColor,
            interval: interval
        };
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
        
        return weatherTypes[ this.data.weather ];
    }.bind(this);
    
    this.parseDate = function(){
        var	seasons = [
                ['#dcccc5','#83e1e0'], //winter
                ['#83e1e0','#b2ed67'], //spring
                ['#b2ed67','#ffae00'], //summer
                ['#ffae00','#dcccc5']  //fall
            ],
            monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            today = new Date(),
            thisMonth = today.getMonth() + 1,
            dayOfYear = Utils.getDayOfYear(),
            hemisphereFix = (this.data.isNorth === true) ? 0 : 6,
            thisSeason = Math.floor((thisMonth + hemisphereFix) / 3) % 4,
            seasonColors = seasons[thisSeason],
            interval = (366 - dayOfYear) / 90;

        return {
            day: Utils.addZero(today.getDate()), 
            month: monthNames[today.getMonth()], 
            colors: seasonColors, 
            interval: interval
        };
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
            });
        }
    }, true);
}]);