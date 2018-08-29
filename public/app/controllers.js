var appControllers = angular.module('appControllers',[]);

appControllers.controller('BackgroundCtrl', ['$scope', '$filter', '$interval', 'SceneService', function($scope, $filter, $interval, SceneService){
    var updateBackground = function(){
        var time = SceneService.parseTime(),
            color = { light: 58, dark: 10 },
            finalColor;
        
        if( typeof time !== 'undefined'){
            if( time.hour <= 12 )
                finalColor = (time.hour * 4) + color.dark;
            else
                finalColor = color.light - ((time.hour - 12) * 4);

            $scope.color = 'hsla(221, 57%,'+ finalColor +'%, 0.5)';
            //$('#content').css('backgroundColor', 'hsla(221, 57%,'+ finalColor +'%, 0.5)');
        }
    };

    $scope.$watch( 
        function () { return SceneService.data; }, 
        function ( data ) {
            $scope.sceneData = data;
            updateBackground();
        },
        true
    );

    $interval(updateBackground,900000);
}]);

appControllers.controller('HeaderCtrl', ['$scope', '$filter', function($scope, $filter){
    
}]);

appControllers.controller('FooterCtrl', ['$scope', '$filter', function($scope, $filter){
    
}]);


appControllers.controller('SceneCtrl', ['$scope', '$interval', 'SceneService', 'Utils',
    function($scope, $interval, SceneService, Utils){
        var updateGreeting = function(){
            var time = SceneService.parseTime();
            $scope.time = time;
        };
        
        var getWeatherPosition = function(){
            var earth = {
                pos: $('#earth').position(),
                size: {
                    width: $('#earth img').width(),
                    height: $('#earth img').height()
                },
                natural: {
                    width: $('#earth img').naturalWidth(),
                    height: $('#earth img').naturalHeight()
                }
            };
            
            earth.scale = (earth.size.height / earth.natural.height);
            
            if( earth.scale < 1 ) earth.scale *= 1.5;
            if( earth.scale >= 1 ) earth.scale = 1;
            
            var weatherContainer = {
                offset: {
                    top: earth.pos.top + (60 * earth.scale),
                    left: earth.pos.left + (earth.size.width / 2) - (earth.size.width / 4)
                }
            };
            
            var weatherIcon = {};
            weatherIcon.naturalBg = {
                width: 701,
                height: 98,
            };
            weatherIcon.scaledBg = {
                width: weatherIcon.naturalBg.width * earth.scale,
                height: weatherIcon.naturalBg.height * earth.scale
            };
            
            $('#weatherIconContainer').css(weatherContainer.offset);
            $('.weather-icon').each(function(index){
                var $this = $(this);
                
                $this.css({
                    'backgroundSize': '',
                    'backgroundPosition': '',
                    'width': '',
                    'height': '',
                    'marginTop': '',
                    'marginLeft': ''
                });
                
                var icon = {
                    pos: parseInt($this.css('backgroundPosition').split(' ')[0], 10) * earth.scale,
                    width: Math.ceil( $this.width() * earth.scale ),
                    height: Math.ceil( $this.height() * earth.scale ),
                    top: Math.ceil(parseInt($this.css('marginTop'), 10) * earth.scale),
                    left: Math.ceil(parseInt($this.css('marginLeft'), 10) * earth.scale)
                };
                $this.css({
                    'backgroundSize': weatherIcon.scaledBg.width + 'px ' +  weatherIcon.scaledBg.height + 'px',
                    'backgroundPosition': icon.pos + "px 0",
                    'width': icon.width,
                    'height': icon.height,
                    'marginTop': icon.top,
                    'marginLeft': icon.left
                });
            });
            
        };
        
        var loadScene = function( data ){
            $scope.sceneData = data || $scope.sceneData;
            $scope.weather = SceneService.parseWeather();
            getWeatherPosition();
            updateGreeting();
        };
        
        SceneService.getLocation().then(function(){
            return SceneService.run();
        }).then(function(){
            SceneService.data.interval.hourlyData = $interval(SceneService.getHourlyData, Utils.toSeconds('01:00:00')*1000);
            $interval(updateGreeting,5000);
            loadScene();
            $scope.$watch( function(){return SceneService.data;}, loadScene, true );
        });
        
        $( window ).on('resize', function(){
            loadScene();
        });
    }
]);

appControllers.controller('HomeCtrl', ['$scope', '$filter', 'Project', function($scope, $filter, Project){
    var renderPage = function(){
        $scope.fontColor = function( color ){
            return $filter('color')(color, 'contrast');
        };
        $scope.loadProject = function( project ){
            $('#wrapper').slideUp(300, function(){
                window.location = '/#/project/' + project.id;
            });
        };
    };
    $scope.projects = Project.query( renderPage );
}]);

appControllers.controller('ProjectCtrl', ['$scope', '$routeParams', '$filter', 'Project', function($scope, $routeParams, $filter, Project){
    var renderPage = function( project ){
        $('#wrapper').slideDown(500, function(){
            $scope.fontColor = function( color ){
                return $filter('color')(color, 'contrast');
            };
            console.log( $scope.project );
        });
    };
    $scope.project = Project.get({projectId: $routeParams.projectId}, renderPage);
}]);

