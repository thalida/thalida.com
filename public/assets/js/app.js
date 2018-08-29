//REQUIRE.JS CONFIG
require.config({
	baseUrl: 'public/assets/js/libs',
	paths: {
		app: '../app',
		tpl: '../tpl',
		
		jquery: "http://code.jquery.com/jquery-latest",
		jqueryui: "http://code.jquery.com/ui/1.10.3/jquery-ui.min",
		mediaqueries: 'css3-mediaqueries',
		forecast: 'forecast.io'
	},
	shim: {
		'jqueryui': {
			deps: ['jquery']
		},
		'backbone': {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		},
		'underscore': {
			exports: '_'
		},
		'forecast': {
			deps: ['jquery']
		},
		'mixpanel': {
			deps: ['mixpanel-preinit'],
			exports: 'mixpanel'
		},
		'utils':{
			deps: ['backbone'],
			exports: '__'
		},
		'app/models/liveData': {
			deps: ['utils','backbone'],
		}
	}
});

//GET MIXPANEL WORKING WITH REQUIRE.JS ==> BORROWED FROM A STACKOVERFLOW ANSWER
define("mixpanel-preinit", function(require) {
	var b=window.mixpanel=window.mixpanel||[];var i,g;b._i=[];b.init=function(a,e,d){function f(b,h){var a=h.split(".");2==a.length&&(b=b[a[0]],h=a[1]);b[h]=function(){b.push([h].concat(Array.prototype.slice.call(arguments,0)))}}"undefined"!==typeof d?c=b[d]=[]:d="mixpanel";b._i.push([a,e,d])};b.__SV=1.2;
	b.init("20fdaa8f11330c326b9527edf411f4f7");
});

require([
	'jquery', 
	'backbone', 
	'app/router', 
	'mixpanel', 
	'underscore', 
	'utils', 
	'app/models/liveData',

	'forecast', 
	'jqueryui'
], function ($, Backbone, Router, mixpanel, _, __, dataModel) {
	//CLEAR ALL INTERVALS (JUST TO BE SAFE)
	__.intervals.clearAll();
	
	//SETUP FORECAST IO
	forecast = new ForecastIO();
	
	//INITALIZE LIVE DATA
	LiveData = new dataModel.LiveData();
	
	//START LIVE DATA & WHEN DONE DO STUFF
	LiveData.start().done(function(){
		var router = new Router();
		Backbone.history.start();
	});
});