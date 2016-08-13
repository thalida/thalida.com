'use strict';

module.exports = {
    templateUrl: 'components/interactive/interactive.html',
    controller: [
        '$scope',
        '$element',
        '$timeout',
        '$interval',
        'utils',
        function($scope, $element, $timeout, $interval, utils){
            var ctrl = this;
            var mouseleaveTimeout = null;
            var $interactive = $element.find('.t_interactive');
            var $interactiveBack = $interactive.find('.t_interactive-background');
            var $interactiveFore = $interactive.find('.t_interactive-foreground');
            var $interactiveShapes = $interactive.find('.t_interactive-shapes');
            var animateInterval = null;

            ctrl.$onInit = function(){
                ctrl.layers = [
                    {$el: $interactiveBack, shiftBy: {x: 8, y: 20}},
                    {$el: $interactiveFore, shiftBy: {x: 6, y: 20}},
                    {$el: $interactiveShapes, shiftBy: {x: 4, y: 20}}
                ];

                ctrl.startAnimation();
            }

            ctrl.startAnimation = function(){
                ctrl.stopAnimation();

                var animateCoords = {x: 0, y: 0};
                var shiftAmount = { base: 1 };
                var shiftMax = 800;

                shiftAmount.x = shiftAmount.base;
                shiftAmount.y = shiftAmount.base;

                animateInterval = $interval(function(){
                    if( animateCoords.x + shiftAmount.x >= shiftMax ){
                        shiftAmount.x *= -1;
                    } else if( animateCoords.x + shiftAmount.x < 0 ){
                        shiftAmount.x = shiftAmount.base;
                    }

                    if( animateCoords.y + shiftAmount.y >= shiftMax ){
                        shiftAmount.y *= -1;
                    } else if( animateCoords.y + shiftAmount.y < 0 ){
                        shiftAmount.y = shiftAmount.base;
                    }

                    animateCoords.x += shiftAmount.x;
                    animateCoords.y += shiftAmount.y;

                    ctrl.animate( animateCoords );
                }, 10);
            }

            ctrl.stopAnimation = function(){
                if( animateInterval !== null ){
                    $interval.cancel( animateInterval );
                    animateInterval = null;
                }
            }

            ctrl.animate = function( coords ){
                var dimensions = {
                    height: $interactive.outerHeight(true),
                    width: $interactive.outerWidth(true)
                }

                var mid = {
                    x: dimensions.width / 2,
                    y: dimensions.height / 2
                }

                ctrl.layers.forEach(function( layer ){
                    var left = layer.left || 0;
                    var bgPos = {
                        x: (coords.x - (dimensions.width * 1.5)) / layer.shiftBy.x,
                        y: (coords.y - (dimensions.height * 1.5)) / layer.shiftBy.y
                    };

                    ctrl.setBackgroundPosition( layer.$el, bgPos.x + 'px ' + bgPos.y + 'px');
                });
            }

            ctrl.onMouseover = function( e ){
                var offset = $interactive.offset();

                var coords = {
                    x: e.pageX - offset.left,
                    y: e.pageY - offset.top
                }

                ctrl.stopAnimation();
                ctrl.animate( coords );
            }

            ctrl.onMouseenter = function(){
                if( mouseleaveTimeout || mouseleaveTimeout !== null){
                    $timeout.cancel( mouseleaveTimeout );
                    mouseleaveTimeout = null;
                }

                ctrl.stopAnimation();
                $interactive.removeClass('leaving');
            }

            ctrl.onMouseleave = function(){
                if( mouseleaveTimeout || mouseleaveTimeout !== null){
                    $timeout.cancel( mouseleaveTimeout );
                    mouseleaveTimeout = null;
                }

                mouseleaveTimeout = $timeout(function(){
                    $interactive.addClass('leaving');
                    ctrl.layers.forEach(function( layer ){
                        ctrl.setBackgroundPosition(layer.$el, '50%');
                    });
                    ctrl.startAnimation();
                }, 100);
            }

            ctrl.setBackgroundPosition = function( $el, pos ){

                $el.css({
                    'background-position': pos
                });
            }
        }
    ]
};
