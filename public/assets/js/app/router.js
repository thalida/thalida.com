///////
// ROUTER
///////
define(function (require) {
	"use strict";
	var	SiteWrapperView	=	require('app/views/wrapper'),
		HomepageView	= 	require('app/views/home'),
		LiveDataView		= 	require('app/views/liveData'),
		
		$body			=	$('body'),
		wrapperView		=	new SiteWrapperView({el: $body}).render(),
		$content		=	$("#content", wrapperView.el);
		
	return Backbone.Router.extend({
		routes: {
			"": "home",
			"about": "about",
			"post/:id": "viewPost"
		},
		home: function () {
			$('#wrapper').hide();
			
			wrapperView.removePageTitle();
			
			///////
			// RENDER HOME PAGE
			var homeView = new HomepageView({el: $content});
				homeView.delegateEvents();
				homeView.render();
			
			///////
			// RENDER LIVE DATA (TIME/TEMP/WEATHER/DATE)
			var $liveContent = $("#liveData", homeView.el),
			liveView = new LiveDataView({model: LiveData, el: $liveContent});
			liveView.delegateEvents();
			liveView.render();
			
			///////
			// MAKE SURE THE USER IS AT THE TOP OF THE PAGE AND FADE IN
			$('body').scrollTop(0);
			$('#loading-overlay').hide();
			$('#wrapper').fadeIn(800);
		},
		about: function () {
			require(["app/views/about"], function (AboutView) {
				///////
				// RENDER ABOUT PAGE
				var view = new AboutView({el: $content});
				view.render();
				wrapperView.setPageTitle('About');
				
				///////
				// MAKE SURE THE USER IS AT THE TOP OF THE PAGE AND FADE IN
				$('body').scrollTop(0);
				$('#loading-overlay').hide();
				$('#wrapper').fadeIn(800);
			});
		},
		viewPost: function (id) {
			require(["app/views/post", "app/models/post"], function (PostView, model) {
				//GET POST BASED OFF OF ID
				var post = new model.Post({id: id});
				post.fetch({
					success: function (data) {
						if(data.attributes.post !== false){
							wrapperView.setPageTitle( data.attributes.post.title );
							
							///////
							// RENDER POST
							var view = new PostView({model: data, el: $content});
							view.render();
							view.delegateEvents();
							
							///////
							// MAKE SURE THE USER IS AT THE TOP OF THE PAGE AND FADE IN
							$('body').scrollTop(0);
							$('#loading-overlay').hide();
							$('#wrapper').fadeIn(800);
						}else{
							__.redirect();
						}
					}
				});
			});
		}
	});
});