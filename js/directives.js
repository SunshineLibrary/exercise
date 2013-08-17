/**
 * Created with JetBrains WebStorm.
 * User: Tony_Zhang
 * Date: 13-8-1
 * Time: 下午9:26
 * To change this template use File | Settings | File Templates.
 */

angular.module('LessonDemo.directives', [])

    .directive("subject", function (SandboxProvider, $routeParams, $location) {

        //create the subject sandbox
        var subjectSandbox = SandboxProvider.getSandbox();

        return {
            restrict: "E",
            link: function ($scope) {
                var rootMaterial = subjectSandbox.getRoot();
                var subjectMaterial = subjectSandbox.getSubjectMaterial($routeParams.sid);

                $scope.subjects = rootMaterial.subjects;
                $scope.chapters = subjectMaterial.chapters;
                $scope.enterSubject = function (subjectId) {
                    $location.path('/subject/' + subjectId);
                }
                $scope.enterChapter = function (chapterId) {
                    $location.path('/subject/' + $routeParams.sid + '/chapter/' + chapterId);
                }
            }
        }
    })

    .directive("chapter", function (SandboxProvider, $routeParams, $location) {

        //create the chapter sandbox
        var chapterSandbox = SandboxProvider.getSandbox();

        return {
            restrict: "E",
            link: function ($scope, $element) {
                var chapterDataPromise = chapterSandbox.getChapterMaterial($routeParams.cid);
                //var chapterUserdata = chapterSandbox.getChapterUserdata();

                chapterDataPromise.then(function (chapterData) {
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
                })

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

                //continue logic after both lessonMaterial and lessonUserdata have been loaded
                var lessonPromise = $q.all([lessonMaterialPromise, lessonUserdataPromise]);
                lessonPromise.then(function () {
                    var lessonData = lessonTotalData.material;
                    var lessonUserdata = lessonTotalData.userdata;

                    //initialize ng-models
                    $scope.title = lessonData.title;
                    $scope.summary = lessonData.summary;
                    $scope.activities = lessonData.activities;
                    if (lessonUserdata.is_complete) {
                        $scope.showResult = true;
                        $scope.lessonResultCount = lessonUserdata.summary.correctCount;
                        $scope.lessonResultPercent = lessonUserdata.summary.correctPercent;
                        if (typeof lessonUserdata.summary.star != "undefined") {
                            $scope.hasStar = true;
                            $scope.lessonStar = (lessonUserdata.summary.star == 1) ? "金牌" :
                                ((lessonUserdata.summary.star == 2) ? "银牌" :
                                    ((lessonUserdata.summary == 3) ? "铜牌" : null));
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
                    //listen to the endOfListen event to end the lesson
                    $scope.$on("endOfLesson", function (event, args) {
                        if ((typeof args !== "undefined") && (typeof args.summary !== "undefined") &&
                            (typeof args.summary.correctCount !== "undefined")) {
                            lessonUserdata.summary.correctCount = args.summary.correctCount;
                            lessonUserdata.summary.correctPercent = args.summary.correctPercent;
                        }
                        //return to the lesson page;
                        lessonUserdata.current_activity = undefined;
                        //check if the student has completed the condition to complete the lesson
                        if ((typeof lessonUserdata.summary.correctPercent == "undefined")) {
                            lessonUserdata.summary.correctPercent = 100;
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
                            //give student badges if qualified
                            if (typeof lessonUserdata.summary.correctPercent != "undefined") {
                                if (lessonUserdata.summary.correctPercent >= lessonData.star1) {
                                    lessonUserdata.summary.star = 1;
                                } else if (lessonUserdata.summary.correctPercent >= lessonData.star2) {
                                    lessonUserdata.summary.star = 2;
                                } else if (lessonUserdata.summary.correctPercent >= lessonData.star3) {
                                    lessonUserdata.summary.star = 3;
                                }
                            }

                            FSM.back();
                        }
                    })

                    //iterate all the activities and add listeners
                    angular.forEach(lessonData.activities, function (activity, index) {

                        //listen to the complete event sent by an activity module
                        $scope.$on("activityComplete_" + activity.id, function (event, args) {
                            //update summary if received args
                            if ((typeof args !== "undefined") && (typeof args.summary !== "undefined") &&
                                (typeof args.summary.correctCount !== "undefined")) {
                                lessonUserdata.summary.correctCount = args.summary.correctCount;
                                lessonUserdata.summary.correctPercent = args.summary.correctPercent;
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
                            } else {
                                //return to the lesson page;
                                lessonUserdata.current_activity = undefined;
                                //check if the student has completed the condition to complete the lesson
                                if ((typeof lessonUserdata.summary.correctPercent == "undefined")) {
                                    lessonUserdata.summary.correctPercent = 100;
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

                                //give student badges if qualified
                                if (typeof lessonUserdata.summary.correctPercent != "undefined") {
                                    if (lessonUserdata.summary.correctPercent >= lessonData.star1) {
                                        lessonUserdata.summary.star = 1;
                                    } else if (lessonUserdata.summary.correctPercent >= lessonData.star2) {
                                        lessonUserdata.summary.star = 2;
                                    } else if (lessonUserdata.summary.correctPercent >= lessonData.star3) {
                                        lessonUserdata.summary.star = 3;
                                    }
                                }

                                if (args.should_transition) {
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
                var userInfo = activitySandbox.getUserInfo();

                var startTime = Date.now();

                $scope.title = activityData.title;
                var multimediaBody = "<div>" + activityData.body + "</div>";
                $scope.body = $compile(multimediaBody)($scope);
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
                    //update the progress bar
                    $scope.progressWidth = (currProblem + 1) * 100 / activityData.problems.length;
                }

                $scope.pauseLearn = function () {
                    //send pause activity event to lesson directive
                    activitySandbox.sendEvent("pauseActivity", $scope);
                }

                //check if the activity has been previously completed. If yes, reset the activityUserdata
                if ((typeof activityUserdata.is_complete != "undefined") && (activityUserdata.is_complete)) {
                    activityUserdata = activitySandbox.resetUserdata("activity", activityData.id);
                }

                if (activityData.type === "quiz") {

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
                                var duration = stopTime - startTime;
                                if (typeof activityUserdata.duration == "undefined") {
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
                                    lessonSummary.correctCount = correctCount;
                                    lessonSummary.correctPercent = parseInt(correctCount * 100 / activityData.problems.length);
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
                                        if (typeof userInfo.achievements[activityData.achievements[i].id] == "undefined") {
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
                                                userInfo.achievements[activityData.achievements[i].id] = {
                                                    id: activityData.achievements[i].id
                                                }
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
                                    console.log
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
                    //show the activity continue button
                    //and wait for this button to be clicked
                    $scope.continueActivity = function () {
                        //check if the student achieves certain achievements
                        if (typeof activityData.achievements != "undefined") {
                            for (var i = 0; i < activityData.achievements.length; i++) {
                                //check if the student has already got this achievement
                                if (typeof userInfo.achievements[activityData.achievements[i].id] == "undefined") {
                                    //create the custon grader using the grader template
                                    if (typeof activityData.achievements[i].condition != "undefined") {
                                        var grader = activitySandbox.getGrader(activityData.achievements[i].id,
                                            activityData.achievements[i].condition);
                                    } else {
                                        var grader = activitySandbox.getGrader(activityData.achievements[i].id, "");
                                    }

                                    //apply the userdata using the created grader
                                    if (activitySandbox.createGrader(grader, "")) {
                                        //write the new badge in
                                        userInfo.achievements[activityData.achievements[i].id] = {
                                            id: activityData.achievements[i].id
                                        }
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

    .directive("vid", function ($compile, $routeParams, $route) {
        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<video id='video' style='width:500px;' src='http://192.168.3.100:3000/exercise/v1/lesson/" + $routeParams.lid + "/"
                    + $attrs.src + "' controls></video>" +
                    "<button ng-click='playVideo()'>播放视频</button>";
                $element.html(template);
                $compile($element.contents())($scope);

                //when click the button, the video becomes full-screen and play
                var video = $element.contents()[0];
                $scope.playVideo = function () {
                    video.webkitRequestFullScreen();
                    video.play();
                }
                //ensure that when the student returns to the lecture page from full-screen mode,
                //the page is reloaded
                video.addEventListener('webkitfullscreenchange', function () {
                    if (!document.webkitIsFullScreen) {
                        //TODO
                        //console.log("A");
                        $route.reload();
                    }
                }, true);

            }
        }
    })

    .directive("music", function ($compile, $routeParams) {
        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<audio style='width:500px;' src='http://192.168.3.100:3000/exercise/v1/lesson/" + $routeParams.lid + "/"
                    + $attrs.src + "' controls></audio>";
                $element.html(template);
                $compile($element.contents())($scope);
            }
        }
    })

    .directive("jpg", function ($compile, $routeParams) {
        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<img style='width:300px;' src='http://192.168.3.100:3000/exercise/v1/lesson/" + $routeParams.lid + "/"
                    + $attrs.src + " />";
                $element.html(template);
                $compile($element.contents())($scope);
            }
        }
    })

    .directive("pdf", function ($compile) {
        return {
            restrict: "E",
            link: function ($scope, $element, $attrs) {
                var template = "<div id='container'><canvas id='the-canvas' border='1px solid black'></canvas>" +
                    "</div><button ng-click='goPrevious()'>上一页</button>" +
                    "<button ng-click='goNext()'>下一页</button>" +
                    "<button ng-click='fullscreen()'>全屏模式</button>";
                $element.html(template);
                $compile($element.contents())($scope);

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
                PDFJS.getDocument('data/' + $attrs.src).then(function (_pdfDoc) {
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

                //init ng-models
                $scope.answer = {};
                if (problemUserdata.answer.length > 0) {
                    $scope.submitted = true;
                }
                if ((typeof parentActivityData.show_answer !== "undefined") && (parentActivityData.show_answer)) {
                    $scope.explanation = currProblem.explanation;
                }
                if (typeof currProblem.hint !== "undefined") {
                    $scope.hint = currProblem.hint;
                    $scope.showHintButton = true;
                    $scope.showHint = function () {
                        $scope.showHintBox = true;
                    }
                }

                //apply choosing logic
                $scope.checked = [];
                for (var i = 0; i < currProblem.choices.length; i++) {
                    $scope.checked.push("default");
                }

                $scope.lastChecked = -1;
                var singleChoice = function (choiceId, choiceIndex) {
                    if (!$scope.submitted) {
                        if ($scope.lastChecked != -1) {
                            $scope.checked[$scope.lastChecked] = "default";
                        }
                        $scope.checked[choiceIndex] = "choose";
                        $scope.lastChecked = choiceIndex;
                        $scope.answer[currProblem.id] = choiceId;
                    }
                };

                var multiChoice = function (choiceId, choiceIndex) {
                    if (!$scope.submitted) {
                        if ($scope.checked[choiceIndex] == "choose") {
                            $scope.checked[choiceIndex] = "default";
                            $scope.answer[choiceId] = false;
                        } else {
                            $scope.checked[choiceIndex] = "choose";
                            $scope.answer[choiceId] = true;
                        }
                    }
                };

                if (currProblem.type == "singlechoice") {
                    $scope.chooseOption = singleChoice;
                } else if (currProblem.type == "multichoice") {
                    $scope.chooseOption = multiChoice;
                } else {

                }

                //when the student complete the problem
                $scope.submitAnswer = function () {
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



