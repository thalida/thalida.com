'use strict';

var $requires = ['$sce'];

var service = function( $sce ){
	var utils = {};

	utils.getRandom = function( arr ){
		return arr[Math.floor(Math.random()*arr.length)];
	};

	utils.sanitize = function(str){
		return $sce.trustAsHtml(str);
	};

	return utils;
}

service.$inject = $requires;
module.exports = service;
