'use strict';

app.service('skillsDict', [
	function(){
		var skills = [
			{
				weight: 'strong',
				type: 'framework',
				label: 'AngularJS'
			},
			{
				weight: 'strong',
				type: 'preprocessor',
				label: 'CoffeeScript'
			},
			{
				weight: 'light',
				type: 'builder',
				label: 'Grunt'
			},
			{
				weight: 'medium',
				type: 'builder',
				label: 'Gulp'
			},
			{
				weight: 'light',
				type: 'framework',
				label: 'Backbone'
			},
			{
				weight: 'light',
				type: 'framework',
				label: 'React'
			}
		];

		return {
			get: function(){
				return skills;
			}
		};
	}
]);
