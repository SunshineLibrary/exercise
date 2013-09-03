angular.module("SunExercise", ['SunExercise.controllers', 'SunExercise.directives',
        'SunExercise.services'])

    .run(function (APIProvider, MaterialProvider, ExerciseService, $rootScope, $q) {
        var deferred = $q.defer();
        var initResourcePromise = deferred.promise;

        MaterialProvider.getRoot().then(function (rootMaterial) {
            //load user info material
            MaterialProvider.loadUserInfo(rootMaterial.userinfo.ts).then(function (msg) {
                console.log(msg);
            }, function (data, err) {
                console.log("Error occurred while loading user info material: " + err);
            })

            //load initial resources
            ExerciseService.getServerResources(APIProvider.getAPI("getInitResources", "", ""), rootMaterial.resources.ts).
                then(function (msg) {
                    deferred.resolve(msg);
                }, function (err) {
                    deferred.reject("Error occurred while loading initial resources: " + err);
                }, function (progressData) {
                    deferred.notify(progressData);
                })
        }, function (data, err) {
            console.log("Error occurred while loading root material: " + err);
        });

        $rootScope.initResourcePromise = initResourcePromise;
    })

    .config(function ($routeProvider) {
        $routeProvider
            .when('/root', {
                controller: 'rootCtrl',
                templateUrl: 'resources/partials/subject.html'
            })
            .when('/subject/:sid', {
                controller: 'subjectCtrl',
                templateUrl: 'resources/partials/subject.html'
            })
            .when('/subject/:sid/chapter/:cid', {
                controller: 'chapterCtrl',
                templateUrl: 'resources/partials/chapter.html'
            })
            .when('/subject/:sid/chapter/:cid/lesson/:lid/activity/:aid', {
                controller: 'activityCtrl',
                templateUrl: 'resources/partials/activity.html'
            })
            .when('/achievements', {
                controller: 'achievementsCtrl',
                templateUrl: 'resources/partials/achievements.html'
            })
            .when('/achievements/awards/:aid', {
                controller: 'awardsCtrl',
                templateUrl: 'resources/partials/awards.html'
            })
    });








