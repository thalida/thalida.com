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
                    {$el: $interactiveBack, shiftBy: -0.4},
                    {$el: $interactiveFore, shiftBy: -0.1},
                    {$el: $interactiveShapes, shiftBy: 0.8}
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
                        var bgPos = {
                            x: (coords.x - mid.x - (mid.x / 0.8)) * layer.shiftBy,
                            y: (coords.y - mid.y - (mid.y / 2)) * layer.shiftBy
                        };

                        ctrl.setBackgroundPosition( layer.$el, bgPos.x + 'px ' + bgPos.y + 'px');
                    });
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
                        ctrl.setBackgroundPosition(layer.$el, '50%');
                    });
                }, 300);
            }

            ctrl.setBackgroundPosition = function( $el, pos ){

                $el.css({
                    'background-position': pos
                });
            }
        }
    ]
};
