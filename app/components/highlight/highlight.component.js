'use strict';

module.exports = {
    templateUrl: 'components/highlight/highlight.html',
    bindings: {
        text: '@',
        tooltip: '@?'
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

            ctrl.$onInit = function(){};
            ctrl.$onChanges = function(){};
        }
    ]
};
