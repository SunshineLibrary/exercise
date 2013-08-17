/**
 * Created with JetBrains WebStorm.
 * User: Tony_Zhang
 * Date: 13-7-18
 * Time: 下午2:57
 * To change this template use File | Settings | File Templates.
 */

//LazyLoader Service

angular.module('LazyLoader', [])

    .factory('LazyLoader', function ($q, $timeout) {

        var loaderTask,
            loaderUI,
            loaderSuccess,
            loaderError,
            showProcess = false,
            loaderEvent,
            showTransition = false,
            tansitionMain;


        //mutators
        var setTask = function (task) {
            loaderTask = task;
        };

        var setLoaderUI = function (ui) {
            loaderUI = ui;
        };

        var setSuccess = function (success) {
            loaderSuccess = success;
        };

        var setError = function (error) {
            loaderError = error;
        };

        var shouldShowProcess = function (showprocess, eventType) {
            showProcess = showprocess;
            loaderEvent = eventType;
        };

        var shouldShowTransition = function (showtransition, tansitionmain) {
            showTransition = showtransition;
            tansitionMain = tansitionmain;
        };

        //success and error callbacks
        var onSuccess = function (data, status, headers, config) {
            if (showTransition) {
                PageTransitions.nextPage(parseInt(Math.random() * 67 + 1));
            }
            loaderSuccess(data, status, headers, config);

        };

        var onError = function (reason, status, headers, config) {
            if (showTransition) {
                PageTransitions.nextPage(parseInt(Math.random() * 67 + 1));
            }
            loaderError(reason, status, headers, config);

        };

        //loading process
        var startLoading = function ($scope) {

            if (showTransition) {
                PageTransitions.init(tansitionMain);
            }

            //doing task
            var taskPromise = loaderTask();

            var deferred = $q.defer();
            var promise = deferred.promise;

            //show the loading UI
            $timeout(function () {

                if (showProcess) {

                    $scope.$on(loaderEvent, function (event, data) {
                        //console.log(data);
                        $scope.$apply(function () {
                            loaderUI(data);
                        });
                    })
                } else {
                    loaderUI();
                }

            }, 0);

            //success callbacks and error handling
            //1s timeout is set for those files that are loaded instantaneously
            $timeout(function () {

                //angularJS callbacks
                if (typeof taskPromise.success === "function") {

                    taskPromise.success(function (data, status, headers, config) {
                        onSuccess(data, status, headers, config)
                    });
                    taskPromise.error(function (reason, status, headers, config) {
                        onError(reason, status, headers, config)
                    });

                    //jquery callbacks
                } else if (typeof taskPromise.done === "function") {

                    taskPromise.done(function (data, status, headers, config) {
                        onSuccess(data, status, headers, config)
                    });
                    taskPromise.fail(function (reason, status, headers, config) {
                        onError(reason, status, headers, config)
                    });

                    //XMLHttpRequest callbacks
                } else {

                    taskPromise.then(
                        function (data, status, headers, config) {
                            onSuccess(data, status, headers, config)
                        }, function (reason, status, headers, config) {
                            onError(reason, status, headers, config)
                        }
                    );
                }
            }, 1500);

            deferred.resolve();

            return promise;
        };

        return {
            setTask: setTask,
            setLoaderUI: setLoaderUI,
            setSuccess: setSuccess,
            setError: setError,
            showProcess: shouldShowProcess,
            showTransition: shouldShowTransition,
            startLoading: startLoading
        };

    })






