'use strict';

app.service('Utils', [
	'$sce',
	function($sce){
		var utils = {
			getRandom: function( arr ){
				return arr[Math.floor(Math.random()*arr.length)];
			},
			sanitize: function(str){
				return $sce.trustAsHtml(str);
			}
		};

		return utils;
	}
]);
