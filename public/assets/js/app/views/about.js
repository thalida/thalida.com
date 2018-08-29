///////
// ABOUT :: VIEW
///////
define(function (require) {
	"use strict";

	var	mxp				= 	require('mixpanel'),
		__				=	require('utils'),
		tpl		=	require('text!tpl/about.html'),
		model 	=	require('app/models/post'),
		template 	=	_.template(tpl);

	return Backbone.View.extend({
	
		initialize: function () {
			 _.bindAll(this);
		},
		
		render: function () {
			var favoritePosts = [];
			var that = this;
			$.when( this.getPost(19), this.getPost(17) ).done(function( post1, post2 ) {
				post1[0].post.icon = post1[0].post.images.split(';')[0];
				post2[0].post.icon = post2[0].post.images.split(';')[0];
				that.$el.html(template({LiveData: LiveData.attributes, Posts: [post1[0].post, post2[0].post]}));
			});
			
			//MIXPANEL
			mxp.track('Loaded About');
			
			return this;
		},
		
		events: {
			"click .content-item": "navigate"
		},
		
		navigate: function(event){
			var	target 	=	event.currentTarget,
				id 	=	$(target).attr('id').replace('content-','');
			
			if( id > 0 )
				$('.wrapper').fadeOut(800, function(){ __.redirect('post/' + id); });
		},
		
		getPost: function( id ){
			return new model.Post({id: id}).fetch();
		}
	});

});