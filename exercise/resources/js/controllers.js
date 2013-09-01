/**
 * Created with JetBrains WebStorm.
 * User: Tony_Zhang
 * Date: 13-8-1
 * Time: 下午9:25
 * To change this template use File | Settings | File Templates.
 */

angular.module('SunExercise.controllers', [])

    //root controller
    .controller('rootCtrl', function ($location, MaterialProvider) {
        var rootPromise = MaterialProvider.getRoot();
        rootPromise.then(function (rootData) {
            $location.path('/subject/' + rootData.subjects[0].id);
        })
    })

    //subject controller
    .controller('subjectCtrl', function () {

    })

    //chapter controller
    .controller('chapterCtrl', function () {

    })

    //lesson controller
    .controller('lessonCtrl', function () {

    })

    //activity controller
    .controller('activityCtrl', function () {

    })

    //achievements controller
    .controller('achievementsCtrl', function () {

    })

    //achievement awards controller
    .controller('awardsCtrl', function () {

    });