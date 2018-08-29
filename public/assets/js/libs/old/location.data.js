var forecast = new ForecastIO();
var LiveData = {
	start: function(position){
		if( typeof position.coords !== 'undefined'){
			LiveData.region.latitude = position.coords.latitude;
			LiveData.region.longitude = position.coords.longitude;
		}
		
		LiveData.region.isNorth = (LiveData.region.latitude >= 0) ? true : false;
		
		var getDaily = true;
		if(localStorage.dailyData != null){
			var currentTime = new Date().getTime();
			var parsedData = JSON.parse(localStorage.dailyData);
			if( currentTime - parsedData.lastUpdate < 86400000){
				getDaily = false;
				$.extend(true, LiveData.time, parsedData.time);
				LiveData.date.update();
			}
		}
	
		var getHourly = true;
		if( localStorage.hourlyData != null && currentTime - localStorage.hourlyData.lastUpdate < 3600000){
			var currentTime = new Date().getTime();
			var parsedData = JSON.parse(localStorage.hourlyData);
			if( currentTime - parsedData.lastUpdate < 3600000){	
				getHourly = false;
				$.extend(true, LiveData.temp, parsedData.temp);
				$.extend(true, LiveData.weather, parsedData.weather);
				LiveData.temp.update();
				LiveData.weather.update();
			}
		}
		
		if(getDaily === true){
			$('#loading-overlay').show();
			LiveData.region.getDailyData();
		}
		
		if(getHourly === true){
			$('#loading-overlay').show();
			LiveData.region.getHourlyData();
		}
		
		LiveData.time.update(true);
		
		Person.init();
		
		$('#loading-overlay').hide();
		$('.wrapper').fadeIn(800);
		
		LiveData.region.dInterval = window.setInterval(LiveData.region.getDailyData,86400000);
		LiveData.region.hInterval = window.setInterval(LiveData.region.getHourlyData,3600000);
		LiveData.time.interval = window.setInterval(LiveData.time.update,1000);
		//mixpanel.track('loadedHomePage');
	},
	region: {
		latitude: 38.8977,
		longitude: -77.0366,
		getDailyData: function(){
			var weeklyConditions = forecast.getForecastWeek(LiveData.region.latitude, LiveData.region.longitude),
				breakpoints = LiveData.time.breakpoints,
				today = new Date().getDate();
			
			breakpoints.midnight =  new Date().setHours(0,0,0,0) / 1000;
			
			$.each(weeklyConditions, function(index, thisCondition){
				if( thisCondition.getSunrise('D') == today ){
					breakpoints.dawn = thisCondition.getSunrise();
					breakpoints.dusk = thisCondition.getSunset();
					breakpoints.predawn = Math.floor(  (breakpoints.midnight + breakpoints.dawn) / 2  );
					breakpoints.afternoon = Math.floor(  (breakpoints.dawn + breakpoints.dusk) / 2  );
					breakpoints.midmorn = Math.floor(  (breakpoints.dawn + breakpoints.afternoon) / 2  );
					breakpoints.night = Math.floor( breakpoints.dusk + 1800 );
					return false;
				}
			});
			
			LiveData.date.update();
			
			var storageData = {time: {breakpoints: LiveData.time.breakpoints}, lastUpdate: new Date().getTime()};
			localStorage.dailyData = JSON.stringify( storageData );
	 	},
	 	getHourlyData: function(){
	 		var hourlyCondition = forecast.getCurrentConditions(LiveData.region.latitude, LiveData.region.longitude);
			
			LiveData.temp.currentTemp = hourlyCondition.getTemperature();
			LiveData.weather.currentWeather = hourlyCondition.getIcon();
			LiveData.temp.update();
			LiveData.weather.update();
			
			var storageData = {temp: {currentTemp: LiveData.temp.currentTemp}, weather: {currentWeather: LiveData.weather.currentWeather}, lastUpdate: new Date().getTime()};
			localStorage.hourlyData = JSON.stringify( storageData );
		}
	},
	time: {
		interval: null,
		breakpoints: {},
		timeOfDay: function( time ){
			var timeOfDay = -1,
				secondsBetween,
				secondsSinceStart;
			
			if( time >= LiveData.time.breakpoints.midnight && time < LiveData.time.breakpoints.predawn){
				timeOfDay = 0;
				secondsSinceStart = time - LiveData.time.breakpoints.midnight;
				secondsBetween = LiveData.time.breakpoints.predawn - LiveData.time.breakpoints.midnight;
			}
			
			else if( time >= LiveData.time.breakpoints.predawn && time < LiveData.time.breakpoints.dawn){
				timeOfDay = 1;
				secondsSinceStart = time - LiveData.time.breakpoints.predawn;
				secondsBetween = LiveData.time.breakpoints.dawn - LiveData.time.breakpoints.predawn;
			}
			
			else if( time >= LiveData.time.breakpoints.dawn && time < LiveData.time.breakpoints.midmorn){
				timeOfDay = 2;
				secondsSinceStart = time - LiveData.time.breakpoints.dawn;
				secondsBetween = LiveData.time.breakpoints.midmorn - LiveData.time.breakpoints.dawn;
			}
			
			else if( time >= LiveData.time.breakpoints.midmorn && time < LiveData.time.breakpoints.afternoon){
				timeOfDay = 3;
				secondsSinceStart = time - LiveData.time.breakpoints.midmorn;
				secondsBetween = LiveData.time.breakpoints.afternoon - LiveData.time.breakpoints.midmorn;
			}
			
			else if( time >= LiveData.time.breakpoints.afternoon && time < LiveData.time.breakpoints.dusk){
				timeOfDay = 4;
				secondsSinceStart = time - LiveData.time.breakpoints.afternoon;
				secondsBetween = LiveData.time.breakpoints.dusk - LiveData.time.breakpoints.afternoon;
			}
			
			else if( time >= LiveData.time.breakpoints.dusk && time < LiveData.time.breakpoints.night){
				timeOfDay = 5;
				secondsSinceStart = time - LiveData.time.breakpoints.dusk;
				secondsBetween = LiveData.time.breakpoints.night - LiveData.time.breakpoints.dusk;
			}
			
			else{
				timeOfDay = 6;
				secondsSinceStart = time - LiveData.time.breakpoints.night;
				secondsBetween = LiveData.time.breakpoints.night - (new Date().setHours(24,0,0,0) / 1000);
			}
				
			return {type: timeOfDay, seconds: secondsBetween, secondsPast: secondsSinceStart};
				
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
			
			data.militaryTime = addZero( data.h ) + ' : ' + addZero( data.m );
			$('#time-text').html(data.militaryTime);
		},
		update: function(isStart){
			var currentTime = Math.round(new Date().getTime() / 1000),
				timeData = LiveData.time.timeOfDay( currentTime ),
				colors = [
					['#0f0f2e', '#ffeed9'], //predawn
					['#ffeed9', '#10eed9'], //dawn
					['#10eed9', '#0fee9a'], //midmorning
					['#0fee9a', '#fbff99'], //afternoon
					['#fbff99', '#ff1399'], //dusk
					['#ff1399', '#252564'], //night
					['#252564', '#0d0d33']  //midnight
				],
			    currentColor = colors[ timeData.type ],
			    interval = timeData.secondsPast / timeData.seconds;
			    
			$('#current-info-time').css('backgroundColor',jQuery.Color(currentColor[0]).transition(currentColor[1], interval));
			LiveData.time.savedColor = currentColor;
			
			LiveData.time.updateClock();
			updateBackground();
		}
	},
	temp: {
		currentTemp: 0,
		update: function(){
			var interval = (LiveData.temp.currentTemp - 32) / 88;
			$('#temp-text').html(Math.round(LiveData.temp.currentTemp) + '&deg; F');
			$('#current-info-temp').css('backgroundColor',jQuery.Color('#c0ddda').transition('#ffdc3a', interval));
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
			$('#current-info-weather').prepend('<span id="current-weather-icon" class="weather-icon '+LiveData.weather.currentWeather+'"></span>');
			$('#current-info-weather').css('backgroundColor',weather.color);
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
				monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				today = new Date(),
				thisMonth = today.getMonth() + 1,
				hemisphereFix = (LiveData.region.isNorth === true) ? 0 : 6,
				thisSeason = Math.floor((thisMonth + hemisphereFix) / 3) % 4,
				seasonColors = seasons[thisSeason];
				
			$('#date-text').html( addZero( today.getDate() ) + ' ' + monthNames[today.getMonth()] + '.' );
			$('#current-info-date').css('backgroundColor',seasonColors[1]);
		}
	}
};
