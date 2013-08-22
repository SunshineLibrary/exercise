/**
 * Created with JetBrains WebStorm.
 * User: Tony_Zhang
 * Date: 13-8-1
 * Time: 下午9:27
 * To change this template use File | Settings | File Templates.
 */
angular.module('SunExercise.services', [])

    //core services of SunExercise app
    .factory("ExerciseService", function ($q, $http, $timeout) {

        var emitEvent = function (eventName, scope, args) {
            scope.$emit(eventName, args);
        }

        var getLoadingProgress = function (ts, apiUrl) {
            var deferred = $q.defer();
            var loadingProgressPromise = deferred.promise;

            //send a request to get the current state
            var currentStatePromise = $http.jsonp(apiUrl + "?ts=" + ts + "&act=status&callback=JSON_CALLBACK");
            currentStatePromise.success(function (stateData) {
                //check turtle server has finished the cache task
                if (!stateData.is_cached) {
                    deferred.resolve(stateData.progress);
                } else {
                    deferred.resolve("done");
                }
            })
            currentStatePromise.error(function (err) {
                deferred.reject("Error occured while getting the current status: " + err);
            })

            return loadingProgressPromise;
        }

        var getServerResources = function (apiUrl, timeStamp) {
            var deferred = $q.defer();
            var getResourcesPromise = deferred.promise;

            //check if turtle server has already cached the resources
            var statusPromise = $http.jsonp(apiUrl + "?ts=" + timeStamp + "&act=status&callback=JSON_CALLBACK");
            statusPromise.success(function (status) {
                if ((typeof status.is_cached == "undefined") || (typeof status.is_cached != "undefined" && !status.is_cached)) {
                    var cachePromise = $http.jsonp(apiUrl + "?ts=" + timeStamp + "&act=cache&callback=JSON_CALLBACK");
                    cachePromise.success(function (response) {
                        //check if the turtle server is offline and no cache recorded
                        if (response == "506") {
                            deferred.reject("Server Offline");
                        } else {
                            //notify the current progress
                            deferred.notify(response.progress);
                            //get new downloading progress every 0.5 sec
                            $timeout(function getNewResources() {
                                var currentDataPromise = getLoadingProgress(timeStamp, apiUrl);
                                currentDataPromise.then(function (progressData) {
                                    if (progressData != "done") {
                                        //notify the progress and show on the page
                                        deferred.notify(progressData);
                                        //recursively loading new status
                                        $timeout(getNewResources, 500);
                                        //turtle server has finished downloading resources
                                    } else {
                                        deferred.notify(100);
                                        //complete downloading
                                        deferred.resolve("complete");
                                    }
                                })
                            }, 500);
                        }
                    })
                } else if (status.is_cached) {
                    deferred.resolve("already in cache");
                }
            })
            statusPromise.error(function (err) {
                deferred.reject("Requesting current resources status error: " + err);
            })

            return getResourcesPromise;
        }

        return {
            emitEvent: emitEvent,
            getServerResources: getServerResources
        };
    })

    //provide material
    .factory("MaterialProvider", function ($http, $q, $timeout, ExerciseService) {

        var rootMaterial = {};
        var userinfoMaterial = {};
        var Material = {};
        var materialMap = {};

        var getRoot = function () {
            var deferred = $q.defer();
            var getRootPromise = deferred.promise;

            var promise = $http.jsonp("http://192.168.3.27:3000/exercise/v1/root?callback=JSON_CALLBACK");
            promise.success(function (data) {
                rootMaterial = data;
                for (var i = 0; i < rootMaterial.subjects.length; i++) {
                    materialMap[rootMaterial.subjects[i].id] = rootMaterial.subjects[i];
                    for (var j = 0; j < rootMaterial.subjects[i].chapters.length; j++) {
                        materialMap[rootMaterial.subjects[i].chapters[j].id] = rootMaterial.subjects[i].chapters[j];
                        for (var k = 0; k < rootMaterial.subjects[i].chapters[j].lessons.length; k++) {
                            materialMap[rootMaterial.subjects[i].chapters[j].lessons[k].id] =
                                rootMaterial.subjects[i].chapters[j].lessons[k];
                        }
                    }
                }
                deferred.resolve(data);
            })
            promise.error(function (data, err) {
                deferred.reject("Load Root Data Error: " + err);
            })

            return getRootPromise;
        }

        var loadUserInfo = function (ts) {
            var deferred = $q.defer();
            var userInfoPromise = deferred.promise;

            var promise = $http.jsonp("http://192.168.3.27:3000/exercise/v1/user_info?ts=" + ts + "&callback=JSON_CALLBACK");
            promise.success(function (UserInfo) {
                userinfoMaterial = UserInfo;
                deferred.resolve("Loading user info successful!");
            });
            promise.error(function (error) {
                deferred.reject("Error occured while loading userInfo: " + error);
            });

            return userInfoPromise;
        }

        var getUserInfo = function () {
            return userinfoMaterial;
        }

        var getSubjectMaterial = function (subjectId) {
            return materialMap[subjectId];
        }

        var loadChapterResources = function (chapterId) {
            var deferred = $q.defer();
            var getChapterPromise = deferred.promise;

            var ts = materialMap[chapterId].ts;
            var promise = ExerciseService.getServerResources("http://192.168.3.27:3000/exercise/v1/chapters/" + chapterId, ts);
            //var promise = $http.get("data/" + chapterId + ".json");
            promise.then(function (data) {
                deferred.resolve(data);
            }, function (data, err) {
                deferred.reject(err);
            }, function (progressData) {
                deferred.notify(progressData);
            })

            return getChapterPromise;
        }

        var getChapterMaterial = function (chapterId) {
            return materialMap[chapterId];
        }

        var getLessonMaterial = function (lessonId) {
            var deferred = $q.defer();
            var getLessonPromise = deferred.promise;

            var ts = materialMap[lessonId].ts;
            var promise = $http.jsonp("http://192.168.3.27:3000/exercise/v1/lessons/" + lessonId + "?ts=" + ts + "&callback=JSON_CALLBACK");
            //var promise = $http.jsonp("http://192.168.3.100:3000/exercise/v1/lessons/" + lessonId + "?ts=" + ts + "&callback=JSON_CALLBACK");

            promise.success(function (data) {
                Material = data;
                for (var j = 0; j < Material.activities.length; j++) {
                    //if randomize problems, shuffle all the problems in all activities
                    if ((typeof Material.activities[j].randomize_problems != "undefined") &&
                        (Material.activities[j].randomize_problems)) {
                        Material.activities[j].problems = _.shuffle(Material.activities[j].problems);
                    }
                    //if randomize choices, shuffle all the choices in all problems
                    if ((typeof Material.activities[j].randomize_choices != "undefined") &&
                        (Material.activities[j].randomize_choices)) {
                        for (var k = 0; k < Material.activities[j].problems[k].choices.length; k++) {
                            Material.activities[j].problems[k].choices = _.shuffle(Material.activities[j].problems[k].choices);
                        }
                    }
                    materialMap[Material.activities[j].id] = Material.activities[j];
                }
                materialMap[Material.id] = Material;

                deferred.resolve(Material);
            })
            promise.error(function (data, err) {
                deferred.reject("Load Lesson Data Error: " + err);
            })

            return getLessonPromise;
        }

        //random select pool_count problems from problems pool
        var getShuffledProblems = function (activityData, seed) {
            var problemsIndex = [];
            for (var j = 0, max = activityData.problems.length; j < max; j++) {
                problemsIndex.push(j);
            }
            var problemsShuffled = [];
            for (var k = 0, len = seed.length; k < len; k++) {
                var r = parseInt(seed[k] * (len - k));
                problemsShuffled.push(activityData.problems[problemsIndex[r]]);
                problemsIndex.splice(r, 1);
            }
            return problemsShuffled;
        }

        var getActivityMaterial = function (activityId, seed) {
            var activityData = this.getMaterial(activityId);
            //check if problems should be chosen from pool
            if (typeof activityData.pool_count != "undefined") {
                //clone a new copy of the original activity material
                activityData = _.clone(this.getMaterial(activityId));
                //resume a previous activity
                if (typeof seed != "undefined") {
                    var shuffledProblems = getShuffledProblems(activityData, seed);
                    activityData.problems = shuffledProblems;
                    activityData.seed = seed;
                    //enter or review activity
                } else {
                    var newSeed = [];
                    for (var i = 0; i < activityData.pool_count; i++) {
                        newSeed.push(Math.random());
                    }
                    var shuffledProblems = getShuffledProblems(activityData, newSeed);
                    activityData.problems = shuffledProblems;
                    activityData.seed = newSeed.slice();
                }
                return activityData;
            } else {
                return activityData;
            }
        }

        var getAchievementsMaterial = function () {
            var deferred = $q.defer();
            var achievementsPromise = deferred.promise;

            var promise = $http.jsonp("http://192.168.3.27:3000/achievements");
            promise.success(function (achievementsJson) {
                deferred.resolve(achievementsJson)
            });
            promise.error(function (err) {
                deferred.reject("Error occurred while loading achievements json: " + err);
            })

            return achievementsPromise;
        }

        var loadAchievementsResources = function (ts) {
            var deferred = $q.defer();
            var achievementsPromise = deferred.promise;

            var getAchievementsPromise = ExerciseService.getServerResources("http://192.168.3.27:3000/achievements", ts);
            getAchievementsPromise.then(function (data) {
                deferred.resolve(data);
            }, function (err) {
                deferred.reject("Error occurred while loading achievements resources: " + err);
            }, function (progressData) {
                deferred.notify(progressData);
            })

            return achievementsPromise;
        }

        //General API
        var getMaterial = function (moduleId) {
            return materialMap[moduleId];
        }

        return {
            getRoot: getRoot,
            loadUserInfo: loadUserInfo,
            getUserInfo: getUserInfo,
            getSubjectMaterial: getSubjectMaterial,
            loadChapterResources: loadChapterResources,
            getChapterMaterial: getChapterMaterial,
            getLessonMaterial: getLessonMaterial,
            getActivityMaterial: getActivityMaterial,
            getAchievementsMaterial: getAchievementsMaterial,
            loadAchievementsResources: loadAchievementsResources,
            getMaterial: getMaterial
        }
    })

    .factory("UserdataProvider", function (MaterialProvider, $q, $http) {
        var USERDATA = {};
        var userdataMap = {};

        var getGeneralUserData = function () {
            return UserInfo;
        }

        var getLessonUserdata = function (lessonId) {
            var deferred = $q.defer();
            var lessonPromise = deferred.promise;

            //if already in userdatamap
            if (typeof USERDATA[lessonId] != "undefined") {
                deferred.resolve(USERDATA[lessonId]);
                return lessonPromise;
            }
            //the current userdata has not been cached
            var userdataPromise = $http.jsonp("http://192.168.3.27:3000/exercise/v1/user_data/lessons/" + lessonId +
                "?callback=JSON_CALLBACK");
            userdataPromise.success(function (userdata, status) {
                if (typeof userdata.summary != "undefined") {
                    //update the local userdata
                    USERDATA[lessonId] = userdata;
                    deferred.resolve(USERDATA[lessonId]);
                } else if (typeof userdata.summary == "undefined" && status == 200) {
                    USERDATA[lessonId] = {
                        is_complete: false,
                        activities: {},
                        summary: { badges: [] }
                    };
                    userdataMap[lessonId] = USERDATA[lessonId];

                    var promise = MaterialProvider.getLessonMaterial(lessonId);
                    promise.then(function (lessonData) {
                        for (var i = 0; i < lessonData.activities.length; i++) {
                            if (lessonData.activities[i].type === 'quiz') {
                                USERDATA[lessonId].activities[lessonData.activities[i].id] = {
                                    is_complete: false,
                                    problems: {},
                                    summary: {}
                                };
                                if (typeof lessonData.activities[i].pool_count != "undefined") {
                                    USERDATA[lessonId].activities[lessonData.activities[i].id].seed = [];
                                }
                                userdataMap[lessonData.activities[i].id] = USERDATA[lessonId].
                                    activities[lessonData.activities[i].id];
                            } else {
                                USERDATA[lessonId].activities[lessonData.activities[i].id] = {
                                    summary: {}
                                };
                                userdataMap[lessonData.activities[i].id] = USERDATA[lessonId].
                                    activities[lessonData.activities[i].id];
                            }
                        }
                        deferred.resolve(USERDATA[lessonId]);
                    })
                }
            });
            userdataPromise.error(function (err) {
                deferred.reject("Error occurred while loading userdata from turtle server: " + err);
            });

            return lessonPromise;
        }

        var getActivityUserdata = function (activityId) {
            var activityData = MaterialProvider.getMaterial(activityId);
            if (typeof activityData.pool_count != "undefined") {
                //enter or review activity, write chosen problems' map in the userdataMap
                if ((typeof userdataMap[activityId].seed != "undefined") && (userdataMap[activityId].seed.length == 0)) {
                    activityData = MaterialProvider.getActivityMaterial(activityId);
                    userdataMap[activityId].seed = activityData.seed;
                    for (var i = 0; i < activityData.problems.length; i++) {
                        userdataMap[activityId].problems[activityData.problems[i].id] = {
                            is_correct: false,
                            answer: []
                        };
                        userdataMap[activityData.problems[i].id] =
                            userdataMap[activityId].problems[activityData.problems[i].id];
                    }
                    return userdataMap[activityId];
                    //resume activity, userdataMap has already recorded the chosen problems
                } else {
                    return userdataMap[activityId];
                }
            } else if ((activityData.type === "quiz") && (typeof userdataMap[activityData.problems[0].id] == "undefined")) {
                for (var i = 0; i < activityData.problems.length; i++) {
                    userdataMap[activityId].problems[activityData.problems[i].id] = {
                        is_correct: false,
                        answer: []
                    };
                    userdataMap[activityData.problems[i].id] =
                        userdataMap[activityId].problems[activityData.problems[i].id];
                }
                return userdataMap[activityId];
                //activity is a lecture
            } else {
                return userdataMap[activityId];
            }
        }

        var getUserdata = function (moduleId) {
            return userdataMap[moduleId];
        }

        var resetUserdata = function (moduleName, moduleId) {
            if (moduleName === "lesson") {
                var promise = this.getLessonUserdata(moduleId);
                promise.then(function (lessonUserdata) {
                    return lessonUserdata;
                })
            } else if (moduleName === "activity") {
                var activityData = MaterialProvider.getMaterial(moduleId);
                userdataMap[moduleId] = {
                    is_complete: true,
                    summary: { badges: [] }
                };
                userdataMap[activityData.parent_id].activities[moduleId] = userdataMap[moduleId];

                if (activityData.type === 'quiz') {
                    userdataMap[moduleId].problems = {};
                    if (typeof activityData.pool_count != "undefined") {
                        userdataMap[moduleId].seed = [];
                    }
                    for (var i = 0; i < activityData.problems.length; i++) {
                        userdataMap[moduleId].problems[activityData.problems[i].id] = {
                            is_correct: false,
                            answer: []
                        }
                        userdataMap[activityData.problems[i].id] = userdataMap[moduleId].
                            problems[activityData.problems[i].id];
                    }
                }
                return userdataMap[moduleId];
            } else {
                userdataMap[moduleId] = {
                    is_correct: false,
                    answer: []
                }
                return userdataMap[moduleId];
            }
        }

        var flushUserdata = function (lessonId) {
            $http.post("http://192.168.3.27:3000/exercise/v1/user_data/lessons/" + lessonId, "data=" + JSON.stringify(USERDATA[lessonId]));
        }

        return{
            getLessonUserdata: getLessonUserdata,
            getActivityUserdata: getActivityUserdata,
            getUserdata: getUserdata,
            flushUserdata: flushUserdata,
            resetUserdata: resetUserdata
        }

    })

    .factory("GraderProvider", function () {

        var graderCollection = {
            lecture_finish: function () {
                return function () {
                    return true;
                };
            },
            practice_finish: function () {
                return function () {
                    return true;
                };
            },
            practice_all_correct: function (condition) {
                return function (userData) {
                    return (userData.correct_percent == condition[0]);
                };
            },
            practice_fast_and_correct: function (condition) {
                return function (userData) {
                    return ((userData.correct_percent == condition[0]) && (userData.duration <= condition[2] * 1000));
                }
            },
            golden_cup: function (condition) {
                return function (userData) {
                    return (userData.correct_percent >= condition[0]);
                }
            },
            final_quiz_failed: function (condition) {
                return function (userData) {
                    return ((userData.correct_percent < condition[0]) && (userData.duration <= condition[2] * 1000));
                }
            }
        };

        var getGrader = function (grader_id, condition) {
            return graderCollection[grader_id](condition);
        }

        var graderFactory = function (graderFunc, userData) {
            return graderFunc(userData);
        }

        return {
            getGrader: getGrader,
            graderFactory: graderFactory
        }
    })

    .factory("SandboxProvider", function (MaterialProvider, UserdataProvider, GraderProvider, ExerciseService) {

        function Sandbox() {

            Sandbox.prototype.getRoot = function () {
                return MaterialProvider.getRoot();
            }

            Sandbox.prototype.getUserInfo = function () {
                return MaterialProvider.getUserInfo();
            }

            Sandbox.prototype.getSubjectMaterial = function (subjectId) {
                return MaterialProvider.getSubjectMaterial(subjectId);
            }

            Sandbox.prototype.loadChapterResources = function (chapterId) {
                return MaterialProvider.loadChapterResources(chapterId);
            }

            Sandbox.prototype.getChapterMaterial = function (chapterId) {
                return MaterialProvider.getChapterMaterial(chapterId);
            }

            Sandbox.prototype.getLessonMaterial = function (lessonId) {
                return MaterialProvider.getLessonMaterial(lessonId);
            }

            Sandbox.prototype.getActivityMaterial = function (activityId, seed) {
                return MaterialProvider.getActivityMaterial(activityId, seed);
            }

            Sandbox.prototype.getAchievementsMaterial = function () {
                return MaterialProvider.getAchievementsMaterial();
            }

            Sandbox.prototype.loadAchievementsResources = function (ts) {
                return MaterialProvider.loadAchievementsResources(ts);
            }

            Sandbox.prototype.getLessonUserdata = function (lessonId) {
                return UserdataProvider.getLessonUserdata(lessonId);
            }

            Sandbox.prototype.getActivityUserdata = function (activityId) {
                return UserdataProvider.getActivityUserdata(activityId);
            }

            Sandbox.prototype.getUserdata = function (moduleId) {
                return UserdataProvider.getUserdata(moduleId);
            }

            Sandbox.prototype.flushUserdata = function (lessonId, userdata) {
                return UserdataProvider.flushUserdata(lessonId, userdata);
            }

            Sandbox.prototype.resetUserdata = function (moduleName, moduleId) {
                return UserdataProvider.resetUserdata(moduleName, moduleId);
            }

            Sandbox.prototype.getParentLessonData = function (moduleName, parentId) {

                if (moduleName === "activity") {
                    MaterialProvider.getMaterial(parentId);
                } else if (moduleName === "module") {
                    //get the activity material first, then get the lesson material
                    var activityMaterial = MaterialProvider.getMaterial(parentId);
                    return MaterialProvider.getMaterial(activityMaterial.parent_id);
                } else {
                    return false;
                }
            }

            Sandbox.prototype.getParentActivityData = function (parentId) {
                return MaterialProvider.getMaterial(parentId);
            }

            Sandbox.prototype.getGrader = function (graderId, condition) {
                return GraderProvider.getGrader(graderId, condition);
            }

            Sandbox.prototype.createGrader = function (graderFunc, userData) {
                return GraderProvider.graderFactory(graderFunc, userData);
            }

            //a emitter for communications between modules
            Sandbox.prototype.sendEvent = function (eventName, scope, args) {
                ExerciseService.emitEvent(eventName, scope, args);
            }

            //a parser for lesson complete logic
            Sandbox.prototype.parseCompleteCondition = function (pass_score, summary) {
                var target_score = 0;
                if (pass_score.slice(pass_score.length - 1) === "%") {
                    target_score = parseInt(pass_score.slice(0, pass_score.length - 1));
                    return (summary.correct_percent >= target_score);
                } else {
                    target_score = parseInt(pass_score);
                    return (summary.correct_count >= target_score);
                }
            }

            //1. a parser for jump logic between activities
            //2. a parser to determine if the student can get certain badge
            Sandbox.prototype.conditionParser = function (condition, correctCount, correctPercent) {
                var is_percent = false;
                var targetNum = 0;

                if (condition.slice(condition.length - 1) === "%") {
                    is_percent = true;
                }

                if (condition.slice(1, 2) === "=") {
                    if (is_percent) {
                        targetNum = condition.slice(2, condition.length - 1);
                    } else {
                        targetNum = condition.slice(2);
                    }
                    if (condition.slice(0, 1) === ">") {
                        return ((is_percent && (correctPercent >= targetNum)) ||
                            (!is_percent && (correctCount >= targetNum)));
                    } else {
                        return ((is_percent && (correctPercent <= targetNum)) ||
                            (!is_percent && (correctCount <= targetNum)));
                    }
                } else {
                    if (is_percent) {
                        targetNum = condition.slice(1, condition.length - 1);
                    } else {
                        targetNum = condition.slice(1);
                    }
                    if (condition.slice(0, 1) === ">") {
                        return ((is_percent && (correctPercent > targetNum)) ||
                            (!is_percent && (correctCount > targetNum)));
                    } else if (condition.slice(0, 1) === "<") {
                        return ((is_percent && (correctPercent < targetNum)) ||
                            (!is_percent && (correctCount < targetNum)));
                    } else {
                        return ((is_percent && (correctPercent == targetNum)) ||
                            (!is_percent && (correctCount == targetNum)));
                    }
                }
            }

            //all jump logic for a quiz activity
            Sandbox.prototype.completeQuizActivity = function (activityData, $scope, correctCount, lessonSummary) {

                if (typeof activityData.jump !== "undefined") {
                    var jump = [];
                    for (var i = 0; i < activityData.jump.length; i++) {
                        jump = activityData.jump[i].split(':');
                        var correctPercent = parseInt((correctCount * 100) / activityData.problems.length);
                        if (((jump[0] === "end_of_lesson_if_correctness") &&
                            (this.conditionParser(jump[1], correctCount, correctPercent))) ||
                            ((jump[0] === "to_activity_if_correctness") &&
                                (this.conditionParser(jump[2], correctCount, correctPercent))) ||
                            (jump[0] === "force_to_activity")) {
                            break;
                        }
                    }
                    //split the third parameter and apply the jump logic
                    if (i < activityData.jump.length) {
                        if (jump[0] !== "end_of_lesson_if_correctness") {
                            if ((typeof activityData.show_summary == "undefined") || (!activityData.show_summary) ||
                                ((activityData.show_summary) && ($scope.showQuizSummary))) {
                                this.sendEvent("activityComplete_" + activityData.id, $scope, {activity: jump[1], summary: lessonSummary, should_transition: true});
                            } else {
                                this.sendEvent("activityComplete_" + activityData.id, $scope, {activity: jump[1], summary: lessonSummary, should_transition: false});
                            }
                        } else {
                            if ((typeof activityData.show_summary == "undefined") || (!activityData.show_summary) ||
                                ((activityData.show_summary) && ($scope.showQuizSummary))) {
                                this.sendEvent("endOfLesson", $scope, {summary: lessonSummary, should_transition: true});
                            } else {
                                this.sendEvent("endOfLesson", $scope, {summary: lessonSummary, should_transition: false});
                            }
                        }
                        //the student does not complete the jump condition
                    } else {
                        if ((typeof activityData.show_summary == "undefined") || (!activityData.show_summary) ||
                            ((activityData.show_summary) && ($scope.showQuizSummary))) {
                            this.sendEvent("activityComplete_" + activityData.id, $scope, {summary: lessonSummary, should_transition: true});
                        } else {
                            //send activity complete event to lesson directive without jump
                            this.sendEvent("activityComplete_" + activityData.id, $scope, {summary: lessonSummary, should_transition: false});
                        }
                    }
                } else {
                    if ((typeof activityData.show_summary == "undefined") || (!activityData.show_summary) ||
                        ((activityData.show_summary) && ($scope.showQuizSummary))) {
                        this.sendEvent("activityComplete_" + activityData.id, $scope, {summary: lessonSummary, should_transition: true});
                    } else {
                        //send activity complete event to lesson directive without jump
                        this.sendEvent("activityComplete_" + activityData.id, $scope, {summary: lessonSummary, should_transition: false});
                    }
                }
            }

            //grader for three types of questions
            Sandbox.prototype.problemGrader = function (currProblem, userAnswer) {
                if (currProblem.type === "singlechoice") {
                    if (typeof userAnswer[currProblem.id] !== "undefined") {
                        for (var i = 0; i < currProblem.choices.length; i++) {
                            if (userAnswer[currProblem.id] === currProblem.choices[i].id) {
                                break;
                            }
                        }
                        return (currProblem.choices[i].is_correct);
                    }

                    //single filling question grader
                } else if (currProblem.type === "singlefilling") {
                    return ((typeof userAnswer[currProblem.id] !== "undefined") &&
                        (userAnswer[currProblem.id] === currProblem.correct_answer));

                    //multi-choice question grader
                } else {
                    var isCorrect = true;
                    for (var i = 0; i < currProblem.choices.length; i++) {
                        if (currProblem.choices[i].is_correct) {
                            if ((typeof userAnswer[currProblem.choices[i].id] === "undefined") ||
                                (!userAnswer[currProblem.choices[i].id])) {
                                isCorrect = false;
                                break;
                            }
                        }
                    }
                    return isCorrect;
                }
            }

            Sandbox.prototype.playSoundEffects = function (soundUrl) {
                var soundEffect = new Audio(soundUrl);
                soundEffect.play();
            }

        }

        var getSandbox = function () {
            return new Sandbox();
        }

        return {
            getSandbox: getSandbox
        }

    })

