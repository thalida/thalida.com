define(function (require) {
    "use strict";
    
    var forecast	= 	new ForecastIO(),
    	__			= 	require('utils'),
    	_			= 	require('underscore'),
   		LiveData = {
   			savedData:  [
   				{"id" : "daily", "info" : {"breakpoints" : { "midnight": 0,  "predawn": 0,  "dawn": 0,  "midmorn": 0,  "afternoon": 0,  "dusk": 0,  "night": 0 }}}, 
   				{"id" : "hourly", "info" : {"temp": 0, "weather": null}}
   			],
			start: function(position){
				if( typeof position.coords !== 'undefined'){
					LiveData.region.latitude = position.coords.latitude;
					LiveData.region.longitude = position.coords.longitude;
				}
				
				LiveData.region.isNorth = (LiveData.region.latitude >= 0) ? true : false;
				
				var getDaily = true;
				if( !__.isUndefined(localStorage.dailyData) ){
					var currentTime = __.getTime(),
						parsedData = JSON.parse(localStorage.dailyData);
						
					if(currentTime - parsedData.lastUpdate < __.toSeconds('12:00:00')){
						getDaily = false;
						$.extend(true, LiveData.time, parsedData.time);
						LiveData.date.update();
					}
				}
				if(getDaily === true){
					LiveData.region.getDailyData();
				}
				
				
				var getHourly = true;
				if( !__.isUndefined(localStorage.hourlyData) ){
					var currentTime = __.getTime(),
						parsedData = JSON.parse(localStorage.hourlyData);
						
					if(currentTime - parsedData.lastUpdate < __.toSeconds('30:00')){	
						getHourly = false;
						$.extend(true, LiveData.temp, parsedData.temp);
						$.extend(true, LiveData.weather, parsedData.weather);
						LiveData.temp.update();
						LiveData.weather.update();
					}
				}
				
				if(getHourly === true){
					LiveData.region.getHourlyData();
				}
				
				
				LiveData.region.dInterval = window.setInterval(LiveData.region.getDailyData, __.toSeconds('01:00:00:00')*1000);
				LiveData.region.hInterval = window.setInterval(LiveData.region.getHourlyData, __.toSeconds('01:00:00')*1000);
			},
			region: {
				latitude: 38.8977,
				longitude: -77.0366,
				getDailyData: function(){
					var weeklyConditions = forecast.getForecastWeek(LiveData.region.latitude, LiveData.region.longitude),
						today = new Date().getDate();
					
					LiveData.time.breakpoints.midnight =  new Date().setHours(0,0,0,0) / 1000;
					
					$.each(weeklyConditions, function(index, thisCondition){
						if( thisCondition.getSunrise('D') == today ){
							LiveData.time.breakpoints.dawn = thisCondition.getSunrise();
							LiveData.time.breakpoints.dusk = thisCondition.getSunset();
							LiveData.time.breakpoints.predawn = Math.floor( (LiveData.time.breakpoints.midnight + LiveData.time.breakpoints.dawn) / 2  );
							LiveData.time.breakpoints.afternoon = Math.floor( (LiveData.time.breakpoints.dawn + LiveData.time.breakpoints.dusk) / 2  );
							LiveData.time.breakpoints.midmorn = Math.floor( (LiveData.time.breakpoints.dawn + LiveData.time.breakpoints.afternoon) / 2  );
							LiveData.time.breakpoints.night = Math.floor( LiveData.time.breakpoints.dusk + 1800 );
							LiveData.time.breakpoints.arr = $.map(LiveData.time.breakpoints, function(v, i) { return [v]; });
							LiveData.time.breakpoints.arr.sort(function(a,b){return (+a)-(+b)});
							return false;
						}
					});
					
					LiveData.date.update();
					
					var storageData = {time: {breakpoints: LiveData.time.breakpoints}, lastUpdate: __.getTime()};
					localStorage.dailyData = JSON.stringify( storageData );
			 	},
			 	getHourlyData: function(){
			 		var hourlyCondition = forecast.getCurrentConditions(LiveData.region.latitude, LiveData.region.longitude);
					
					LiveData.temp.currentTemp = hourlyCondition.getTemperature();
					LiveData.weather.currentWeather = hourlyCondition.getIcon();
					LiveData.temp.update();
					LiveData.weather.update();
					
					var storageData = {temp: {currentTemp: LiveData.temp.currentTemp}, weather: {currentWeather: LiveData.weather.currentWeather}, lastUpdate: __.getTime()};
					localStorage.hourlyData = JSON.stringify( storageData );
				}
			}
		};
	
	return LiveData;
});
