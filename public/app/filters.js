var appFilters = angular.module('appFilters', []);

appFilters.filter('image', function(){
    return function(images, type){
        if( type === 'icon' ){
            return '/public/partials/content/images/icons/' + images.split(';')[0];
        }
    };
});

appFilters.filter('color', function(){
    return function(origColor, type){
        if( type === 'contrast' ){
            var params = {
	   			midpoint: 200, //131.5
	   			dark: '#807e7d', 
	   			light: '#fefbf8'
	   		};
            var bigint = parseInt(origColor.replace('#',''), 16),
                r = (bigint >> 16) & 255,
                g = (bigint >> 8) & 255,
                b = bigint & 255;
	   		return (((r*299)+(g*587)+(b*144))/1000) >= params.midpoint ? params.dark : params.light;
        }
    };
});

appFilters.filter('formatText', ['Utils', function(Utils){
   return function(text, data){
       return Utils.formatText( text, data );
   };
}]);