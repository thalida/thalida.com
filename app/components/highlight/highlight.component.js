'use strict';

module.exports = {
    templateUrl: 'components/highlight/highlight.html',
    bindings: {
        text: '@',
        tooltip: '@?',
        tooltipSide: '@?',
    },
    controller: [
        '$scope',
        '$element',
        'utils',
        function($scope, $element, utils){
            var ctrl = this;

            ctrl.sanitize = function( str ){
                return utils.sanitize( str );
            };

            ctrl.setup = function () {
                if (typeof ctrl.tooltipSide === 'undefined'
                    || ctrl.tooltipSide === null
                    || ctrl.tooltipSide.length === 0
                ) {
                    ctrl.tooltipSide = 'bottom';
                }
            };

            ctrl.$onInit = ctrl.setup;
            ctrl.$onChanges = ctrl.setup;
        }
    ]
};
