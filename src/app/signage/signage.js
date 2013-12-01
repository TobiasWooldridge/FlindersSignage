var config = {
    api_path: "http://flindersapi.tobias.pw/api/v1/",
    slide_time: 10000,
    secondary_news_articles: 2,
    building_code: "IST"
};

angular.module( 'flindersSignage.signage', [
  'ui.state'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'signage', {
    url: '/',
    views: {
      "main": {
        controller: 'SignageController',
        templateUrl: 'signage/signage.tpl.html'
      }
    },

    data: { pageTitle: 'Signage Stuff' }
  });
})

.controller('SignageController', function ($scope, $timeout, buildingFactory, datesFactory) {
    var pollBuilding = function () {
        buildingFactory.getBuildingAsync('IST', function (building) {
            $scope.building = building;
        });

        $timeout(pollBuilding, 3600000);
    };

    var pollTermDates = function () {
        var secondsUntilNextWeek = 7 * 24 * 60 * 60;

        datesFactory.getTermDatesAsync(function (dates) {
            var date = null;

            var currentTime = new Date().getTime();
            angular.forEach(dates, function (e) {
                var spanStart = Date.parse(e.starts_at);
                var spanEnd = Date.parse(e.ends_at);

                if (spanStart <= currentTime && currentTime < spanEnd) {
                    date = e.week + ", " + e.semester;
                    secondsUntilNextWeek = spanEnd - currentTime;
                    return false;
                }
            });

            if (date === null) {
                date = "Non-semester";
            }

            $scope.week = date;

        });

        $timeout(pollTermDates, secondsUntilNextWeek);
    };


    $scope.news_slide_style = "";
    $scope.timetable_slide_style = "";

    var slide_ids = [ "news", "timetable", "weather" ];
    var current_slide = 0;

    var transition = function () {
        var previous_slide = current_slide;
        current_slide = (current_slide + 1) % slide_ids.length;

        var i;
        for (i = 0; i < slide_ids.length; i++) {
            var styles = "";
            styles += (i == previous_slide ? ' outgoing' : '');
            styles += (i == current_slide ? ' active' : ' inactive');

            $scope[slide_ids[i] + "_slide_styles"] = styles;
        }

        $timeout(transition, config.slide_time);
    };

    pollBuilding();
    pollTermDates();

    transition();
})

.factory('buildingFactory', function ($http) {
    return {
        getBuildingAsync: function (building_code, callback) {
            $http.get(config.api_path + 'buildings/' + building_code).success(callback);
        }
    };
})

.factory('roomsFactory', function ($http) {
    var getRoomsAsync = function (building_code, success_callback, error_callback) {
        $http.get(config.api_path + 'buildings/' + building_code + '/rooms').success(success_callback).error(error_callback);
    };

    return {
        "getRoomsAsync": getRoomsAsync
    };
})

.factory('newsFactory', function ($http) {
    return {
        getNewsAsync: function (callback) {
            $http.get(config.api_path + 'news').success(callback);
        }
    };
})

.factory('datesFactory', function ($http) {
    return {
        getTermDatesAsync: function (callback) {
            $http.get(config.api_path + 'dates').success(callback);
        }
    };
})

.controller('NewsController', function ($scope, newsFactory) {
    newsFactory.getNewsAsync(function (data) {
        $scope.news = {
            headline: data[0],
            pastHeadlines: data.slice(1, config.secondary_news_articles + 1),
            posts: data
        };

    });
})

.controller('TimetableController', function ($scope, roomsFactory, $timeout) {
    var poll = function () {
        roomsFactory.getRoomsAsync(config.building_code, function (rooms) {
            var ONE_HOUR = 60 * 60 * 1000;

            var now = new Date().getTime();
            var nextSampling = now + ONE_HOUR;

            $scope.booked_rooms = [];
            $scope.empty_rooms = [];

            angular.forEach(rooms, function (room) {
                // Bring the nextSampling closer to whenever a room in this building next changes state
                if (room.next_booking) {
                    nextSampling = Math.min(nextSampling, new Date(room.next_booking.starts_at).getTime());
                }

                if (room.current_booking) {
                    nextSampling = Math.min(nextSampling, new Date(room.current_booking.ends_at).getTime());
                }

                // Add room to empty/booked list
                if (room.is_empty) {
                    $scope.empty_rooms.push(room);
                }
                else {
                    $scope.booked_rooms.push(room);
                }
            });

            var pollDelay = Math.max(nextSampling - now, 30000);

            $timeout(poll, pollDelay);
            console.log("Polling again in " + pollDelay + " seconds");
        }, function () {
            $timeout(poll, 60000);
        });
    };

    poll();
})

.controller('CampusController', function ($scope) {
})

.filter('time_until', function () {
    return function (input) {
        if (input === null) {
            return "";
        }

        return moment(input).fromNow();
    };
})
;

