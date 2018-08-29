define(function (require) {
	"use strict";
	var	PostListItemView	=	require('app/views/postListItem');

	return Backbone.View.extend({
		render: function () {
			this.$el.empty();
			_.each(this.collection.models, function (post) {
				this.$el.append(new PostListItemView({model: post}).render().el);
			}, this);
			return this;
		}
	});
});