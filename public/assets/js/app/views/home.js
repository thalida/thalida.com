///////
// HOME :: VIEW
///////
define(function (require) {
	"use strict";
	var	mxp				= 	require('mixpanel'),
		__				=	require('utils'),
		PostListView	= 	require('app/views/postList'),
		postModels	=	require('app/models/post'),
		tpl		=	require('text!tpl/home.html'),
		template	=	_.template(tpl);

	return Backbone.View.extend({
		initialize: function () {
			//GET MODELS FOR LIST OF PROJECTS & ARTICLES
			this.postList = new postModels.PostCollection();
		},
		
		events: {
			"click .content-item": "navigate"
		},
		
		navigate: function(event){
			var	target	=	event.currentTarget,
				id	=	$(target).attr('id').replace('content-','');

			$('.wrapper').fadeOut(800, function(){ __.redirect('post/' + id); });
		},
	
		render: function (){
			//RENDER THE VIEW
			this.$el.html(template());
			
			//GET THE VIEW FOR THE LIST OF PROJECTS & ARTICLES
			var listView = new PostListView({collection: this.postList, el: $("#content-list-items", this.el)});
			
			//FETCH THE DATA FROM THE SERVER & RENDER ON SUCCESS
			this.postList.fetch({ success: function(){ listView.render(); } });
			
			//TRACK DATA
			mxp.track('Loaded Homepage');
			mxp.track_links(".content-item", "click project link", {referrer: document.referrer});
			
			return this;
		}
	});
});
