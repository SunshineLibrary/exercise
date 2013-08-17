angular.module("LessonDemo", ['LessonDemo.controllers', 'LessonDemo.directives',
        'LessonDemo.services', 'LazyLoader'])

    .config(function ($routeProvider) {
        $routeProvider
            .when('/root', {
                controller: 'rootCtrl',
                templateUrl: 'partials/subject.html'
            })
            .when('/subject/:sid', {
                controller: 'subjectCtrl',
                templateUrl: 'partials/subject.html'
            })
            .when('/subject/:sid/chapter/:cid', {
                controller: 'chapterCtrl',
                templateUrl: 'partials/chapter.html'
            })
            .when('/subject/:sid/chapter/:cid/lesson/:lid/activity/:aid', {
                controller: 'activityCtrl',
                templateUrl: 'partials/activity.html'
            })
    });








