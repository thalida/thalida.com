'use strict';

module.exports = {
    templateUrl: 'components/cover/cover.html',
    bindings: {
        fancyTime: '<',
        fancyWeather: '<',
    },
    controller: [
        '$scope',
        '$element',
        '$timeout',
        'ABOUT',
        'FUN_FACTS',
        'utils',
        'visits',
        function($scope, $element, $timeout, ABOUT, FUN_FACTS, utils, visits){
            var ctrl = this;

            // Selector Helpers
            var $cover = $element.find('.t_cover');
            var $scene = $cover.find('.t_cover-scene')
            var $sceneSunMoon = $scene.find('.t_cover-scene-sun_moon');

            // Some of the updates run on a delay
            ctrl.isFirstUpdate = true;
            ctrl.updateWhen = 2;
            ctrl.numUpdates = 0;

            ctrl.greeting = {};
            ctrl.funFact = {};

            // Sanitize Helper: Used in the templates
            ctrl.sanitize = function( str ){
                return utils.sanitize( str );
            };

            // getDiffRandValue: Get a different random value from an array
            ctrl.getDiffRandValue = function( origArr, origCurrVal ){
                var arr = angular.copy( origArr );
                var currVal = angular.copy( origCurrVal );
                var newVal = {};

                if( currVal && currVal.index !== 'undefined' ){
                    arr.splice( currVal.index, 1 );
                }

                newVal.text = utils.getRandom( arr );
                newVal.index = arr.indexOf( newVal.text );

                return newVal;
            };

            ctrl.setSalutation = function(){
                var sayings  = visits.getGroup().sayings || [ctrl.fancyTime.data.salutation];

                ctrl.salutation = utils.getRandom(sayings);
                return ctrl.salutation;
            };

            ctrl.setGreeting = function(){
                ctrl.greeting = ctrl.getDiffRandValue(ctrl.fancyTime.data.sayings, ctrl.greeting);
                return ctrl.greeting;
            };

            ctrl.setFunFact = function(){
                ctrl.funFact = ctrl.getDiffRandValue(FUN_FACTS, ctrl.funFact);
                return ctrl.funFact;
            };

            ctrl.setRotation = function () {
                var secIncrements = 360 / (24 * 60 * 60);

                var now = ctrl.fancyTime.time.now;
                var midnight = now.clone().startOf('day');

                var totalSecElapsed = now.clone().diff(midnight.clone(), 'seconds');

                var deg = secIncrements * totalSecElapsed;

                var styles = {
                    '-ms-transform': 'rotate(' + deg + 'deg)',
                    '-webkit-transform': 'rotate(' + deg + 'deg)',
                    'transform': 'rotate(' + deg + 'deg)',
                };

                $sceneSunMoon.css(styles);
            };

            ctrl.setBackground = function(){
                var degrees = '135deg';
                var startColor = ctrl.fancyTime.color.secondaryColors().left.toHexString();
                var endColor = ctrl.fancyTime.hexColor;
                var gradient = '('+ degrees +','+ startColor +','+ endColor +')';

                $cover.css({
                    'background-color': endColor,
                    'background-image': '-webkit-linear-gradient' + gradient,
                    'background-image': '-moz-linear-gradient' + gradient,
                    'background-image': '-o-linear-gradient' + gradient,
                    'background-image': 'linear-gradient' + gradient
                });
            };

            ctrl.setFontColor = function(){
                // ctrl.fontColor = ctrl.fancyTime.color.contrastColor();
                ctrl.fontColor = 'white';
            };

            ctrl.updateCover = function(){
                // Update the greeting and fun fact on first load and after that
                // on a slight delay compared to the other updates
                if( ctrl.isFirstUpdate || ctrl.updateWhen === ctrl.numUpdates ){
                    ctrl.setGreeting();
                    ctrl.setFunFact();

                    ctrl.numUpdates = 0;
                }

                ctrl.setRotation();
                ctrl.setBackground();
                ctrl.setFontColor();

                ctrl.isFirstUpdate = false;
                ctrl.numUpdates += 1;
            };

            ctrl.$onInit = function(){
                ctrl.setSalutation();
                ctrl.updateCover();
                ctrl.currentJob = ABOUT.work[0];
            };

            ctrl.$onChanges = ctrl.updateCover;
        }
    ]
};
