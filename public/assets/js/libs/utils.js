define(function (require) {
    "use strict";
    
    var $           = 	require('jquery'),
        _           = 	require('underscore');
        
        
   var utils = {
   		addTime: function(){
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
	
	return utils;
});
