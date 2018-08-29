///////
// LIVEDATA :: VIEW
///////
define(function (require) {

	"use strict";
	
	var mxp		=	require('mixpanel'),
		__		=	require('utils'),	
		tpl		=	require('text!tpl/liveData.html'),
		template	=	_.template(tpl),
		breakpoints	=	{},
		greetingInterval,
		origName;

	return Backbone.View.extend({
	
		initialize: function () {
			_.bindAll(this);
			
			//ON CHANGES TO MODEL RENDER THIS VIEW
			this.model.bind('change', this.render);
			
			//UPDATE THE TIME & GREETING PORTION OF THIS VIEW EVERY SECOND
			window.setInterval(this.time,1000);
			greetingInterval = window.setInterval(this.greeting,1000);
			
			//MIXPANEL
			mxp.track('Loaded LiveData');
		},
		
		render: function () {
			//RENDER THE FILE
			this.$el.html(template());
			
			//SAVE NAME OF USER ON RENDER
			origName = this.model.get('person').name;
			
			this.time();
			this.temp();
			this.weather();
			this.date();
			this.greeting();
			
			$('#clock').show();
			return this;
		},
		
		events: {
			"focus #person-input-name": "focusName",
			"keyup #person-input-name": "typing",
			"blur #person-input-name": "saveName"
		},
		
		focusName: function(event) {
			//STOP UPDATING THE GREETING INVERVAL WHEN WE FOUCS ON THE INPUT BOX
			var $this = $(event.target);
			clearInterval(greetingInterval);
		},
		
		typing: function(event) {
			var	$this = $(event.target),
				val = $this.val(),
				re = /^[a-zA-Z0-9\._\s-]{1,30}$/,
				keyCode = event.keyCode || event.which;
				
			//IF THIS NAME ISN'T VALID REMOVE THE CHARACTER TYPED
			if( __.validateName( val ) === false )
				$this.val( val.substr(0, val.length - 1) );
			
			//IF ENTER KEY IS PRESSED TRIGGER SAVE (BY BLURRING)
			if(keyCode == 13)
				$this.trigger('blur');
			
		},
		
		saveName: function(event) {
			var	$this = $(event.target),
				val = $this.val(),
				re = /^[a-zA-Z0-9\._\s-]{1,30}$/;
				
			//IF NO NAME IS ENTERED, DO NOT SAVE IT
			if(val.length == 0) val = origName;
			
			//ONLY SAVE THE NAME IF IT'S VALID
			if( __.validateName( val ) === true ){
				this.model.savePerson({name: val}, true);
				greetingInterval = window.setInterval(this.greeting,1000);
			}
		},
		
		timeData: function( time ){
			var	breakpoints = this.model.get('breakpoints'),
				array = _.clone(breakpoints.array),
				data = {};
				
			//GET WHAT POSITION IN THE SORTED BREAKPOINTS ARRAY THIS TIME WILL BE
			data.newKey = _.sortedIndex(array, time);
			
			//BASED ON DATA.NEWKEY, CALCULATE THE STARTING BREAKPOINT
			data.startKey = (data.newKey - 1 >= 0) ? data.newKey - 1 : array.length - 1,
			
			//BASED ON DATA.NEWYKEY WHAT'S THE ENDING BREAKPOINT
			data.endTime = (data.newKey < array.length) ? array[data.newKey] : breakpoints.midnight + __.toSeconds('23:59:59');
			
			//RETURN THE STARTKEY, THE ELAPSED TIME, AND THE DURATION
			return {key: data.startKey, elapsedTime: time - array[data.startKey], duration: data.endTime - array[data.startKey]};
		},
			
		time: function(isStart){
			var	currentTime = __.getTime(),
				timeData = this.timeData( currentTime ), //GET THE DATA BASED OFF OF THIS CURRENT TIME
				colors = [
					['#0f0f2e', '#ffeed9'], //predawn
					['#ffeed9', '#10eed9'], //dawn
					['#10eed9', '#0fee9a'], //midmorning
					['#0fee9a', '#fbff99'], //afternoon
					['#fbff99', '#ff1399'], //dusk
					['#ff1399', '#252564'], //night
					['#252564', '#0d0d33']  //midnight
				],
				currentColor = colors[ timeData.key ],//BASED ON THE KEY RETURNED, GET THE COLORS NECESSARY
				interval = timeData.elapsedTime / timeData.duration, //GET THE CURRENT INTERVAL
				clock = { h: new Date().getHours(), m: new Date().getMinutes(), s: new Date().getSeconds(), hours: {}, minutes: {}, seconds: {} };
			
			///////
			// RENDER THE COLOCK
			clock.hours.deg = clock.h * 30 + (clock.m / 2);
			clock.minutes.deg = clock.m * 6;
			clock.seconds.deg = clock.s * 6;
			clock.hours.rotation = "rotate(" + clock.hours.deg + "deg)";
			clock.minutes.rotation = "rotate(" + clock.minutes.deg + "deg)";
			clock.seconds.rotation = "rotate(" + clock.seconds.deg + "deg)";
			clock.militaryTime = __.addZero( clock.h ) + ' : ' + __.addZero( clock.m );
			$("#hour-hand").css({ "transform": clock.hours.rotation});
			$("#minute-hand").css({ "transform": clock.minutes.rotation});
			$("#second-hand").css({ "transform": clock.seconds.rotation});
			$('#time-text').html(clock.militaryTime);
			
			//SET THE BACKGROUND COLOR BASED ON THE CURRENT POSION IN THE SPECTRUM
			$('#current-info-time').animate({ backgroundColor: __.transitionColor(currentColor[0], currentColor[1], interval) }, 0 );
		},
		
		temp: function(){
			var	temp = this.model.get('temp'),
				interval = (temp - 32) / 88;
			$('#temp-text').html(Math.round(temp) + '&deg; F');
			$('#current-info-temp').animate({ backgroundColor: __.transitionColor('#c0ddda','#ffdc3a', interval) }, 0 );
		},
		
		weather: function(){
			var	currentWeather = this.model.get('weather'), 
				weatherTypes = {
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
				weather = weatherTypes[currentWeather];
			
			if(weather.name.length > 10)
				$('#weather-text').addClass('small-text');
			else
				$('#weather-text').removeClass('small-text');
			
			$('#weather-text').html(weather.name);
			$('#current-weather-icon').remove();
			$('#current-info-weather').prepend('<span id="current-weather-icon" class="weather-icon '+currentWeather+'"></span>').animate({ backgroundColor: weather.color }, 0 );
		},
		
		
		date: function(){
			var	seasons = [
					['#dcccc5','#83e1e0'], //winter
					['#83e1e0','#b2ed67'], //spring
					['#b2ed67','#ffae00'], //summer
					['#ffae00','#dcccc5']  //fall
				],
				monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
				today = new Date(),
				thisMonth = today.getMonth() + 1,
				dayOfYear = __.getDayOfYear(),
				hemisphereFix = (this.model.get('isNorth') === true) ? 0 : 6,
				thisSeason = Math.floor((thisMonth + hemisphereFix) / 3) % 4,
				seasonColors = seasons[thisSeason],
				interval = (366 - dayOfYear) / 90;

			$('#date-text').html( __.addZero( today.getDate() ) + ' ' + monthNames[today.getMonth()] + '.' );
			$('#current-info-date').animate({ backgroundColor: __.transitionColor(seasonColors[0],seasonColors[1], interval) }, 0 );
		},
		
		greeting: function( ){
			$('#welcome-salutations').html( '<p><span>' + this.model.get('person').greeting + ',</span><span><input id="person-input-name" type="text" value="' + this.model.get('person').name + '" /></span></p>' );
			$('#welcome-message').html( '<p>' + __.formatText(this.model.get('person').message, this.model.get('person')) + '</p>' );
		}
	});

});