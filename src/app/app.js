angular.module( 'flindersSignage', [
  'templates-app',
  'templates-common',
  'flindersSignage.signage',
  'ui.state',
  'ui.route'
])

.config( function myAppConfig ($stateProvider, $urlRouterProvider, $locationProvider) {
        $locationProvider.hashPrefix('!');
    })

.controller( 'AppCtrl', function AppCtrl ( $scope, $location ) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if ( angular.isDefined( toState.data.pageTitle ) ) {
      $scope.pageTitle = toState.data.pageTitle + ' | Flinders Signage' ;
    }
  });
});

