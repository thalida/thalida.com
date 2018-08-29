///////
// MODEL :: LIVEDATA
///////
//
// BREAKPOINTS: ARE TIMES DURING THE DAY WHEN DATA/COLORS SHOULD CHANGE
// ISNORTH: IS USED FOR SEASONS SINCE THEY SWITCH BASED ON THE HEMISPHERE
// PERSON: SAVES THE DATA FOR THE PERSON VISITING THE SITE
//
///////
define(function (require) {

	"use strict";

	var 	__		=	require('utils'),
		_breakpoints	=	{},
		LiveData	=	Backbone.Model.extend({
			
			///////
			// DEFAULT MODEL DATA
			defaults: {
				'lat': '38.8977',
				'long': '-77.0366',
				'breakpoints': { "midnight": 0,  "predawn": 0,  "dawn": 0,  "midmorn": 0,  "afternoon": 0,  "dusk": 0,  "night": 0 }, 
				'temp': 0, 
				'weather': null,
				'isNorth': true,
				'person' : {visits: 0}
			},

			initialize: function ( ) {
				 _.bindAll(this);
				 
				 ///////
				 // USE HTML5 GEOLOCATION TO GET THE CURRENT LOCATION
				 if(navigator.geolocation)
					navigator.geolocation.getCurrentPosition(this.setCoords,this.setCoords); //THE SUCCESS AND ERROR STATES SHOULD DO THE SAME THING
				 else
					this.setCoords(); //IF THE BROWSER DOES NOT SUPPORT GEOLOCATION LOAD ANYWAY
				
				///////
				// SET INTERVALS FOR GETTING THE DATA AND CHANGING THE BACKGROUND
				window.setInterval(this.getHourlyData, __.toSeconds('01:00:00')*1000);
				window.setInterval(this.setPersonData, 1000);
				window.setInterval(this.setBackground, 1000);
				
				///////
				// LOAD MODEL DATA WITH DATA FROM LOCALSTORAGE IF POSSIBLE
				if( !__.isUndefined(localStorage.personData) ){
					var savedData = JSON.parse(localStorage.personData);
					this.set('person', $.extend(this.get('person'), savedData));
				}
				
				///////
				// RECORD CURRENT VISITS
				this.savePerson({visits: this.get('person').visits += 1});
			},
			
			setCoords: function( position ){
				if( typeof position.coords !== 'undefined'){ 
					//SET LAT AND LONG BASED ON WHAT WAS GIVEN BY THE BROWSER
					this.set({ lat: position.coords.latitude, long: position.coords.longitude });
				}else{
					//MIXPANEL TRACK IF THE USER HAS NOT GIVEN ANY COORDS
					mxp.track('No Coords Given');
				}
				
				//BASED ON LATITUDE CHECK IF WE'RE ABOVE THE EQUATOR
				this.set({isNorth: (this.get('lat') >= 0) ? true : false});
			},
			
			start: function( callback ){
				var deferred = $.Deferred();         
				
				//GET DAILY AND HOULY DATA
				this.setDailyData();
				this.setHourlyData();
				
				//THESE ARE "FAKE" BREAKPOINTS TO BE USED LATER, THEY'RE A BIT SCHEWED COMPARED TO THE "REGULAR" BREAKPOINTS
				_breakpoints = this.getBreakpoints();
				_breakpoints.afternoon -= __.toSeconds('01:00:00');
				_breakpoints.dusk -= __.toSeconds('01:00:00');
				_breakpoints.night += __.toSeconds('01:30:00');
				
				//SET DATA FOR THE PERSON VISITING AND SET THE BACKGROUND COLOR
				this.setPersonData();
				this.setBackground();
				
				//GET MIDNIGHT FOR TOMORROW, AND SET A TIMEOUT TO GET THE NEW DAILY DATA
				var midnightTomorrow = new Date().setHours(24,0,0,0) / 1000;
				window.setTimeout(this.getDailyData, midnightTomorrow - __.getTime());
				
				deferred.resolve();
				return deferred.promise();
			},
			
			setDailyData: function(){
				var updateNeeded = true;
				
				//CHECK IF THERE IS ANY DAILY DATA SAVED
				if( !__.isUndefined(sessionStorage.dailyData) ){
					var currentTime = __.getTime(),
						storedData = JSON.parse(sessionStorage.dailyData);
						
					//IF THERE IS ANY DAILY DATA AND IT'S STILL VALID USE IT
					if(currentTime - storedData.lastUpdate < __.toSeconds('12:00:00')){
						updateNeeded = false;
						this.set({ breakpoints: storedData.breakpoints });
					}
				}
				
				//THERE IS NO DATA (OR NO VALID DATA) SO GET SOME
				if(updateNeeded === true) this.getDailyData();
			},
			
			setHourlyData: function(){
				var updateNeeded = true;
				
				//CHECK IF THERE IS ANY HOURLY DATA SAVED
				if( !__.isUndefined(sessionStorage.hourlyData) ){
					var currentTime = __.getTime(),
						storedData = JSON.parse(sessionStorage.hourlyData);
						
					//IF THERE IS ANY HOURLY DATA AND IT'S STILL VALID USE IT
					if(currentTime - storedData.lastUpdate < __.toSeconds('30:00')){	
						updateNeeded = false;
						this.set({ temp: storedData.temp, weather: storedData.weather });
					}
				}
				
				//THERE IS NO DATA (OR NO VALID DATA) SO GET SOME
				if(updateNeeded === true) this.getHourlyData();
			},
			
			setPersonData: function(){
				var time = __.getTime(),
					data = {};
					
				///////
				// BASED ON THE "FAKE" BREAKPOINTS SET VARIOUS NAMES, GREETINGS, AND MESSAGES FOR THE USER
				if( _breakpoints.dawn <= time&&time < _breakpoints.afternoon ){
					if( time >= _breakpoints.afternoon - __.toSeconds('01:00:00') ){
						data.greeting = 'Greetings';
						data.name = 'Brunch Master';
						data.message = 'It&rsquo;s almost lunch time... did you just get up? Lucky. Anyway, eat some brunch, and check out my site!';	
					}else{
						data.greeting = 'Good Morning';
						data.name = 'Early Bird';
						data.message = 'I hope you had a good nights rest. Did you battle any dragons in your sleep?';
					}
				}else if( _breakpoints.afternoon <= time&&time < _breakpoints.dusk ){
					data.greeting = 'Good Afternoon';
					data.name = 'Hungry Hippo';
					data.message = 'How was your lunch? I probably had a good one, the food in the DC area is amazingly amazing.';
				}else if( _breakpoints.dusk <= time&&time < _breakpoints.night ){
					data.greeting = 'Good Evening';
					data.name = 'Amazing Person';
					data.message = 'You should wind-down and relax after such a productive day. Watch some cat videos or fight some zombies.';
				}else{
					data.greeting = 'Greetings';
					data.name = 'Night Owl';
					data.message = 'Burning the night oil I see. Well, you&rsquo;ve landed in my home, take a chance to explore a bit. Then, go to sleep!';
				}
				
				data.greeting = 'Happy Holidays';
				
				/*if(2 <= this.get('person').visits&&this.get('person').visits < 10){
					data.message = 'Welcome back {{name}}! It&rsquo;s nice of you to visit again, explore the site, and contact me if you find something you like!';
				}else if(10 <= this.get('person').visits){
					data.message = '{{name}}, thanks for being such an amazing and prolific visitor of my site! Please contact me if you have any suggestions or requests!';
				}*/
				
				//IF THERE IS ANY PERSON DATA EXTEND THIS DATA
				data = $.extend(true, data, this.get('person'));
				
				//SAVE THIS DATA
				this.savePerson( data );
			},
			
			setBackground: function(){
				//MAKES A CALL TO THE UTILS FILE
				__.updateBackground( this.getBreakpoints() );
			},
			
			savePerson: function( data, change ){
				$.extend(this.get('person'), data);
				
				//SAVE THIS DATA
				localStorage.personData = JSON.stringify(_.pick(this.get('person'), 'name', 'visits'));
				
				//IF A CHANGE NEEDS TO BE TRIGGERD, DO IT
				if(typeof change !== 'undefined' && change === true) this.trigger('change');
			},
			
			getBreakpoints: function() {
				// RETURN THE BREAKPOINTS
				return $.extend(true, {}, this.get('breakpoints'));
			},
			
			getDailyData: function(){
				var weeklyConditions = forecast.getForecastWeek(this.get('lat'), this.get('long')), //MAKE A CALL TO THE FORECAST API
					today = new Date().getDate(), //GET TODAY'S DATE
					breakpoints = {};
					
				///////
				// LOOP THROUGH THE WEEKLY CONDITIONS
				$.each(weeklyConditions, function(index, thisCondition){
				
					// IF ONE OF THE CONDITIONS MATCHES TODAY DO STUFF
					if( thisCondition.getSunrise('D') == today ){
					
						//DO THE CALCULATIONS FOR THE BREAKPOINTS
						breakpoints.midnight =  new Date().setHours(0,0,0,0) / 1000;
						breakpoints.dawn = thisCondition.getSunrise();
						breakpoints.dusk = thisCondition.getSunset();
						
						breakpoints.predawn = Math.floor( (breakpoints.midnight + breakpoints.dawn) / 2  ); //PREDAWN IS THE MIDPOINT BETWEEN MIDNIGHT AND DAWN
						breakpoints.afternoon = Math.floor( (breakpoints.dawn + breakpoints.dusk) / 2  ); //AFTERNOON IS THE MIDPOINT BETWEEN DAWN AND DUSK
						breakpoints.midmorn = Math.floor( (breakpoints.dawn + breakpoints.afternoon) / 2  ); //MIDMORNING IS THE MIDPOINT BETWEEN DAWN AND AFTERNOON
						breakpoints.night = Math.floor( breakpoints.dusk + 1800 ); //NIGHT STARTS 30MINS AFTER DUSK
						
						breakpoints.array = $.map(breakpoints, function(v, i) { return [v]; }); //CREATE AN ARRAY OF ALL OF THESE BREAKPOINTS
						breakpoints.array.sort(function(a,b){return (+a)-(+b)});//SORT THE ARRAY FROM MIN TO MAX
						
						return false;
					}
				});
				
				//UPDATE THE BREAKPOINTS
				this.set({ breakpoints: breakpoints });
				
				//SAVE THIS DATA TO SESSION STORAGE
				sessionStorage.dailyData = JSON.stringify( {breakpoints: breakpoints, lastUpdate: __.getTime()} );
				
				//SET FAKE BREAKPOINTS
				_breakpoints = this.getBreakpoints();
				_breakpoints.afternoon -= __.toSeconds('01:00:00');
				_breakpoints.dusk -= __.toSeconds('01:00:00');
				_breakpoints.night += __.toSeconds('01:30:00');
				
				//SAVE THIS PERSON DATA & TRIGGER A CHANGE
				this.savePerson( this.get('person'), true );
				
				//SET A NEW TIMEOUT TO UPDATE THE DATA ON MIDNIGHT
				var midnightTomorrow = new Date().setHours(24,0,0,0) / 1000;
				window.setTimeout(this.getDailyData, midnightTomorrow - __.getTime());
			},
			
			getHourlyData: function(){
				var hourlyCondition = forecast.getCurrentConditions(this.get('lat'), this.get('long')), //GET HOURLY DATA
					temp = hourlyCondition.getTemperature(), //GET TEMP FOR THIS HOUR
					weather = hourlyCondition.getIcon(); //GET WEATHER FOR THIS HOUR
				
				//SAVE TO MODULE DATA
				this.set({ temp: temp, weather: weather });
				
				//SAVE THIS DATA TO SESSION STORAGE
				sessionStorage.hourlyData = JSON.stringify( {temp: temp, weather: weather, lastUpdate: __.getTime()} );
				
				//SAVE THIS DATA & TRIGGER A CHANGE
				this.savePerson( this.get('person'), true );
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