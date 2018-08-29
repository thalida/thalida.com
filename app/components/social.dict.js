'use strict';

app.service('socialDict', [
	function(){
		var social = [
			{
				name: 'github',
				logo: 'assets/images/social-github.svg',
				url: 'https://github.com/thalida'
			},
			{
				name: 'twitter',
				logo: 'assets/images/social-twitter.svg',
				url: 'https://twitter.com/thalidanoel'
			},
			{
				name: 'instagram',
				logo: 'assets/images/social-instagram.svg',
				url: 'https://instagram.com/tia.elle/'
			}
		];

		return {
			get: function(){
				return social;
			}
		};
	}
]);
