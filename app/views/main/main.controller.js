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

        main.year = moment().format('Y');
        main.about = ABOUT;
        main.projectsList = PROJECTS;
        main.currFancyTime = null;

        fancyTime.run(function( newFancyTime ){
            main.currFancyTime = angular.copy(newFancyTime);
        });

        main.render = true;
	}

    main.sanitize = utils.sanitize;

    main.scrollTop = function(){
        $('body').scrollTop(0);
        $('.main-view-content').scrollTop(0);
    }


	main.init();
}

MainController.$inject = $requires;
module.exports = MainController;
