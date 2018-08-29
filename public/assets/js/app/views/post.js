define(function (require) {
	"use strict";

	var	mxp					=	require('mixpanel'),
		__					=	require('utils'),
		PostListView		=	require('app/views/postList'),
		tpl			=	require('text!tpl/post.html'),
		connectionTpl		=	require('text!tpl/post-connection.html'),
		template		=	_.template(tpl),
		connTemplate		=	 _.template(connectionTpl);

	return Backbone.View.extend({
	
		initialize: function () {
			 _.bindAll(this);
		},
		
		render: function () {
			this.postData();
			this.$el.html(template(this.model.attributes));
			
			var post = this.model.attributes.post;
			if(post.type == 3) $('#content-experiment').load('/public/content/demos/' + post.demoURL);
			if(post.id == 14) $('#content-long-text').html(connTemplate( LiveData.attributes ));
			
			$('#continue-reading').html(LiveData.get('person').name + ', this is the end.');
			
			mxp.track('Loaded Project', { 'id':  post.id });
			
			return this;
		},
		
		postData: function(){
			var	post = this.model.attributes.post,
				next = this.model.attributes.next,
				prev = this.model.attributes.prev;
				
			post.subtitle = __.formatText( post.subtitle, LiveData.get('person'));
			post.text = __.formatText( post.text, LiveData.get('person'));
			post.websiteText = (post.website.length > 0) ? "View the website" : "No Website Available";
			post.githubText = (post.github.length > 0) ? "Github Repo" : "No Github Repo Available";
			post.websiteClass = (post.website.length === 0) ? "no-link" : "";
			post.githubClass = (post.github.length === 0) ? "no-link" : "";
			post.fontColor = __.contrastColor({hex: post.color, midpoint: 200, light: '#fefbf8', dark: '#807e7d'})
			post.icon = post.images.split(';')[0];
			
			if(post.type == 1){
				var	imagesArr = post.images.split(';'),
					images = '';
				$.each(imagesArr, function( index, image ) {
					if( index != 0 )
						images += '<img class="content-image-item" src="/public/content/images/large/' + image + '" />';
				});
				post.images = images;
			}else if(post.type == 3){
				post.demoURL = post.images.split(';')[1];
			}
			
			if(next !== false){
				next.fontColor = __.contrastColor({hex: next.color, midpoint: 200, light: '#fefbf8', dark: '#807e7d'})
				next.icon = next.images.split(';')[0];
			}
			
			if(prev !== false){
				prev.fontColor = __.contrastColor({hex: prev.color, midpoint: 200, light: '#fefbf8', dark: '#807e7d'})
				prev.icon = prev.images.split(';')[0];
			}
		},
		
		events: {
			"click .content-item": "navigate"
		},
		
		navigate: function(event){
			var	target = event.currentTarget,
				id = $(target).attr('id').replace('content-','');
			
			if( id > 0 )
				$('.wrapper').fadeOut(800, function(){ __.redirect('post/' + id); });
		}
	});

});