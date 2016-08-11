'use strict';

module.exports = {
    templateUrl: 'components/interactive/interactive.html',
    controller: [
        '$scope',
        '$element',
        '$timeout',
        'utils',
        function($scope, $element, $timeout, utils){
            var ctrl = this;
            var mouseleaveTimeout = null;
            var $interactive = $element.find('.t_interactive');
            var $interactiveBack = $interactive.find('.t_interactive-background');
            var $interactiveFore = $interactive.find('.t_interactive-foreground');
            var $interactiveShapes = $interactive.find('.t_interactive-shapes');

            ctrl.$onInit = function(){
                ctrl.layers = [
                    {$el: $interactiveBack, shiftBy: 12},
                    {$el: $interactiveFore, shiftBy: 8},
                    {$el: $interactiveShapes, shiftBy: 4}
                ];
            }

            ctrl.onMouseover = function( e ){
                var offset = $interactive.offset();

                var dimensions = {
                    height: $interactive.outerHeight(true),
                    width: $interactive.outerWidth(true)
                }

                var coords = {
                    x: e.pageX - offset.left,
                    y: e.pageY - offset.top
                }

                var mid = {
                    x: dimensions.width / 2,
                    y: dimensions.height / 2
                }

                ctrl.layers.forEach(function( layer ){
                    ctrl.setBackgroundPosition(
                        layer.$el,
                        { x: coords.x - mid.x, y: coords.y - mid.y},
                        layer.shiftBy
                    );
                });
            }

            ctrl.onMouseenter = function(){
                if( mouseleaveTimeout || mouseleaveTimeout !== null){
                    $timeout.cancel( mouseleaveTimeout );
                    mouseleaveTimeout = null;
                }

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
                        ctrl.setBackgroundPosition(layer.$el, { x: 0, y: 0}, 1);
                    });
                }, 500);
            }

            ctrl.setBackgroundPosition = function( $el, coords, shiftBy ){
                var x = (coords.x / shiftBy) + 'px';
                var y = (coords.y / shiftBy) + 'px';

                $el.css({
                    'background-position': x + ' ' + y
                });
            }
        }
    ]
};
