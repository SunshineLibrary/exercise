/**
 * Created with JetBrains WebStorm.
 * Author: Zhenghan
 * Date: 13-8-1
 * Time: 下午9:26
 * To change this template use File | Settings | File Templates.
 */

angular.module('SunExerciseTest.directives', [])
	.directive("fastClick", function () {
		return function ($scope, $element, $attributes) {
			var tapped;
			tapped = false;
			$element.bind("click", function () {
				if (!tapped) {
					return $scope.$apply($attributes["fastClick"]);
				}
			});
			$element.bind("touchstart", function (event) {
				return tapped = true;
			});
			$element.bind("touchmove", function (event) {
				tapped = false;
				return event.stopImmediatePropagation();
			});
			return $element.bind("touchend", function () {
				if (tapped) {
					return $scope.$apply($attributes["fastClick"]);
				}
			});
		};
	})
	.directive("test", function (SandboxProvider) {

		var testSandbox = SandboxProvider.getSandbox();

		return {
			restrict: "E",
			link: function ($scope) {
				$scope.errors = [];

				$scope.check = function (id) {
					$scope.lessonId = id;
					$scope.checkLesson();
				};


				$scope.checkChapter = function () {
					$scope.errors = [];
					var lessonMap = {};
					var chapterData = testSandbox.getChapterMaterial($scope.chapterId);
					if (typeof chapterData == "undefined") {
						addError("object-not-found", "chapter", $scope.chapterId, "找不到该chapter");
						return;
					}
					$scope.chapterJSON = chapterData;
					$scope.lessons = chapterData.lessons;
					console.log("checking chapter," + JSON.stringify(chapterData));
					if (typeof chapterData.enter_lesson == "undefined" || chapterData.enter_lesson.length < 10) {
						addError("lack-component", "chapter", $scope.chapterId, "chapter(" + chapterData.enter_lesson + ")没有enter_lesson域");
					}
					for (var i = 0; i < chapterData.lessons.length; i++) {
						var lesson = chapterData.lessons[i];
						if (lesson.id == undefined) {
							addError("lack-component", "lesson", lesson.id, "lesson没有id");
							continue;
						}
						if ((typeof lesson.requirements == "undefined") ^ (typeof lesson.requirements == "undefined")) {
							addError("convert-error", "chapter", lesson.id, "lesson(" + lesson.title + ")的requirement转换失败");
						} else {
							if (lesson.requirements.length != lesson.requirement_titles.length) {
								addError("convert-error", "chapter", lesson.id, "lesson(" + lesson.title + ")的requirement转换失败，数量不一致");
							}
						}
						lessonMap[lesson.id] = lesson;
					}

					for (var j = 0; j < lesson.requirements.length; j++) {
						var r = lesson.requirements[j];
						if (typeof lessonMap[lesson.requirements[j]] == "undefined") {
							addError("lack-component", "lesson", lesson.id, "lesson的requirement不存在");
						}
						if (lesson.id == r) {
							addError("fatal", "lesson", lesson.id, "lesson的requirement不能是自己");
						}
					}

				};


				$scope.checkLesson = function () {
					$scope.errors = [];
					$scope.initResourcePromise.then(function (msg) {
						console.log(msg);
						var lessonMaterialPromise = testSandbox.getLessonMaterial($scope.lessonId);
						lessonMaterialPromise.then(function (lessonData) {
							$scope.lessonJSON = lessonData;
							for (var i = 0; i < lessonData.activities.length; i++) {
								if (lessonData.activities[i].type == "lecture" && typeof lessonData.activities[i].body == "undefined") {
									addError("lack-component", "activity", lessonData.activities[i].id, "lecture类型activity缺少body域");
								} else if (lessonData.activities[i].type == "quiz") {
									if (typeof lessonData.activities[i].problems == "undefined") {
										addError("lack-component", "activity", lessonData.activities[i].id, "quiz类型的activity缺少problems域");
									} else if (lessonData.activities[i].problems.length <= 0) {
										addError("lack-component", "activity", lessonData.activities[i].id, "quiz类型的activity problems域不能一道题都没有");
									} else if (typeof lessonData.activities[i].pool_count != "undefined" &&
										lessonData.activities[i].pool_count > lessonData.activities[i].problems.length) {
										addError("logic-err", "activity", lessonData.activities[i].id, "pool_count个数不能大于全部problems的个数");
									} else {
										for (var j = 0; j < lessonData.activities[i].problems.length; j++) {
											if ((typeof lessonData.activities[i].show_answer != "undefined") && (lessonData.activities[i].show_answer)) {
												if (typeof lessonData.activities[i].problems[j].explanation == "undefined") {
													addError("lack-component", "problem", lessonData.activities[i].problems[j].id, "显示答案的题目不能没有explanation域");
												} else if (lessonData.activities[i].problems[j].explanation == "") {
													addError("lack-component", "problem", lessonData.activities[i].problems[j].id, "显示答案的题explanation域最好不要为空");
												}
											}
											if (lessonData.activities[i].problems[j].type != "singlefilling") {
												if (typeof lessonData.activities[i].problems[j].choices == "undefined") {
													addError("lack-component", "problem", lessonData.activities[i].problems[j].id, "选择题不能没有choices域");
												} else if (lessonData.activities[i].problems[j].choices.length <= 0) {
													addError("lack-component", "problem", lessonData.activities[i].problems[j].id, "选择题不能一个choice都没有");
												} else {
													var correctNum = 0;
													for (var k = 0; k < lessonData.activities[i].problems[j].choices.length; k++) {
														if (typeof lessonData.activities[i].problems[j].choices[k].is_correct == "undefined") {
															addError("lack-component", "choice", lessonData.activities[i].problems[j].choices[k].id, "选择题选项不能没有is_correct域");
														} else if (lessonData.activities[i].problems[j].choices[k].is_correct) {
															correctNum++;
														}
													}
													if (correctNum == 0) {
														addError("logic-err", "problem", lessonData.activities[i].problems[j].id, "选择题不能没有正确选项");
													}
												}
											} else if (typeof lessonData.activities[i].problems[j].correct_answer == "undefined") {
												addError("lack-component", "problem", lessonData.activities[i].problems[j].id, "填空题不能没有correct_answer域");
											} else if (lessonData.activities[i].problems[j].correct_answer == "") {
												addError("lack-component", "problem", lessonData.activities[i].problems[j].id, "填空题correct_answer不能为空");
											}
										}
									}
								}

								if (typeof lessonData.activities[i].jump != "undefined") {
									if (Object.prototype.toString.call(lessonData.activities[i].jump) != '[object Array]') {
										addError("syntax-err", "activity", lessonData.activities[i].id, "activity的跳转域必须为数组");
									} else {
										for (var m = 0; m < lessonData.activities[i].jump.length; m++) {
											var jump = lessonData.activities[i].jump[m].split(':');
											if (jump[0] != "end_of_lesson_if_correctness") {
												for (var n = 0; n < lessonData.activities.length; n++) {
													if (jump[1] == lessonData.activities[n].id) {
														break;
													}
												}
												if (n >= lessonData.activities.length) {
													addError("logic-err", "activity", lessonData.activities[i].id, "jump逻辑的id必须存在");
												}
											}
										}
									}
								}
							}

							if (typeof lessonData.pass_score == "undefined") {
								addError("lack-component", "lesson", lessonData.id, "lesson不能没有pass_score及格线域");
							} else if (typeof lessonData.title == "undefined") {
								addError("lack-component", "lesson", lessonData.id, "lesson不能没有title域");
							} else if (typeof lessonData.summary == "undefined") {
								addError("lack-component", "lesson", lessonData.id, "lesson不能没有summary域");
							} else if (typeof lessonData.star1 == "undefined") {
								addError("lack-component", "lesson", lessonData.id, "lesson不能没有star1域");
							} else if (typeof lessonData.star2 == "undefined") {
								addError("lack-component", "lesson", lessonData.id, "lesson不能没有star2域");
							} else if (typeof lessonData.star3 == "undefined") {
								addError("lack-component", "lesson", lessonData.id, "lesson不能没有star3域");
							}
						})

					})

//					$scope.errors = lessonErrors;
				}

				var addError = function (type, scope, id, content) {
					$scope.errors.push({
						type: type,
						scope: scope,
						id: id,
						content: content
					})
				}
			}
		}
	}
)