'use strict';

var $requires = ['$interval', 'TIME_GROUPS'];
var service = function( $interval, TIME_GROUPS ){
	//======================================================================
	//
	//	Fancy Time
	// 		Using the current time -- get the range of colors that this
	// 		time falls between, as well as the greetings that go along
	// 		with this time.
	//
	//----------------------------------------------------------------------
	var FancyTime = function(){
		// Get the varous groups that the day is broken into
		this.groups = TIME_GROUPS;
		this.totalGroups = this.groups.length;

		this.interval = null;
		this.waitTime = 1 * 60 * 1000;
		this.updateCallback = [];
	};

	//======================================================================
	//
	//	@getRange
	//		Get the color transtion range based on the current time
	//
	//----------------------------------------------------------------------
	FancyTime.prototype.getRange = function( time ){
		var now = time || moment();

		// Current hour + minutes in military time
		var hour = parseInt(now.format('H'), 10);
		var minute = parseInt(now.format('m'), 10);

		// Before noon: start search at midnight - else start at noon
		var startIdx = (hour < 12) ? 0 : 3;
		// Before noon: end loop at noon - else end loop at midnight
		var endIdx = (hour < 12 ) ? 4 : this.totalGroups;

		// Home for the range times found
		var timeRange = [];

		// Loop through the (shortend) array of groups
		for( var i = startIdx; i < endIdx; i += 1){
			var currGroup = this.groups[i];
			var nextGroup = (i + 1 < this.totalGroups) ? this.groups[i + 1] : this.groups[0];

			// Check if we have found the correct color range:
			// 		current hour >= the currGroups's start time
			// 	AND current hour is < nextGroup's start time
			// 	OR  nextGroup's start time is midnight
			//		meaning that the currGroup's index is the last in the arr
			if( hour >= currGroup.beginAt && (hour < nextGroup.beginAt || nextGroup.beginAt === 0) ){
				timeRange[0] = currGroup;
				timeRange[1] = nextGroup;
				break;
			}
		}

		return {
			// the time used to find the groups
			time: {
				now: now,
				hour: hour,
				minute: minute
			},
			// The time range found
			groups: timeRange
		};
	};


	//======================================================================
	//
	//	@get
	//		Based on the start + end colors -- get the specific color
	// 		in that range that represents the time.
	//
	//		jQuery Color sets the distance for a transition from 0 - 1.
	//		We need to split that distance into various intervals that represent
	//		the current hour + mintue.
	//-----------------------------------------------------------------------
	FancyTime.prototype.get = function(){
		// Get the start + end colors - as well as the time used
		var range = this.getRange();

		// Convert the hex colors to the jQuery colors library format
		var jqColors = {
			start: jQuery.Color(range.groups[0].color),
			end: jQuery.Color(range.groups[1].color)
		};

		var interval = {};
		var distance = {};
		var transitionColor;
		var closestPeriod;

		var endRangeTime = (range.groups[1].beginAt === 0) ? 24 : range.groups[1].beginAt;
		var numHrsInRange = Math.abs(endRangeTime - range.groups[0].beginAt);
		var timeSinceRangeBegin = Math.abs(range.time.hour - range.groups[0].beginAt);

		// Get the total # of hours b/w the two groups
		// Split the transition distance (1) to pieces for each hour mark
		interval.hour = +(1 / numHrsInRange).toFixed(3);

		// Split the hour interval into 60 pieces (1 for each minute)
		interval.minute = +(interval.hour / 60).toFixed(3);

		// Calculate the current hour + minute values using the intervals
		distance.hour = +(interval.hour * timeSinceRangeBegin).toFixed(3);
		distance.minute = +(interval.minute * range.time.minute).toFixed(3);
		distance.total = +(distance.hour + distance.minute).toFixed(3);

		// Get the color that falls x distance b/w the start + end colors
		transitionColor = jqColors.start.transition(jqColors.end, distance.total);

		// Get the time in the range that the current time is closest to
		// closestPeriod = (timeSinceRangeBegin < numHrsInRange / 2) ? range.groups[0] : range.groups[1];
		// closestPeriod = (timeSinceRangeBegin < numHrsInRange - 1) ? range.groups[0] : range.groups[1];
		closestPeriod = (timeSinceRangeBegin < numHrsInRange) ? range.groups[0] : range.groups[1];

		return {
			time: range.time,
			range: range.groups,
			data: closestPeriod,
			color: transitionColor,
			hexColor: transitionColor.toHexString()
		};
	};


	//======================================================================
	//
	//	@update
	//		When called updates the fancyTime serivce with new data and calls
	// 		the on update callback functions
	//-----------------------------------------------------------------------
	FancyTime.prototype.update = function() {
		var currFancyTime = this.get();

		this.updateCallback.forEach(function( cb ){
			if( typeof cb === 'function' ){
				cb( currFancyTime );
			}
		});
	};


	//======================================================================
	//
	//	@start
	//		Start an interval to update the FancyTime every X ms
	//-----------------------------------------------------------------------
	FancyTime.prototype.start = function( callback, speed ) {
		if( typeof this.interval !== 'undefined' && this.interval !== null ){
			$interval.cancel( this.interval );
			this.interval = null;
		}

		this.updateCallback.push( callback );
		this.update();

		this.interval = $interval(this.update.bind(this), speed || this.waitTime);
	};


	//======================================================================
	//
	//	@stop
	//		When called clears the array of callbacks and stops the interval
	//-----------------------------------------------------------------------
	FancyTime.prototype.stop = function() {
		this.updateCallback = [];

		if( typeof this.interval !== 'undefined' && this.interval !== null ){
			$interval.cancel( this.interval );
			this.interval = null;
		}
	};

	return new FancyTime();
}

service.$inject = $requires;
module.exports = service;
