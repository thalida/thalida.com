'use strict';

var $requires = [
	'$scope',
	'$sce',
    'utils',
    'fancyTime',
    'visits',
    'PROJECTS',
    'ABOUT'
];

var MainController = function($scope, $sce, utils, fancyTime, visits, PROJECTS, ABOUT) {
	var main = this;

    main.render = false;

	main.init = function(){
        visits.increment();

        main.about = ABOUT;
        main.projectsList = PROJECTS;
        main.currFancyTime = null;

        fancyTime.run(function( newFancyTime ){
            main.currFancyTime = angular.copy(newFancyTime);
        });

        main.render = true;
	}

    main.sanitize = utils.sanitize;


	main.init();
}

MainController.$inject = $requires;
module.exports = MainController;
