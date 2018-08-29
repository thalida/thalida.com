define(function (require) {
	"use strict";
	var	tpl 		=	require('text!tpl/postListItem.html'),
		utils		=	require('utils'),
		template	=	_.template(tpl);

	return Backbone.View.extend({

		tagName: "div",

		initialize: function () {
			this.model.on("change", this.render, this);
		},

		render: function () {
			var attrs = this.model.attributes;
			attrs.fontColor = utils.contrastColor({hex: attrs.color, midpoint: 200, light: '#fefbf8', dark: '#807e7d'})
			attrs.icon = attrs.images.split(';')[0];
			this.$el.html(template(attrs));
			return this;
		}

	});

});