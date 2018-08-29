define(function (require) {
    "use strict";
    
    var __			= 	require('utils'),
        Person		= 	{
        	custom: {},
        	data: {},
			init: function( breakpoints, callback ){
			
				breakpoints.afternoon -= __.toSeconds('01:00:00');
				breakpoints.dusk -= __.toSeconds('30:00');
				breakpoints.night += __.toSeconds('01:30:00');
				Person.time.breakpoints = breakpoints;
				
				if( localStorage.personData != null){
					var parsedData = JSON.parse(localStorage.personData);
					$.extend(Person.custom, parsedData);
				}
				
				Person.update();
				Person.interval = window.setInterval(Person.update,1000);
				
				if(typeof callback !== 'undefined')
					return callback();
			},
			time : {},
			update: function(){
				var time = __.getTime(),
					data = {},
					breakpoints = Person.time.breakpoints;
					
				if( breakpoints.dawn <= time&&time < breakpoints.afternoon ){
					if( time >= breakpoints.afternoon - __.toSeconds('01:00:00') ){
						data.greeting = 'Greetings';
						data.name = 'Brunch Master';
						data.message = 'It\'s almost lunch time... did you just get up? Lucky. Anyway, eat some brunch, and check out my site!';	
					}else{
						data.greeting = 'Good Morning';
						data.name = 'Early Bird';
						data.message = 'I hope you had a good nights rest. Did you battle any dragons in your sleep?';
					}
				}else if( breakpoints.afternoon <= time&&time < Person.time.breakpoints.dusk ){
					data.greeting = 'Good Afternoon';
					data.name = 'Hungry Hippo';
					data.message = 'How was your lunch? I probably had a good one, the food in the DC area is amazingly amazing.';
				}else if( breakpoints.dusk <= time&&time < Person.time.breakpoints.night ){
					data.greeting = 'Good Evening';
					data.name = 'Amazing Person';
					data.message = 'You should wind-down and relax after such a productive day. Watch some cat videos or fight some zombies.';
				}else if( time  >= breakpoints.night ){
					data.greeting = 'Greetings';
					data.name = 'Night Owl';
					data.message = 'Burning the night oil I see. Well, you\'ve landed in my home, take a chance to explore a bit. Then, go to sleep!';
				}else{
					data.greeting = 'Greetings';
					data.name = 'Awesome Guest';
					data.message = 'How are you doing today?';
				}
				
				$.extend(Person.data, data);
				$.extend(Person.data, Person.custom);
				
				$('#welcome-salutations').html( '<p><span>' + Person.data.greeting + ',</span><span><input id="person-input-name" type="text" value="' + Person.data.name + '" /></span></p>' );
				$('#welcome-message').html( '<p>' + Person.data.message + '</p>' );
				$('#continue-reading').html('Read more ' + Person.data.name + '?');
			},
			save: function(opts){
				Person.custom[opts.var] = opts.val;
				localStorage.personData = JSON.stringify(Person.custom);
			}
		};
	
	return Person;
});