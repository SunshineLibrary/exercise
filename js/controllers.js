/**
 * Created with JetBrains WebStorm.
 * User: Tony_Zhang
 * Date: 13-8-1
 * Time: 下午9:25
 * To change this template use File | Settings | File Templates.
 */

angular.module('LessonDemo.controllers', [])

    //root controller
    .controller('rootCtrl', function ($location, MaterialProvider) {
        var subjects = MaterialProvider.getRoot()['subjects'];
        $location.path('/subject/' + subjects[0].id);
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

    });