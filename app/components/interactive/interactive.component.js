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
                    {$el: $interactiveBack, shiftBy: {x: 8, y: 20}},
                    {$el: $interactiveFore, shiftBy: {x: 6, y: 20}},
                    {$el: $interactiveShapes, shiftBy: {x: 4, y: 20}}
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
                        var left = layer.left || 0;
                        var bgPos = {
                            x: (coords.x - (dimensions.width * 1.5)) / layer.shiftBy.x,
                            y: (coords.y - (dimensions.height * 1.5)) / layer.shiftBy.y
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
