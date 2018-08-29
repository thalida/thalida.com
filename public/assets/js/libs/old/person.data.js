var Person = {
	data: {},
	init: function(){
		Person.update();
		Person.interval = window.setInterval(Person.update,1000);
	},
	update: function(){
		var time = Math.round( new Date().getTime() / 1000 ),
			timeOfDay = 0,
			greeting,
			name,
			message;
		
		if( time >= LiveData.time.breakpoints.dawn && (time + 3600) < LiveData.time.breakpoints.afternoon ){
			timeOfDay = 0;
			if( (time + 7200) >= LiveData.time.breakpoints.afternoon ){
				greeting = 'Greetings';
				name = 'Brunch Master';
				message = 'It\'s almost lunch time... did you just get up? Lucky. Anyway, eat some brunch, and check out my site!';	
			}else{
				greeting = 'Good Morning';
				name = 'Early Bird';
				message = 'I hope you had a good nights rest. Did you battle any dragons in your sleep?';
			}
		}else if( (time + 3600) >= LiveData.time.breakpoints.afternoon && (time + 1800) < LiveData.time.breakpoints.dusk ){
			timeOfDay = 1;
			greeting = 'Good Afternoon';
			name = 'Hungry Hippo';
			message = 'How was your lunch? I probably had a good one, the food in the DC area is amazingly amazing.';
		}else if( (time + 1800) >= LiveData.time.breakpoints.dusk && (time - 5400) < LiveData.time.breakpoints.night ){
			timeOfDay = 2;
			greeting = 'Good Evening';
			name = 'Amazing Person';
			message = 'You should wind-down and relax after such a productive day. Watch some cat videos or fight some zombies.';
		}else{
			timeOfDay = 3;
			greeting = 'Greetings';
			name = 'Night Owl';
			message = 'Burning the night oil I see. Well, you\'ve landed in my home, take a chance to explore a bit. Then, go to sleep!';
		}
		
		Person.data.timeOfDay = timeOfDay;
		Person.data.name = name;
		Person.data.greeting = greeting;
		Person.data.message = message;
		
		$('#welcome-salutations').html( '<p><span>' + greeting + ',</span><span><input id="person-input-name" type="text" value="' + name + '" /></span></p>' );
		$('#welcome-message').html( '<p>' + message + '</p>' );
		$('#continue-reading').html('Still reading ' + name + '?');
	}
};