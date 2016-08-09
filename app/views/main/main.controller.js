'use strict';

var $requires = [
	'$scope',
	'$sce',
    'utils',
    'fancyTime'
];

var MainController = function($scope, $sce, utils, fancyTime) {
	var main = this;

    main.render = false;

	main.init = function(){
        main.currFancyTime = null;

        fancyTime.run(function( newFancyTime ){
            main.currFancyTime = angular.copy(newFancyTime);
        });

        main.render = true;
	}


	main.init();
}

MainController.$inject = $requires;
module.exports = MainController;
