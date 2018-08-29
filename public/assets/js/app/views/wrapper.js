define(function (require) {
	"use strict";
	var mxp				= 	require('mixpanel'),
		__				=	require('utils'),
		tpl		=	require('text!tpl/wrapper.html'),
		template	=	_.template(tpl),
		$header;

	return Backbone.View.extend({
		render: function () {
			this.$el.html(template());
			$header = $('header nav ul li:first', this.el);
			return this;
		},

		events: {
			"click .header-link": "navigate"
		},
		
		navigate: function(event){
			event.preventDefault();
			var	target = event.currentTarget,
				href = $(target).attr('href');
			$('.wrapper').fadeOut(800, function(){ __.redirect(href); });
		},

		removePageTitle: function(){
			$header.children('a').removeClass('primary-link');
			$header.children('span.content-title').hide();
			$header.children('span.content-title > .text').html('');
		},
		
		setPageTitle: function (title) {
			$header.children('a').addClass('primary-link');
			$header.children('span.content-title').show();
			$header.children('span.content-title').children('.text').html( title );
		}
	});
});