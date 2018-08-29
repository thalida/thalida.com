var appControllers = angular.module('appControllers',[]);

appControllers.controller('HeaderCtrl', ['$scope', '$filter', function($scope, $filter){
    
}]);

appControllers.controller('FooterCtrl', ['$scope', '$filter', function($scope, $filter){
    
}]);


appControllers.controller('LiveDataCtrl', ['$scope', '$interval', 'LiveDataService', 'Utils',
    function($scope, $interval, LiveDataService, Utils){
        $scope.liveData = null;
        
        var displayTemp = function( temp ){
            var interval = (temp - 32) / 88;
            $scope.temp = Math.round(temp);
            $('#current-info-temp').animate({ backgroundColor: Utils.transitionColor('#c0ddda','#ffdc3a', interval) }, 0 );
        };

        var displayTime = function(){
            $scope.clock = LiveDataService.parseTime();
            $('#current-info-time')
                .animate({ backgroundColor: Utils.transitionColor($scope.clock.colors[0], $scope.clock.colors[1], $scope.clock.interval) }, 0 );
        };

        var displayWeather = function( weatherIcon ){
            $scope.weatherIcon = weatherIcon;
            $scope.weather = LiveDataService.parseWeather();
            $('#current-info-weather').animate({ backgroundColor: $scope.weather.color }, 0 );
        };

        var displayDate = function( ){
            $scope.date = LiveDataService.parseDate();
            $('#current-info-date')
                .animate({ backgroundColor: Utils.transitionColor($scope.date.colors[0],$scope.date.colors[1], $scope.date.interval) }, 0 );
        };
        
        LiveDataService.getLocation().then(function(){
            return LiveDataService.run();
        }).then(function(){   
            LiveDataService.data.interval.hourlyData = $interval(LiveDataService.getHourlyData, Utils.toSeconds('01:00:00')*1000);
            LiveDataService.data.interval.personData = $interval(LiveDataService.setPersonData, 1000);
            LiveDataService.data.interval.background = $interval(LiveDataService.setBackground, 1000);

            if( !Utils.isUndefined(localStorage.personData) ){
                LiveDataService.set('person', JSON.parse(localStorage.personData));
            }
            
            $scope.liveData = LiveDataService.data;
            $scope.personName = $scope.liveData.person.name;
            $interval(displayTime(),1000);
        
            $scope.$watch( 
                function () { return LiveDataService.data; }, 
                function ( data ) {
                    $scope.liveData = data;
                    $scope.personName = $scope.liveData.person.name;
                    displayTemp( data.temp );
                    displayWeather( data.weather );
                    displayDate();
                },
                true
            );
        });
        
        $scope.$on('$destroy', function() {
            //$interval.cancel( $);
        });
    }
]);

appControllers.controller('HomeCtrl', ['$scope', '$filter', 'Project', function($scope, $filter, Project){
    $scope.projects = Project.query(function(){
        console.log( $scope.projects );
        $scope.fontColor = function( color ){
            return $filter('color')(color, 'contrast')
        };
    });
}]);

