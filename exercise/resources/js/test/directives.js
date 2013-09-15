/**
 * Created with JetBrains WebStorm.
 * Author: Zhenghan
 * Date: 13-8-1
 * Time: 下午9:26
 * To change this template use File | Settings | File Templates.
 */

angular.module('SunExerciseTest.directives', [])

    .directive("test", function (SandboxProvider) {

        var testSandbox = SandboxProvider.getSandbox();

        return {
            restrict: "E",
            link: function ($scope) {
                $scope.checkLesson = function () {
                    $scope.initResourcePromise.then(function(){
                        var lessonMaterialPromise = testSandbox.getLessonMaterial($scope.lessonId);
                        lessonMaterialPromise.then(function(lessonData){
                            console.log(lessonData);
                        })
                    })
                }
            }
        }
    })