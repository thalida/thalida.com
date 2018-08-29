define(function (require) {

    "use strict";

    var $           = 	require('jquery'),
    	_			= 	require('underscore'),
        Backbone    = 	require('backbone'),
        __			= 	require('utils'),

        LiveData = Backbone.Model.extend({
        	defaults: {
        		'lat': '38.8977',
        		'long': '-77.0366',
        		'breakpoints': { "midnight": 0,  "predawn": 0,  "dawn": 0,  "midmorn": 0,  "afternoon": 0,  "dusk": 0,  "night": 0 }, 
        		'temp': 0, 
        		'weather': null,
        		'isNorth': true
        	},

            initialize: function ( ) {
            	 _.bindAll(this);
            	 
	        	 if(navigator.geolocation)
	        	 	navigator.geolocation.getCurrentPosition(this.setCoords,this.setCoords);
	        	 else
	        	 	this.setCoords();
            	 	
            	window.setInterval(this.getDailyData, __.toSeconds('01:00:00:00')*1000);
            	window.setInterval(this.getHourlyData, __.toSeconds('01:00:00')*1000);
            },
            
            setCoords: function( position ){
        		if( typeof position.coords !== 'undefined')
        			this.set({ lat: position.coords.latitude, long: position.coords.longitude });
        			
        		this.set({isNorth: (this.get('latitude') >= 0) ? true : false});
            },
            
            start: function( callback ){
            	var deferred = $.Deferred();         
            	
            	this.setDailyData();
            	this.setHourlyData();
            	
            	deferred.resolve();
            	return deferred.promise();
            },
            
            setDailyData: function(){
        		var updateNeeded = true;
        		if( !__.isUndefined(localStorage.dailyData) ){
        			var currentTime = __.getTime(),
        				storedData = JSON.parse(localStorage.dailyData);
        				
        			if(currentTime - storedData.lastUpdate < __.toSeconds('12:00:00')){
        				updateNeeded = false;
        				this.set({ breakpoints: storedData.breakpoints });
        			}
        		}
        		if(updateNeeded === true) this.getDailyData();
            },
            setHourlyData: function(){
        		var updateNeeded = true;
        		if( !__.isUndefined(localStorage.hourlyData) ){
        			var currentTime = __.getTime(),
        				storedData = JSON.parse(localStorage.hourlyData);
        				
        			if(currentTime - storedData.lastUpdate < __.toSeconds('30:00')){	
        				updateNeeded = false;
        				this.set({ temp: storedData.temp, weather: storedData.weather });
        			}
        		}
        		
        		if(updateNeeded === true) this.getHourlyData();
            },
            getDailyData: function(){
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
            	
            	this.set({ breakpoints: breakpoints });
            	localStorage.dailyData = JSON.stringify( {breakpoints: breakpoints, lastUpdate: __.getTime()} );
            },
            getHourlyData: function(){
        		var hourlyCondition = forecast.getCurrentConditions(this.get('lat'), this.get('long')),
        			temp = hourlyCondition.getTemperature(),
        			weather = hourlyCondition.getIcon();
            	
            	this.set({ temp: temp, weather: weather });
            	localStorage.hourlyData = JSON.stringify( {temp: temp, weather: weather, lastUpdate: __.getTime()} );
            }
        }),
        
       	LiveDataCollection = Backbone.Collection.extend({
        	model: LiveData
        });

    return {
        LiveData: LiveData,
       	LiveDataCollection: LiveDataCollection
    };
});