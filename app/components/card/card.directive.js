'use strict';

//==============================================================================
//
//	Card Directive
// 		Renders the card element
// 		Usage:
// 			- In order to display content the body of each card must have two faces.
//			- OPTIONALLY you can include a fancy-time attribute on the element
// 			which will be updated each time the time used by the card changes.
// 		Example:
// 			<card fancy-fime="fancyTime"></card>
//------------------------------------------------------------------------------

app.directive('card', [
	'$rootScope',
	'$timeout',
	'$sce',
	'Utils',
	'FancyTimeService',
	function($rootScope, $timeout, $sce, Utils, FancyTime){
		return {
			restrict: 'E',
			replace: true,
			templateUrl: 'components/card/templates/card.html',
			transclude: true,
			scope: {
				currFancyTime: '=?fancyTime'
			},
			controller: ['$scope','$element','$attrs', function ($scope, $element, $attrs){
				//	@getFancyTime
				// 		Gets + returns the current FancyTime
				//--------------------------------------------------------------
				this.getFancyTime = function(){
					$scope.currFancyTime = FancyTime.get();
					return $scope.currFancyTime;
				};
			}],
			link: function($scope, $el) {
				$scope.utils = Utils;

				$scope.isFrontShown = true;
				$scope.runAnimation = true;
				$scope.hasClicked = false;

				//	@flipCard
				// 		Show the opposite face of the card as well as toggle
				// 		the animation based on the face now being shown.
				//--------------------------------------------------------------
				$scope.flipCard = function(){
					$scope.hasClicked = true;
					$scope.isFrontShown = !$scope.isFrontShown;

					if( $scope.isFrontShown === true ){
						$scope.setAnimation( true );
					} else {
						$scope.setAnimation( false );
					}
				};

				//	@setAnimation
				//--------------------------------------------------------------
				$scope.setAnimation = function( isRunning ){
					$scope.runAnimation = isRunning;
				};

				//	If the user is a first time visitor and after 5 seconds they
				// 	have not clicked the card -- flip it for 'em
				//--------------------------------------------------------------
				$timeout(function(){
					if( $rootScope.totalVisits <= 1 && $scope.hasClicked === false ){
						$scope.flipCard();
					}
				}, 5 * 1000);
			}
		};
	}
]);
