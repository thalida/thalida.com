'use strict';

app.service('fancyTimeDict', [
	function(){
		var timePeriods = [
			{
				name: 'nightowl',
				beginAt: 0,
				color: '#323C64',
				sayings: [
					'Woah, Nightowl!',
					'Up Late?',
					'Can&rsquo;t sleep?'
				]
			},
			{
				name: 'earlybird',
				beginAt: 4,
				color: '#8B98CE',
				// color: '#97FFDF',
				sayings: [
					'OMG, the elusive EarlyBird!',
					'Hi, Early Riser!'
				]
			},
			{
				name: 'morning',
				beginAt: 8,
				color: '#56D8FF',
				sayings: [
					'Good Morning!',
					'Good Dreams?'
				]
			},
			{
				name: 'afternoon',
				beginAt: 12,
				color: '#FFD874',
				sayings: [
					'Good Afternoon!',
					'Food O&lsquo;Clock'
				]
			},
			{
				name: 'midafternoon',
				beginAt: 15,
				color: '#FFB774',
				sayings: [
					'Oh, Hi!',
					'How are you?',
					'Oh, Hey you!'
				]
			},
			{
				name: 'evening',
				beginAt: 18,
				color: '#FF8774',
				sayings: [
					'Good Evening!',
					'Good day?'
				]
			},
			{
				name: 'night',
				beginAt: 21,
				color: '#284BD7',
				sayings: [
					'Good Night!',
					'Plans Tonight?'
				]
			}
		];

		return {
			get: function(){
				return timePeriods;
			}
		};
	}
]);
