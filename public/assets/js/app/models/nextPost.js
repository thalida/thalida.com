define(function (require) {
    "use strict";
    var $        	=	require('jquery'),
        Backbone	=	require('backbone'),

        Post = Backbone.Model.extend({ 
            urlRoot: '/res/posts'
        }),

        PostCollection = Backbone.Collection.extend({
            model: Post,
            url: '/res/posts'
        }),

        originalSync = Backbone.sync;

    Backbone.sync = function (method, model, options) {
        if (method === "read") {
            options.dataType = "jsonp";
            return originalSync.apply(Backbone, arguments);
        }
    };

    return {
        Post: Post,
        PostCollection: PostCollection
    };
});