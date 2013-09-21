function signage(userConfig) {
    var config = {
        api_path: "http://flinders-signage.herokuapp.com/api/v1/",
        slide_time: 2000,
        secondary_news_articles: 3
    };

    for (var key in userConfig) {
        if (userConfig.hasOwnProperty(key)) {
            config[key] = userConfig[key];
        }
    }

    var app = angular.module('signage', ['ngSanitize', 'google-maps']);

    app.factory('buildingFactory', function ($http) {
        return {
            getBuildingAsync: function (building_code, callback) {
                $http.get(config.api_path + 'buildings/' + building_code + '.json').success(callback);
            }
        };
    });

    app.factory('roomsFactory', function ($http) {
        return {
            getRoomsAsync: function (building_code, callback) {
                $http.get(config.api_path + 'buildings/' + building_code + '/rooms.json').success(callback);
            }
        };
    });

    app.factory('newsFactory', function ($http) {
        return {
            getNewsAsync: function (callback) {
                $http.get(config.api_path + 'news.json').success(callback);
            }
        };
    });

    app.factory('datesFactory', function ($http) {
        return {
            getTermDatesAsync: function (callback) {
                $http.get(config.api_path + 'dates.json').success(callback);
            }
        };
    });

    app.controller('SlidesController', function ($scope, $timeout, buildingFactory, datesFactory) {
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
    });

    app.controller('NewsController', function ($scope, newsFactory) {
        newsFactory.getNewsAsync(function (data) {
            $scope.news = {
                headline: data[0],
                pastHeadlines: data.slice(1, config.secondary_news_articles + 1),
                posts: data
            };

            console.log($scope.news);
        });
    });

    app.controller('TimetableController', function ($scope, roomsFactory, $timeout) {
        var poll = function () {
            roomsFactory.getRoomsAsync("IST", function (rooms) {
                $scope.booked_rooms = [];
                $scope.empty_rooms = [];

                angular.forEach(rooms, function (room) {
                    if (room.is_empty) {
                        $scope.empty_rooms.push(room);
                    }
                    else {
                        $scope.booked_rooms.push(room);
                    }
                });

            });

            $timeout(poll, 60000);
        };

        poll();
    });


    app.controller('CampusController', function ($scope) {
        angular.extend($scope, {
            center: {
                latitude: -35.022722,
                longitude: 138.571501
            },
            markers: [],
            zoom: 16,
            disableDefaultUI: true,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
    });

    app.filter('time_until', function () {
        return function (input) {
            if (input === null) {
                return "";
            }
            return moment(input).fromNow();
        }
    });
}

signage({});