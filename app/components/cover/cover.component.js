'use strict';

module.exports = {
    templateUrl: 'components/cover/cover.html',
    bindings: {
        time: '<'
    },
    controller: [
        '$scope',
        '$element',
        'FUN_FACTS',
        'utils',
        'visits',
        function($scope, $element, FUN_FACTS, utils, visits){
            var ctrl = this;
            var $cover = $element.find('.t_cover');

            ctrl.isFirstUpdate = true;
            ctrl.updateWhen = 40;
            ctrl.numUpdates = 0;

            ctrl.greeting = {};
            ctrl.funFact = {};

            ctrl.sanitize = function( str ){
                return utils.sanitize( str );
            };

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
                var sayings  = visits.getGroup().sayings || [ctrl.time.data.salutation];

                ctrl.salutation = utils.getRandom(sayings);
                return ctrl.salutation;
            };

            ctrl.setGreeting = function(){
                ctrl.greeting = ctrl.getDiffRandValue(ctrl.time.data.sayings, ctrl.greeting);
                return ctrl.greeting;
            };

            ctrl.setFunFact = function(){
                ctrl.funFact = ctrl.getDiffRandValue(FUN_FACTS, ctrl.funFact);
                return ctrl.funFact;
            };

            ctrl.setBackground = function(){
                var degrees = '135deg';
                var startColor = ctrl.time.color.secondaryColors().left.toHexString();
                var endColor = ctrl.time.hexColor;
                var gradient = '('+ degrees +','+ startColor +','+ endColor +')';

                // $cover.css( 'background', ctrl.time.hexColor );
                $cover.css({
                    'background-color': endColor,
                    'background-image': '-webkit-linear-gradient' + gradient,
                    'background-image': '-moz-linear-gradient' + gradient,
                    'background-image': '-o-linear-gradient' + gradient,
                    'background-image': 'linear-gradient' + gradient
                });
            };

            ctrl.setFontColor = function(){
                ctrl.fontColor = ctrl.time.color.contrastColor();
            };

            ctrl.updateCover = function(){
                if( ctrl.isFirstUpdate || ctrl.updateWhen === ctrl.numUpdates ){
                    ctrl.setGreeting();
                    ctrl.setFunFact();

                    ctrl.numUpdates = 0;
                }

                ctrl.setBackground();
                ctrl.setFontColor();

                ctrl.isFirstUpdate = false;
                ctrl.numUpdates += 1;
            };

            ctrl.$onInit = function(){
                ctrl.setSalutation();
                ctrl.updateCover();
            };

            ctrl.$onChanges = ctrl.updateCover;
        }
    ]
};
