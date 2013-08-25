/**
 * Created with JetBrains WebStorm.
 * User: Tony_Zhang
 * Date: 13-8-1
 * Time: 下午9:26
 * To change this template use File | Settings | File Templates.
 */

angular.module('SunExercise.directives', [])

    //subject module
    .directive("subject", function (SandboxProvider, $routeParams, $location) {

        //create the subject sandbox
        var subjectSandbox = SandboxProvider.getSandbox();

        return {
            restrict: "E",
            link: function ($scope) {
                $scope.initResourcePromise.then(function (msg) {
                    console.log("Loading initial resources complete: " + msg);
                    //hide the loading div and show the subject contents
                    $scope.completeLoading = true;
                    var rootPromise = subjectSandbox.getRoot();
                    rootPromise.then(function (rootMaterial) {
                        var subjectMaterial = subjectSandbox.getSubjectMaterial($routeParams.sid);

                        $scope.subjects = rootMaterial.subjects;
                        $scope.chapters = subjectMaterial.chapters;
                        $scope.enterSubject = function (subjectId) {
                            $location.path('/subject/' + subjectId);
                        }
                        $scope.enterChapter = function (chapterId) {
                            $location.path('/subject/' + $routeParams.sid + '/chapter/' + chapterId);
                        }
                        $scope.loadProgress = {};
                        $scope.isCompleteLoad = {};
                        $scope.showProgress = {};
                        for (var i = 0; i < subjectMaterial.chapters.length; i++) {
                            $scope.isCompleteLoad[subjectMaterial.chapters[i].id] = true;
                        }
                    }, function (err) {
                        console.log("Error occured  while loading root data: " + err);
                    })

                    //TODO: progress UI need to be changed
                    $scope.downloadResources = function (chapterId) {
                        $scope.showProgress[chapterId] = true;
                        var chapterMaterialPromise = subjectSandbox.loadChapterResources(chapterId);
                        chapterMaterialPromise.then(function (msg) {
                            console.log("Loading resources complete: " + msg);
                            $scope.isCompleteLoad[chapterId] = false;
                        }, function (err) {
                            console.log("Error occured while loading chapter data: " + err);
                        }, function (progressData) {
                            $scope.loadProgress[chapterId] = progressData;
                        })
                    }
                }, function (err) {
                    console.log(err);
                }, function (progressData) {
                    //notify the loading progress
                    $scope.progress = progressData;
                })
            }
        }
    })

    //chapter module
    .directive("chapter", function (SandboxProvider, $routeParams, $location) {

        //create the chapter sandbox
        var chapterSandbox = SandboxProvider.getSandbox();

        return {
            restrict: "E",
            link: function ($scope, $element) {
                var chapterData = chapterSandbox.getChapterMaterial($routeParams.cid);
                $scope.lessons = chapterData.lessons;
                var lessonState = {};
                for (var i = 0; i < chapterData.lessons.length; i++) {
                    lessonState[chapterData.lessons[i].id] = false;
                }
                angular.forEach(chapterData.lessons, function (lesson, index) {
                    chapterSandbox.getLessonUserdata(lesson.id)
                        .then(function (userdata) {
                            if (userdata.is_complete) {
                                lessonState[lesson.id] = true;
                            }
                        });
                })
                $scope.loadLesson = function (lesson) {
                    if (typeof lesson.requirements == 'undefined') {
                        return true;
                    } else {
                        for (var i = 0; i < lesson.requirements.length; i++) {
                            if (!lessonState[lesson.requirements[i]]) {
                                return false;
                            }
                        }
                        return true;
                    }
                }
                $scope.enterAchievementCenter = function () {
                    $location.path('/achievements');
                }
                $scope.returnToSubject = function () {
                    $location.path('/subject/' + $routeParams.sid);
                }
            }
        }
    })


    //lesson module
    .directive("lesson", function (SandboxProvider, $location, $routeParams, $http, $q, $templateCache, $compile) {
        //console.log('hit');
        //create the lesson sandbox
        var lessonSandbox = SandboxProvider.getSandbox();

        //every lesson has a fsm
        var FSM = StateMachine.create({
            initial: 'welcome',
            events: [
                { name: 'enter', from: 'welcome', to: 'learn'},
                { name: 'resume', from: 'welcome', to: 'learn'},
                { name: 'complete', from: 'learn', to: 'welcome'},
                { name: 'back', from: 'learn', to: 'welcome'}
            ],

            callbacks: {
                onwelcome: function (event, from, to) {
                    $location.path('subject/' + $routeParams.sid + '/chapter/' + $routeParams.cid);
                },
                onlearn: function (event, from, to, lesson_id, activity_id) {
                    $location.path('subject/' + $routeParams.sid + '/chapter/' + $routeParams.cid +
                        '/lesson/' + lesson_id + '/activity/' + activity_id);
                }
            }
        });

        var continueLesson = function (lesson_id, activity_id) {
            $location.path('subject/' + $routeParams.sid + '/chapter/' + $routeParams.cid +
                '/lesson/' + lesson_id + '/activity/' + activity_id);
        }

        return {
            restrict: "E",
            link: function ($scope, $element) {
                if (typeof $scope.lesson != "undefined") {
                    var lessonMaterialPromise = lessonSandbox.getLessonMaterial($scope.lesson.id);
                    var lessonUserdataPromise = lessonSandbox.getLessonUserdata($scope.lesson.id);

                    //load the lesson template on the chapter page
                    $http.get('partials/lesson.html', {cache: $templateCache}).success(function (contents) {
                        $element.html(contents);
                        $compile($element.contents())($scope);
                    });
                } else {
                    var lessonMaterialPromise = lessonSandbox.getLessonMaterial($routeParams.lid);
                    var lessonUserdataPromise = lessonSandbox.getLessonUserdata($routeParams.lid);
                }

                //record lessonMaterial and lessonUserdata into a object
                var lessonTotalData = {};
                lessonMaterialPromise.then(function (material) {
                    lessonTotalData.material = material;
                })
                lessonUserdataPromise.then(function (userdata) {
                    lessonTotalData.userdata = userdata;
                })

                //continue logic after initResourcePromise, lessonMaterial and lessonUserdata have been loaded
                var lessonPromise = $q.all([$scope.initResourcePromise, lessonMaterialPromise, lessonUserdataPromise]);
                lessonPromise.then(function () {
                    var lessonData = lessonTotalData.material;
                    var lessonUserdata = lessonTotalData.userdata;
                    var userinfoData = lessonSandbox.getUserInfo();

                    //initialize ng-models
                    $scope.title = lessonData.title;
                    $scope.summary = lessonData.summary;
                    $scope.activities = lessonData.activities;
                    if (lessonUserdata.is_complete) {
                        $scope.showResult = true;
                        $scope.lessonResultCount = lessonUserdata.summary.correct_count;
                        $scope.lessonResultPercent = lessonUserdata.summary.correct_percent;
                        if (typeof lessonUserdata.summary.star != "undefined") {
                            $scope.hasStar = true;
                            $scope.lessonStar = (lessonUserdata.summary.star == 1) ? "铜牌" :
                                ((lessonUserdata.summary.star == 2) ? "银牌" :
                                    ((lessonUserdata.summary.star == 3) ? "金牌" : null));
                        }
                    }
                    if (typeof lessonUserdata.current_activity === "undefined") {
                        $scope.buttonMsg = "开始学习";
                    } else {
                        $scope.buttonMsg = "继续学习";
                    }
                    $scope.showLessonDialogue = function () {
                        $scope.lessonDialogue = true;
                        if (!lessonUserdata.is_complete) {
                            $scope.startLesson = true;
                        } else {
                            //remove activities that are not redoable
                            for (var i = 0; i < lessonData.activities.length; i++) {
                                if ((typeof lessonData.activities[i].redoable !== "undefined") &&
                                    (!lessonData.activities[i].redoable)) {
                                    $scope.activities.splice(i, 1);
                                }
                            }
                            $scope.reviewLesson = true;
                        }
                    }
                    $scope.enterActivity = function (id) {
                        if (typeof lessonUserdata.current_activity === "undefined") {
                            lessonUserdata.current_activity = lessonData.activities[0].id;
                            FSM.enter(id, lessonData.activities[0].id);
                        } else {
                            FSM.resume(id, lessonUserdata.current_activity);
                        }
                    }
                    $scope.reviewActivity = function (lessonId, activityId) {
                        if (typeof lessonUserdata.activities[activityId].current_problem !== "undefined") {
                            lessonUserdata.activities[activityId].current_problem = undefined;
                        }
                        lessonUserdata.current_activity = activityId;
                        FSM.resume(lessonId, activityId);
                    }
                    //listen to the pause activity request sent by an activity module
                    $scope.$on("pauseActivity", function (event) {
                        FSM.back();
                    })

                    //check global badges after each lesson is finished
                    $scope.$on("lesson.complete", function (event) {
                        var incompleteBadgesPromise = lessonSandbox.getIncompleteGlobalBadges(event);
                        incompleteBadgesPromise.then(function (globalBadges) {
                            var userDataToGrade = {
                                correct_percent: lessonUserdata.summary.correct_percent
                            };
                            for (var i = 0; i < globalBadges.length; i++) {
                                //create the custon grader using the grader template
                                if (typeof globalBadges[i].condition != "undefined") {
                                    var grader = lessonSandbox.getGrader(globalBadges[i].id, globalBadges[i].condition);
                                } else {
                                    var grader = lessonSandbox.getGrader(globalBadges[i].id, "");
                                }

                                //apply the userdata using the created grader
                                if (lessonSandbox.createGrader(grader, userDataToGrade)) {
                                    //write the new badge in userinfo
                                    lessonSandbox.addAchievements("badges", globalBadges[i].id);
                                }
                            }
                        })
                    })

                    //listen to the endOfListen event to end the lesson
                    $scope.$on("endOfLesson", function (event, args) {
                        if ((typeof args !== "undefined") && (typeof args.summary !== "undefined") &&
                            (typeof args.summary.correct_count !== "undefined")) {
                            lessonUserdata.summary.correct_count = args.summary.correct_count;
                            lessonUserdata.summary.correct_percent = args.summary.correct_percent;
                        }
                        //return to the lesson page;
                        lessonUserdata.current_activity = undefined;
                        //check if the student has completed the condition to complete the lesson
                        if ((typeof lessonUserdata.summary.correct_percent == "undefined")) {
                            lessonUserdata.summary.correct_percent = 100;
                            lessonUserdata.is_complete = true;
                        } else {
                            if (typeof lessonData.pass_score != "undefined") {
                                if (lessonSandbox.parseCompleteCondition(lessonData.pass_score, lessonUserdata.summary)) {
                                    lessonUserdata.is_complete = true;
                                }
                            } else {
                                lessonUserdata.is_complete = true;
                            }
                        }

                        if (args.should_transition) {
                            //give student star if qualified
                            if (typeof lessonUserdata.summary.correct_percent != "undefined") {
                                if (lessonUserdata.summary.correct_percent >= lessonData.star3) {
                                    lessonUserdata.summary.star = 3;
                                } else if (lessonUserdata.summary.correct_percent >= lessonData.star2) {
                                    lessonUserdata.summary.star = 2;
                                } else if (lessonUserdata.summary.correct_percent >= lessonData.star1) {
                                    lessonUserdata.summary.star = 1;
                                }
                            }
                            //give award videos and badges if qualified
                            if ((lessonUserdata.is_complete) && (typeof lessonData.achievements != "undefined")) {
                                for (var i = 0; i < lessonData.achievements.length; i++) {
                                    //award video logic
                                    if (lessonData.achievements[i].type == "award") {
                                        //check if the student has already got the award video
                                        if (typeof userinfoData.achievements.awards[lessonData.achievements[i].id] == "undefined") {
                                            //parse the award condition
                                            if ((typeof lessonUserdata.summary.correct_count == "undefined") ?
                                                (lessonSandbox.conditionParser(lessonData.achievements[i].condition, Infinity, 100)) :
                                                (lessonSandbox.conditionParser(lessonData.achievements[i].condition,
                                                    lessonUserdata.summary.correct_count, lessonUserdata.summary.correct_percent))) {
                                                lessonSandbox.addAchievements("awards", lessonData.achievements[i].id, Date.now());
                                            }
                                        }
                                    }
                                }
                            }
                            //send an event to check the global badges
                            lessonSandbox.sendEvent("lesson.complete", $scope);
                            //userdata analyzing completed, flush the current userdata
                            lessonSandbox.flushUserdata(lessonData.id);
                            FSM.back();
                        }
                    })

                    //iterate all the activities and add listeners
                    angular.forEach(lessonData.activities, function (activity, index) {

                        //listen to the complete event sent by an activity module
                        $scope.$on("activityComplete_" + activity.id, function (event, args) {
                            //update summary if received args
                            if ((typeof args !== "undefined") && (typeof args.summary !== "undefined") &&
                                (typeof args.summary.correct_count !== "undefined")) {
                                lessonUserdata.summary.correct_count = args.summary.correct_count;
                                lessonUserdata.summary.correct_percent = args.summary.correct_percent;
                            }

                            //operate jump logic
                            if (index != lessonData.activities.length - 1) {
                                //check if the listener receives jump args
                                if ((typeof args !== "undefined") && (typeof args.activity !== "undefined")) {
                                    lessonUserdata.current_activity = args.activity;
                                    if (args.should_transition) {
                                        continueLesson(lessonData.id, args.activity);
                                    }
                                } else {
                                    lessonUserdata.current_activity = lessonData.activities[index + 1].id;
                                    if (args.should_transition) {
                                        continueLesson(lessonData.id, lessonData.activities[index + 1].id);
                                    }
                                }

                                //userdata analyzing completed, flush the current userdata
                                lessonSandbox.flushUserdata(lessonData.id);
                            } else {
                                //set the current_activity to undefined so that the back button can operate as intended
                                lessonUserdata.current_activity = undefined;

                                if (args.should_transition) {
                                    //check if the student has completed the condition to complete the lesson
                                    if ((typeof lessonUserdata.summary.correct_percent == "undefined")) {
                                        lessonUserdata.summary.correct_percent = 100;
                                        lessonUserdata.is_complete = true;
                                    } else {
                                        if (typeof lessonData.pass_score != "undefined") {
                                            if (lessonSandbox.parseCompleteCondition(lessonData.pass_score, lessonUserdata.summary)) {
                                                lessonUserdata.is_complete = true;
                                            }
                                        } else {
                                            lessonUserdata.is_complete = true;
                                        }
                                    }

                                    //give student star if qualified
                                    if (typeof lessonUserdata.summary.correct_percent != "undefined") {
                                        if (lessonUserdata.summary.correct_percent >= lessonData.star3) {
                                            lessonUserdata.summary.star = 3;
                                        } else if (lessonUserdata.summary.correct_percent >= lessonData.star2) {
                                            lessonUserdata.summary.star = 2;
                                        } else if (lessonUserdata.summary.correct_percent >= lessonData.star1) {
                                            lessonUserdata.summary.star = 1;
                                        }
                                    }
                                    //give award videos and badges if qualified
                                    if ((lessonUserdata.is_complete) && (typeof lessonData.achievements != "undefined")) {
                                        for (var i = 0; i < lessonData.achievements.length; i++) {
                                            //award video logic
                                            if (lessonData.achievements[i].type == "award") {
                                                //check if the student has already got the award video
                                                if (typeof userinfoData.achievements.awards[lessonData.achievements[i].id] == "undefined") {
                                                    //parse the award condition
                                                    if ((typeof lessonUserdata.summary.correct_count == "undefined") ?
                                                        (lessonSandbox.conditionParser(lessonData.achievements[i].condition, Infinity, 100)) :
                                                        (lessonSandbox.conditionParser(lessonData.achievements[i].condition,
                                                            lessonUserdata.summary.correct_count, lessonUserdata.summary.correct_percent))) {
                                                        lessonSandbox.addAchievements("awards", lessonData.achievements[i].id, Date.now());
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    //send an event to check the global badges
                                    lessonSandbox.sendEvent("lesson.complete", $scope);
                                    //userdata analyzing completed, flush the current userdata
                                    lessonSandbox.flushUserdata(lessonData.id);
                                    console.log(lessonUserdata);
                                    FSM.back();
                                }
                            }
                        })
                    })
                })
            }
        }
    })

    //review template which belongs to lesson view
    .directive("review", function () {
        return {
            restrict: "E",
            templateUrl: 'partials/_showAllActivities.html'
        };
    })


    //activity module
    .directive("activity", function (SandboxProvider, $routeParams, $compile) {

        //create the activity sandbox
        var activitySandbox = SandboxProvider.getSandbox();

        return {
            restrict: "E",
            link: function ($scope, $element) {
                var activityUserdata = activitySandbox.getActivityUserdata($routeParams.aid);
                var activityData = activitySandbox.getActivityMaterial($routeParams.aid, activityUserdata.seed);
                var userinfoData = activitySandbox.getUserInfo();

                $scope.title = activityData.title;
                var multimediaBody = "<div>" + activityData.body + "</div>";
                $scope.body = $compile(multimediaBody)($scope);
                //init math formula parser queue
                $scope.mathVisible = false;
                MathJax.Hub.Queue(function () {
                    $scope.mathVisible = true;
                });
                $scope.activityId = activityData.id;
                //find the previous problem which the student has entered
                if (activityData.type === 'quiz') {
                    var currProblem = 0;
                    for (var i = 0; i < activityData.problems.length; i++) {
                        if ((activityUserdata.current_problem != "undefined") &&
                            (activityUserdata.current_problem == activityData.problems[i].id)) {
                            currProblem = i;
                            break;
                        }
                    }
                    $scope.problems = activityData.problems.slice(currProblem);
                    $scope.problemIndex = currProblem;
                    //update the progress bar
                    $scope.progressWidth = (currProblem + 1) * 100 / activityData.problems.length;
                }

                //record the activity start time for analysis
                $scope.$on("activityStart", function (event) {
                    activityUserdata.start_time = Date.now();
                })
                $scope.pauseLearn = function () {
                    //send pause activity event to lesson directive
                    activitySandbox.sendEvent("pauseActivity", $scope);
                }

                //check if the activity has been previously completed. If yes, reset the activityUserdata
                if ((typeof activityUserdata.is_complete != "undefined") && (activityUserdata.is_complete)) {
                    activityUserdata = activitySandbox.resetUserdata("activity", activityData.id);
                }

                if (activityData.type === "quiz") {
                    //record the activity start time for analysis
                    activityUserdata.start_time = Date.now();
                    //hide the activity continue button
                    //only wait for receiving the problem complete event
                    $scope.hideContinueButton = true;

                    //iterate all the problems and add listeners
                    angular.forEach(activityData.problems, function (problem, index) {

                        //listen to the complete event sent by a problem
                        $scope.$on("problemComplete_" + problem.id, function (event, args) {
                            //some userdata logic
                            if (index != activityData.problems.length - 1) {
                                activityUserdata.current_problem = activityData.problems[index + 1].id;
                            } else {
                                //destroy the current_problem attribute for later reviewing
                                activityUserdata.current_problem = undefined;
                                //set the current activity to complete so that if the student goes back to previous
                                //activity, this activity's userdata can be removed
                                activityUserdata.is_complete = true;

                                //record the duration the student spends to finish the activity
                                var stopTime = Date.now();
                                var duration = stopTime - activityUserdata.start_time;
                                if (typeof activityUserdata.duration == "undefined") {
                                    activityUserdata.end_time = stopTime;
                                    activityUserdata.duration = duration;
                                }

                                //count the correct answer and update UserdataProvider
                                var correctCount = 0;
                                for (var k = 0; k < activityData.problems.length; k++) {
                                    if (activityUserdata.problems[activityData.problems[k].id].is_correct) {
                                        correctCount++;
                                    }
                                }
                                activityUserdata.summary['correct_count'] = correctCount;
                                activityUserdata.summary['correct_percent'] = parseInt(correctCount * 100 / activityData.problems.length);
                                //if the activity is final quiz, save the userdata to lessonSummary object
                                var lessonSummary = {};
                                if ((typeof activityData.is_final !== "undefined") && (activityData.is_final)) {
                                    lessonSummary.correct_count = correctCount;
                                    lessonSummary.correct_percent = parseInt(correctCount * 100 / activityData.problems.length);
                                }

                                //achievements checking
                                if (typeof activityData.achievements != "undefined") {
                                    var userDataToGrade = {
                                        correct_count: activityUserdata.summary.correct_count,
                                        correct_percent: activityUserdata.summary.correct_percent,
                                        duration: activityUserdata.duration
                                    };
                                    for (var i = 0; i < activityData.achievements.length; i++) {
                                        //check if the student has already got this achievement
                                        if (typeof userinfoData.achievements.badges[activityData.achievements[i].id] == "undefined") {
                                            //create the custon grader using the grader template
                                            if (typeof activityData.achievements[i].condition != "undefined") {
                                                var grader = activitySandbox.getGrader(activityData.achievements[i].id,
                                                    activityData.achievements[i].condition);
                                            } else {
                                                var grader = activitySandbox.getGrader(activityData.achievements[i].id, "");
                                            }

                                            //apply the userdata using the created grader
                                            if (activitySandbox.createGrader(grader, userDataToGrade)) {
                                                //write the new badge in userinfo
                                                activitySandbox.addAchievements("badges", activityData.achievements[i].id);
                                            }
                                        }
                                    }
                                }
                            }

                            if (args.should_transition) {
                                //check if the activity has a jump attribute and has reached the final problem
                                if (index == activityData.problems.length - 1) {
                                    //check if the activity need show the quiz result
                                    if ((typeof activityData.show_summary == "undefined") || (!activityData.show_summary) ||
                                        ((activityData.show_summary) && ($scope.showQuizSummary))) {

                                        activitySandbox.completeQuizActivity(activityData, $scope, correctCount, lessonSummary);

                                    } else if ((typeof activityData.show_summary != "undefined") && (activityData.show_summary)) {
                                        //tell the lesson module to update the current_activity attribute
                                        activitySandbox.completeQuizActivity(activityData, $scope, correctCount, lessonSummary);

                                        $scope.showQuizSummary = true;
                                        $scope.hideContinueButton = true;
                                        $scope.quizCorrectCount = correctCount;
                                        $scope.quizCorrectPercent = parseInt(correctCount * 100 / activityData.problems.length) + "%";
                                        $scope.nextActivity = function () {
                                            activitySandbox.completeQuizActivity(activityData, $scope, correctCount, lessonSummary);
                                        }
                                    }
                                } else {
                                    //do a page transition and show the next problem
                                    PageTransitions.nextPage(10, $("#buttonContainer"));
                                    //update the progress bar
                                    $scope.progressWidth = (index + 2) * 100 / activityData.problems.length;
                                }
                            } else {
                                //if the activity both shows snawers and shows summary, apply the same logic of the
                                // summary "back" button to the last problem's back button after showing explanations
                                if (index == activityData.problems.length - 1) {
                                    activitySandbox.completeQuizActivity(activityData, $scope, correctCount, lessonSummary);
                                }
                            }
                        });
                    })

                    //if the activity is a lecture
                } else {
                    //show lecture
                    $scope.lecture = true;
                    //record the activity start time for analysis
                    activityUserdata.start_time = Date.now();
                    //show the activity continue button
                    //and wait for this button to be clicked
                    $scope.continueActivity = function () {
                        //record the activity stop time for analysis
                        activityUserdata.end_time = Date.now();
                        //set is_complete to true for later reviewing
                        activityUserdata.is_complete = true;

                        activitySandbox.playSoundEffects("sound-effects/click.wav");
                        //check if the student achieves certain achievements
                        if (typeof activityData.achievements != "undefined") {
                            for (var i = 0; i < activityData.achievements.length; i++) {
                                //check if the student has already got this achievement
                                if (typeof userinfoData.achievements.badges[activityData.achievements[i].id] == "undefined") {
                                    //create the custon grader using the grader template
                                    if (typeof activityData.achievements[i].condition != "undefined") {
                                        var grader = activitySandbox.getGrader(activityData.achievements[i].id,
                                            activityData.achievements[i].condition);
                                    } else {
                                        var grader = activitySandbox.getGrader(activityData.achievements[i].id, "");
                                    }

                                    //apply the userdata using the created grader
                                    if (activitySandbox.createGrader(grader, "")) {
                                        //write the new badge in userinfo
                                        activitySandbox.addAchievements("badges", activityData.achievements[i].id, Date.now());
                                    }
                                }
                            }
                        }

                        if (typeof activityData.jump !== "undefined") {
                            var jump = activityData.jump.split(':');
                            if (jump[0] === 'force_to_activity') {
                                activitySandbox.sendEvent("activityComplete_" + activityData.id, $scope, {activity: jump[1], should_transition: true});
                            }
                        } else {
                            //send activity complete event to lesson directive
                            activitySandbox.sendEvent("activityComplete_" + activityData.id, $scope, {should_transition: true});
                        }
                    }
                }
            }
        }
    })

/**
 * multimedia directives
 * <video></video> -> <vid>
 * <audio></audio> -> <music>
 * pdf loading -> <pdf>
 */
    .directive("vid", function (APIProvider, $compile, $routeParams) {
        //enter fullscreen mode
        var toFullScreen = function (video) {
            //先全屏
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.mozRequestFullScreen) {
                video.mozRequestFullScreen(); // Firefox
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen(); // Chrome and Safari
            }
        }

        //exit fullscreen mode
        var exitFullScreen = function () {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
            else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
        }

        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<video id='video' style='width:500px;' src='" + APIProvider.getAPI("getFileResources", $routeParams.lid, "")
                    + $attrs.src + "' controls></video>" +
                    "<button ng-click='playVideo()'>{{ playButtonMsg }}</button>";
                $element.html(template);
                $compile($element.contents())($scope);

                var start = false;
                var currentTime = 0;
                //get video element and control bar elements
                var video = $element.contents()[0];
                /*var muteButton = document.getElementById("mute");
                 var seekBar = document.getElementById("seek-bar");
                 var volumeBar = document.getElementById("volume-bar");*/

                // 在play上添加播放/暂停按钮
                $scope.playButtonMsg = "播 放";
                $scope.playVideo = function () {
                    if (video.paused == true) {
                        //send the activityStart event to activity to record the start_time
                        $scope.$emit("activityStart");

                        if (!start) {//第一次进来
                            toFullScreen(video);
                            video.play();
                            $scope.playButtonMsg = "暂 停";

                            start = true;
                        } else {
                            video.src = video.currentSrc;
                            video.load();

                            toFullScreen(video);
                            video.play();

                            $scope.playButtonMsg = "暂 停";
                        }
                    } else {
                        video.pause();
                        $scope.playButtonMsg = "播 放";
                    }
                };

                video.addEventListener("webkitfullscreenchange", function () {
                    console.log("响应！" + "wekit:" + document.webkitIsFullScreen);
                    if (!document.webkitIsFullScreen) {
                        //退出全屏了
                        currentTime = video.currentTime;
                        console.log("退出：" + currentTime);
                        video.pause();
                        $scope.playButtonMsg = "播 放";
                    }
                });

                video.addEventListener("canplay", function () {
                    video.currentTime = currentTime;
                    console.log("start=" + start + "  进来: " + video.currentTime + "cut=" + currentTime);
                });
            }
        }
    })

    .directive("music", function (APIProvider, $compile, $routeParams) {
        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<audio style='width:500px;' src='" + APIProvider.getAPI("getFileResources", $routeParams.lid, "")
                    + $attrs.src + "' controls></audio>";
                $element.html(template);
                $compile($element.contents())($scope);
            }
        }
    })

    .directive("jpg", function (APIProvider, $compile, $routeParams) {
        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<img style='width:300px;' src='" + APIProvider.getAPI("getFileResources", $routeParams.lid, "")
                    + $attrs.src + " />";
                $element.html(template);
                $compile($element.contents())($scope);
            }
        }
    })

    .directive("pdf", function (APIProvider, $compile, $routeParams) {
        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<div id='container'><canvas id='the-canvas' border='1px solid black'></canvas>" +
                    "</div><button ng-click='goPrevious()'>上一页</button>" +
                    "<button ng-click='goNext()'>下一页</button>" +
                    "<button ng-click='fullscreen()'>全屏模式</button>";
                $element.html(template);
                $compile($element.contents())($scope);

                //send the activityStart event to activity to record the start_time
                $scope.$emit("activityStart");

                PDFJS.disableWorker = true;
                var pdfDoc = null,
                    pageNum = 1,
                    scale = 0.8,
                    canvas = $element.contents()[0].children[0],
                    ctx = canvas.getContext('2d');

                // Get page info from document, resize canvas accordingly, and render page
                function renderPage(num) {
                    // Using promise to fetch the page
                    pdfDoc.getPage(num).then(function (page) {
                        var viewport = page.getViewport(scale);
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        // Render PDF page into canvas context
                        var renderContext = {
                            canvasContext: ctx,
                            viewport: viewport
                        };
                        page.render(renderContext);
                    });

                    // Update page counters
                    //document.getElementById('page_num').textContent = pageNum;
                    //document.getElementById('page_count').textContent = pdfDoc.numPages;
                }

                // Go to previous page
                $scope.goPrevious = function () {
                    if (pageNum <= 1)
                        return;
                    pageNum--;
                    renderPage(pageNum);
                }
                // Go to next page
                $scope.goNext = function () {
                    if (pageNum >= pdfDoc.numPages)
                        return;
                    pageNum++;
                    renderPage(pageNum);
                }
                // Become fullcreen reading
                $scope.fullscreen = function () {
                    var container = $element.contents()[0];
                    scale = 'pafe-fit';
                    container.webkitRequestFullScreen();
                }

                // Asynchronously download PDF as an ArrayBuffer
                PDFJS.getDocument(APIProvider.getAPI("getFileResources", $routeParams.lid, "") + $attrs.src).
                    then(function (_pdfDoc) {
                        pdfDoc = _pdfDoc;
                        renderPage(pageNum);
                    });
            }
        }
    })

    //the outsider of problem directive used for getting the problem DOM collection
    .
    directive("switch", function ($timeout) {
        return {
            link: function ($scope, $element) {
                $timeout(function () {
                    PageTransitions.initParams($element);
                }, 0);
            }
        }
    })

    //problem module
    .directive("problem", function (SandboxProvider, $compile, $http, $templateCache) {

        //create the problem sandbox
        var problemSandbox = SandboxProvider.getSandbox();


        return {
            restrict: "E",
            link: function ($scope, $element) {
                var currProblem = $scope.problem;
                var problemUserdata = problemSandbox.getUserdata(currProblem.id);
                var parentActivityData = problemSandbox.getParentActivityData(currProblem.parent_id);

                //render dynamic templateUrl
                var templateUrl = 'partials/choiceTemplates/_' + currProblem.type + 'Template.html';
                $http.get(templateUrl, {cache: $templateCache}).success(function (contents) {
                    $element.html(contents);
                    $compile($element.contents())($scope);
                });

                //record the enter time for later analysis
                problemUserdata.enter_time = Date.now();

                //init ng-models
                $scope.answer = {};
                $scope.submitIcon = "submitDisable";
                //disable choices after submitted
                if (problemUserdata.answer.length > 0) {
                    $scope.submitted = true;
                }
                if ((typeof parentActivityData.show_answer !== "undefined") && (parentActivityData.show_answer)) {
                    if (currProblem.type != "singlefilling") {
                        $scope.correct_answers = [];
                        for (var i = 0; i < currProblem.choices.length; i++) {
                            if (currProblem.choices[i].is_correct) {
                                $scope.correct_answers.push(String.fromCharCode(65 + i));
                            }
                        }
                        $scope.correct_answers = $scope.correct_answers.join(",");
                    } else {
                        $scope.correct_answers = currProblem.correct_answer;
                    }
                    $scope.explanation = currProblem.explanation;
                }
                if (typeof currProblem.hint !== "undefined") {
                    problemUserdata.is_hint_checked = false;
                    $scope.hint = currProblem.hint;
                    $scope.showHintButton = true;
                    $scope.showHint = function () {
                        $scope.showHintBox = true;
                        //record if the student looks up the hint or not
                        problemUserdata.is_hint_checked = true;
                    }
                }
                //rendering specific layout
                if ((typeof currProblem.layout != "undefined") && (currProblem.layout == "card")) {
                    $scope.layout = "card";
                    $scope.colNum = "6";
                } else {
                    $scope.layout = "list";
                    $scope.colNum = "12";
                }
                if (currProblem.type == "singlechoice") {
                    $scope.type = "单选题";
                } else if (currProblem.type == "multichoice") {
                    $scope.type = "多选题";
                } else {
                    $scope.type = "单填空题";
                }
                //compile multimedia resources
                var multimediaBody = "<div>" + currProblem.body + "</div>";
                $scope.body = $compile(multimediaBody)($scope);
                if (currProblem.type != "singlefilling") {
                    $scope.choiceBody = {};
                    for (var i = 0; i < currProblem.choices.length; i++) {
                        var choiceMultimediaBody = "<div>" + currProblem.choices[i].body + "</div>";
                        $scope.choiceBody[currProblem.choices[i].id] = $compile(choiceMultimediaBody)($scope);
                    }
                }

                //apply choosing logic
                if (currProblem.type != "singlefilling") {
                    $scope.checked = [];
                    for (var i = 0; i < currProblem.choices.length; i++) {
                        $scope.checked.push("default");
                    }

                    //some logic after student choose an option
                    $scope.lastChecked = -1;
                    var singleChoice = function (choiceId, choiceIndex) {
                        if (!$scope.submitted) {
                            //change submit icon
                            $scope.submitIcon = "submit";
                            if ($scope.lastChecked != -1) {
                                $scope.checked[$scope.lastChecked] = "default";
                            }
                            $scope.checked[choiceIndex] = "choose";
                            $scope.lastChecked = choiceIndex;
                            $scope.answer[currProblem.id] = choiceId;
                        }
                    };

                    $scope.chosenNum = 0;
                    var multiChoice = function (choiceId, choiceIndex) {
                        if (!$scope.submitted) {
                            //change submit icon
                            $scope.submitIcon = "submit";
                            if ($scope.checked[choiceIndex] == "choose") {
                                $scope.checked[choiceIndex] = "default";
                                $scope.answer[choiceId] = false;
                                $scope.chosenNum--;
                            } else {
                                $scope.checked[choiceIndex] = "choose";
                                $scope.answer[choiceId] = true;
                                $scope.chosenNum++;
                            }

                            if ($scope.chosenNum == 0) {
                                $scope.submitIcon = "submitDisable";
                            }
                        }
                    };

                    if (currProblem.type == "singlechoice") {
                        $scope.chooseOption = singleChoice;
                    } else if (currProblem.type == "multichoice") {
                        $scope.chooseOption = multiChoice;
                    } else if (currProblem.type == "singlefilling") {
                        console.log("hit");

                    }

                } else {
                    var singleFilling = function (answer) {
                        if ((typeof answer != "undefined") && (answer.length > 0)) {
                            $scope.submitIcon = "submit";
                        } else {
                            $scope.submitIcon = "submitDisable";
                        }
                    }
                    $scope.writeAnswer = singleFilling;
                }

                //when the student complete the problem
                $scope.submitAnswer = function () {
                    //record the submit time for later analysis
                    problemUserdata.submit_time = Date.now();
                    //disable the choices inputs
                    $scope.submitted = true;

                    if ($scope.answer !== null) {
                        //multi-choice question grader
                        if (currProblem.type === "multichoice") {
                            problemUserdata.is_correct = problemSandbox.problemGrader(currProblem, $scope.answer);
                            for (var i = 0; i < currProblem.choices.length; i++) {
                                if ((typeof $scope.answer[currProblem.choices[i].id] !== "undefined") &&
                                    ($scope.answer[currProblem.choices[i].id])) {
                                    problemUserdata.answer.push(currProblem.choices[i].id);
                                }
                            }
                            //single choice & single filling questions grader
                        } else {
                            if (typeof $scope.answer[currProblem.id] !== "undefined") {
                                problemUserdata.is_correct = problemSandbox.problemGrader(currProblem, $scope.answer);
                                problemUserdata.answer.push($scope.answer[currProblem.id]);
                            }
                        }
                    }

                    if ((typeof parentActivityData.show_answer !== "undefined") && (parentActivityData.show_answer)) {
                        $scope.showExplanation = true;
                        $scope.hideSubmitButton = true;
                        $scope.showContinueButton = true;

                        //show the correct and wrong answer
                        if (currProblem.type != "singlefilling") {
                            for (var i = 0; i < currProblem.choices.length; i++) {
                                if (currProblem.choices[i].is_correct) {
                                    $scope.checked[i] = "correct";
                                } else if (((currProblem.type == "singlechoice") &&
                                    ($scope.answer[currProblem.id] == currProblem.choices[i].id)) ||
                                    ((currProblem.type == "multichoice") &&
                                        ($scope.answer[currProblem.choices[i].id]))) {
                                    $scope.checked[i] = "wrong";
                                }
                            }
                        } else {
                            if (problemUserdata.is_correct) {
                                $scope.problemResult = "success";
                            } else {
                                $scope.problemResult = "error";
                            }
                        }

                        //problemSandbox.sendEvent("showAnswerBeforeContinue", $scope);
                        problemSandbox.sendEvent('problemComplete_' + currProblem.id, $scope, {should_transition: false});
                    } else {
                        //send problem complete event to activity directive
                        problemSandbox.sendEvent('problemComplete_' + currProblem.id, $scope, {should_transition: true});
                    }
                }

                //continue button if show_answer=true
                $scope.continueProblem = function () {
                    //send problem complete event to activity directive
                    problemSandbox.sendEvent('problemComplete_' + currProblem.id, $scope, {should_transition: true});
                }
            }
        }
    })

    .directive("achievements", function (SandboxProvider, $q) {

        var achievementSandbox = SandboxProvider.getSandbox();

        return {
            restrict: "E",
            link: function ($scope) {
                var achievementsJsonPromise = achievementSandbox.getAchievementsMaterial();
                achievementsJsonPromise.then(function (data) {
                    var achievementsPool = data;
                    var ts = achievementsPool.ts;

                    var resourcesPromise = achievementSandbox.loadAchievementsResources(ts);
                    resourcesPromise.then(function (msg) {
                        console.log(msg);
                    }, function (err) {
                        console.log(err);
                    }, function (progressData) {
                        $scope.progress = progressData;
                    })

                    var achievementsResourcePromise = $q.all([$scope.initResourcePromise, resourcesPromise])
                    achievementsResourcePromise.then(function () {
                        var userinfoData = achievementSandbox.getUserInfo();

                        //init ng-models
                        $scope.completeDownload = true;
                        $scope.badges = achievementsPool.badges;
                        $scope.awards = achievementsPool.awards;
                        $scope.hasBadge = {};
                        $scope.hasAward = {};
                        if (typeof userinfoData.achievements.badges != "null") {
                            for (var i = 0; i < $scope.badges.length; i++) {
                                $scope.hasBadge[$scope.badges[i].id] = (typeof userinfoData.achievements.
                                    badges[$scope.badges[i].id] != "undefined")
                            }
                        }
                        if (typeof userinfoData.achievements.awards != "null") {
                            for (i = 0; i < $scope.awards.length; i++) {
                                $scope.hasAward[$scope.awards[i].id] = (typeof userinfoData.achievements.
                                    awards[$scope.awards[i].id] != "undefined")
                            }
                        }
                    }, function (err) {
                        console.log("Error occurred while loading initial resources: " + err);
                    });

                }, function (err) {
                    console.log(err);
                })
            }
        }
    })



