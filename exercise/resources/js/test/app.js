angular.module("SunExerciseTest", ['SunExerciseTest.controllers', 'SunExerciseTest.directives',
        'SunExercise.services'])

    .run(function (APIProvider, MaterialProvider, ExerciseService, $rootScope, $q) {
        var deferred = $q.defer();
        var initResourcePromise = deferred.promise;

        MaterialProvider.getRoot().then(function () {
            deferred.resolve("root: successful!")
        }, function (data, err) {
            deferred.reject("Error occurred while loading root material: " + err);
        });

        $rootScope.initResourcePromise = initResourcePromise;
    })

    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                controller: 'testCtrl',
                templateUrl: 'resources/partials/test/test.html'
            })
            .otherwise({redirectTo: '/'})
    });







