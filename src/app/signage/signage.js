var config = {
    api_path: "http://api.unibuddy.com.au/api/v2/uni/flinders/",
    slide_time: 10000,
    secondary_news_articles: 2,
    building_code: "IST"
};

angular.module('flindersSignage.signage', [
        'ui.state'
    ])

    .config(function ($locationProvider, $stateProvider) {
        $stateProvider.state('signage', {
            url: '/slides',
            views: {
                "main": {
                    controller: 'SignageController',
                    templateUrl: 'signage/signage.tpl.html'
                }
            },

            data: { pageTitle: 'Signage Stuff' }
        });

        $stateProvider.state('signage.news', {
            url: '/slides/news',
            views: {
                "main": {
                    controller: 'SignageController',
                    templateUrl: 'signage/signage.tpl.html'
                },
                "slide": {
                    controller: 'NewsController',
                    templateUrl: 'signage/news.tpl.html'
                }
            },

            data: { pageTitle: 'News' }
        });
    })


    .factory('buildingFactory', function ($http) {
        return {
            getBuildingAsync: function (building_code, callback) {
                $http.get(config.api_path + 'buildings/' + building_code).success(function(data, status, headers, config) {
                    callback(data.data, status, headers, config);
                });
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
        var datesFactory = {
            getTermWeeksAsync: function (callback) {
                $http.get(config.api_path + 'dates').success(callback);
            },
            getCurrentWeek: function (callback) {
                var findCurrentWeek = function (termWeeks) {
                    var currentWeek;

                    var currentTime = new Date().getTime();
                    angular.forEach(termWeeks, function (termWeek) {
                        var spanStart = Date.parse(termWeek.starts_at);
                        var spanEnd = Date.parse(termWeek.ends_at);

                        if (spanStart <= currentTime && currentTime < spanEnd) {
                            currentWeek = termWeek;
                            return false;
                        }
                    });

                    if (currentWeek) {
                        return currentWeek.name;
                    }
                    else {
                        return null;
                    }
                };


                datesFactory.getTermWeeksAsync(function (dates) {
                    callback(findCurrentWeek(dates) || "Non-semester");
                });
            }
        };

        return datesFactory;
    })

    .controller('SignageController', function ($scope, $timeout, buildingFactory) {
        var pollBuilding = function () {
            buildingFactory.getBuildingAsync('IST', function (building) {
                $scope.building = building;
            });

            $timeout(pollBuilding, 3600000);
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

        transition();
    })

    .controller('BannerController', function ($scope, $timeout, datesFactory) {
        var updateWeek = function() {
            datesFactory.getCurrentWeek(function (week) {
                $scope.week = week;
            });
        };

        var poll = function () {
            updateWeek();
            $timeout(poll, 1800000);
        };

        poll();
    })

    .controller('NewsController', function ($scope, newsFactory) {
        console.log("News controller");
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

