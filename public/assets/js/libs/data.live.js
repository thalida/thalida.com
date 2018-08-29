define(function (require) {
    "use strict";
    
    var forecast	= 	new ForecastIO(),
    	__			= 	require('utils'),
    	_			= 	require('underscore'),
		LiveData = {
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
				
				
				LiveData.time.update(true);
				
				
				LiveData.region.dInterval = window.setInterval(LiveData.region.getDailyData, __.toSeconds('01:00:00:00')*1000);
				LiveData.region.hInterval = window.setInterval(LiveData.region.getHourlyData, __.toSeconds('01:00:00')*1000);
				LiveData.time.interval = window.setInterval(LiveData.time.update,1000);
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
			},
			time: {
				interval: null,
				breakpoints: {},
				timeData: function( time ){
					var array = _.clone(LiveData.time.breakpoints.arr),
						data = {};
						
					data.newKey = _.sortedIndex(array, time);
					data.startKey = (data.newKey - 1 >= 0) ? data.newKey - 1 : array.length - 1,
					data.endTime = (data.newKey < array.length) ? array[data.newKey] : LiveData.time.breakpoints.midnight + __.toSeconds('23:59:59');
					
					return {key: data.startKey, elapsedTime: time - array[data.startKey], duration: data.endTime - array[data.startKey]};
				},
				updateClock: function(){
					var data = { h: new Date().getHours(), m: new Date().getMinutes(), s: new Date().getSeconds(), hours: {}, minutes: {}, seconds: {} };
					data.hours.deg = data.h * 30 + (data.m / 2),
					data.minutes.deg = data.m * 6,
					data.seconds.deg = data.s * 6,
					data.hours.rotation = "rotate(" + data.hours.deg + "deg)",
					data.minutes.rotation = "rotate(" + data.minutes.deg + "deg)",
					data.seconds.rotation = "rotate(" + data.seconds.deg + "deg)";
						
					$("#hour-hand").css({ "transform": data.hours.rotation});
					$("#minute-hand").css({ "transform": data.minutes.rotation});
					$("#second-hand").css({ "transform": data.seconds.rotation});
					$('#clock').show();
					
					data.militaryTime = __.addZero( data.h ) + ' : ' + __.addZero( data.m );
					$('#time-text').html(data.militaryTime);
				},
				update: function(isStart){
					var currentTime = __.getTime(),
						timeData = LiveData.time.timeData( currentTime ),
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
					    interval = timeData.elapsedTime / timeData.duration;
					    
					$('#current-info-time').animate({ backgroundColor: jQuery.Color(currentColor[0]).transition(currentColor[1], interval) }, 500 );
					//$('#current-info-time').css('backgroundColor',jQuery.Color(currentColor[0]).transition(currentColor[1], interval));
					LiveData.time.savedColor = currentColor;
					
					LiveData.time.updateClock();
					__.updateBackground( LiveData.time.breakpoints );
				}
			},
			temp: {
				currentTemp: 0,
				update: function(){
					var interval = (LiveData.temp.currentTemp - 32) / 88;
					$('#temp-text').html(Math.round(LiveData.temp.currentTemp) + '&deg; F');
					$('#current-info-temp').animate({ backgroundColor: jQuery.Color('#c0ddda').transition('#ffdc3a', interval) }, 500 );
					//$('#current-info-temp').css('backgroundColor',jQuery.Color('#c0ddda').transition('#ffdc3a', interval));
				}
			},
			weather: {
				currentWeather: 0,
				update: function(){
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
					},
					weather = weatherTypes[LiveData.weather.currentWeather];
					
					if(weather.name.length > 10)
						$('#weather-text').addClass('small-text');
					else
						$('#weather-text').removeClass('small-text');
					
					$('#weather-text').html(weather.name);
					$('#current-weather-icon').remove();
					$('#current-info-weather')
						.prepend('<span id="current-weather-icon" class="weather-icon '+LiveData.weather.currentWeather+'"></span>')
						.animate({ backgroundColor: weather.color }, 500 );
						//.css('backgroundColor',weather.color);
				}
			},
			date: {
				update: function(){
					var seasons = [
							['#e9b055','#b7ee0f'], //winter
							['#b7ee0f','#ff9600'], //spring
							['#ff9600','#ffcc00'], //summer
							['#ffcc00','#e9c284']  //fall
						],
						monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
						today = new Date(),
						thisMonth = today.getMonth() + 1,
						hemisphereFix = (LiveData.region.isNorth === true) ? 0 : 6,
						thisSeason = Math.floor((thisMonth + hemisphereFix) / 3) % 4,
						seasonColors = seasons[thisSeason];
						
					$('#date-text').html( __.addZero( today.getDate() ) + ' ' + monthNames[today.getMonth()] + '.' );
					$('#current-info-date').animate({ backgroundColor: seasonColors[1] }, 500 );
					//$('#current-info-date').css('backgroundColor',seasonColors[1]);
				}
			}
		};
	
	return LiveData;
});
