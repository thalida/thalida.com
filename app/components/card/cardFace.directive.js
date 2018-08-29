'use strict';

//==============================================================================
//
//	Card Face Directive
// 		Renders the face of a card element
// 		Usage:
// 			- Requires the card directive as it's parent
// 			- Requires a face attribute either "front" or "back"
// 		Example:
// 			<card:face face="front"></card:face>
//------------------------------------------------------------------------------

app.directive('cardFace', [
	'$interval',
	'$sce',
	'Utils',
	function($interval, $sce, Utils){
		return {
			require: '^card',
			restrict: 'E',
			replace: true,
			templateUrl: 'components/card/templates/cardFace.html',
			transclude: true,
			scope: {
				cardFace: '@face'
			},
			link: function($scope, $el, $attrs, cardCtrl) {
				$scope.utils = Utils;

				//	init
				// 		Setups the animation interval for the card and default
				// 		attributes needed to display the card.
				//--------------------------------------------------------------
				var init = function(){
					// Wait 2 minutes between each card update
					var waitTime = 2 * 60 * 1000;

					$scope.cardClass = 'card-' + $scope.cardFace;

					updateCard();
					$interval(updateCard, waitTime);
				};

				//	updateCard
				// 		Update the card colors and sayings based on the current
				// 		"fancy" time as well as the # of visits
				//--------------------------------------------------------------
				var updateCard = function(){
					// Get the info for the current time (color, sayings, name, etc)
					var currFancyTime = cardCtrl.getFancyTime();

					// Get the contrast color: either white/black
					$scope.cardColor = currFancyTime.color.contrastColor();
					$el.css( 'background', currFancyTime.hexColor );
				};

				init();
			}
		};
	}
]);
