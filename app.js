/*
 This is a mock and test server for turtle-server
 */
var express = require('express');
var fs = require('fs');
var request = require('request');
var app = express.createServer();

//var SERVER_IP = (typeof process.env['SERVER_IP'] == "undefined") ? "http://shuwu.sunshine-library.org" : process.env['SERVER_IP'];
var SERVER_IP = (typeof process.env['SERVER_IP'] == "undefined") ? "http://192.168.3.100" : process.env['SERVER_IP'];
var PROD_USER_DATA_MODE = (typeof process.env['PROD_USER_DATA'] != "undefined");

console.log("use `SERVER_IP='http://shuwu.sunshine-library.org' node app.js` to start a server with specified server");
console.log("use `PROD_USER_DATA=true node app.js` to start a server sending user_data to server");
console.log("SERVER_IP\t\t" + SERVER_IP);
console.log("PROD_USERDATA_MODE\t" + PROD_USER_DATA_MODE);

app.use(app.router);
app.use(express.methodOverride());
app.use(express.bodyParser());

// Access token for test
request = request.defaults({'headers': {"Access-Token": "0c906ba0167db96f1fa211fccf4decbcb43e5a102d6c34f19e6b472c72718a59"}})

// Develop LocalApp (files in exercise/), use /app/exercise/index.html or /app/exercise/bootstrap
// Test shuwu server (files on server), use /web_apps/exercise
// Entry points
app.get('/web_apps/exercise', function (req, res) {
	console.log("shuwu entry");
	request.get(
		{url: "http://shuwu.sunshine-library.org" + req.originalUrl, followRedirect: false},
		function (e, r) {
			var redirect = r.headers["location"].slice("http://shuwu.sunshine-library.org".length);
			console.log("Redirect," + redirect);
			res.redirect(redirect);
		});
});
app.get('/app/exercise/bootstrap', function (req, res) {
	res.redirect("/app/exercise/index.html");
});
app.use('/app/exercise/', express.static(__dirname + '/exercise'));

// url start with /system/web_apps/ must be resources on remote server
// for shuwu test
app.get('/system/web_apps/*', function (req, res) {
	console.log("proxy," + req.originalUrl);
	request.get(SERVER_IP + req.originalUrl).pipe(res);
});

// APIs
app.get('/exercise/v1/user_data/*', function (req, res) {
	console.log("get userdata," + req.originalUrl);
	if (PROD_USER_DATA_MODE) {
		request.get("http://shuwu.sunshine-library.org" + req.originalUrl).pipe(res);
	} else {
		res.send(local_user_data[req.originalUrl]);
	}
});

app.get('/exercise/*', function (req, res) {
	console.log("proxy," + req.originalUrl);
	request.get(SERVER_IP + req.originalUrl).pipe(res);
});

var local_user_data = {};

app.post('*', express.bodyParser(), function (req, res) {
	var mode = (PROD_USER_DATA_MODE) ? "PROD" : "MOCK";
	console.log("post[" + mode + "]," + req.originalUrl + "," + JSON.stringify(req.body));
	if ("delete_all" == req.body.action) {
		local_user_data = {};
		console.log("all mock user_data deleted");
	}
	if (PROD_USER_DATA_MODE) {
		request.post("http://shuwu.sunshine-library.org" + req.originalUrl, req.body).pipe(res);
	} else {
		local_user_data[req.originalUrl] = req.body;
		res.send(req.body);
	}
});

/*
 // For heartbeat
 app.get('/ping', function (req, res) {
 console.log("ping");
 res.send({ping: true});
 });

 // ROOT
 app.get('/exercise/v1/root', function (req, res) {
 res.jsonp({
 subjects: [
 {
 title: "黑我大数学",
 subject: "math",
 id: "101",
 ts: "1",
 chapters: [
 {
 id: "math_1",
 ts: "1",
 title: "有理数章节介绍",
 enter_lesson: "走一步，再走一步",
 exit_lesson: "理解负数",
 lessons: [
 {
 id: "走一步，再走一步",
 ts: "1",
 summary: "课文写的是“我”童年时一次“脱险”的经历，其中蕴含着生活的哲理。在人生道路上常常会遇到意想不到的困难，“我”的脱险对你也会有宝贵的启示。：",
 title: "走一步，再走一步"
 },
 {
 id: "理解负数",
 ts: "1",
 summary: "",
 title: "有理数章节介绍",
 requirements: ["走一步，再走一步"]
 }
 ]
 }
 ]
 },
 {
 title: "英语 初一上",
 subject: "english",
 id: "103",
 ts: "1"
 }
 ],
 userinfo: {
 ts: "1"
 },
 resources: {
 ts: "1"
 },
 achievements: {
 ts: "1"
 }
 });
 });

 // ACHIEVEMENTS
 app.get('/exercise/v1/achievements', function (req, res) {
 if ((req.param("act") == "cache" || req.param("act") == "status")) {
 res.jsonp({
 is_cached: true,
 progress: 100,
 manifest: [
 {
 url: "/exercise/v1/lessons/走一步，再走一步",
 ts: "1"
 },
 {
 url: "/exercise/v1/lessons/走一步，再走一步/freeculture.pdf"
 }
 ]
 });
 } else {
 fs.readFile(
 __dirname + '/data/achievements.json',
 'utf8',
 function (err, data) {
 if (err) {
 res.jsonp(404, {error: "no achievements"});
 } else {
 res.jsonp(JSON.parse(data));
 }
 })
 }
 });

 // CHAPTER
 app.get('/exercise/v1/chapters/:id', function (req, res) {
 if (req.param("act") == "status") {
 res.jsonp({
 is_cached: true,
 manifest: [
 {
 url: "/exercise/v1/lessons/走一步，再走一步/freeculture.pdf"
 }
 ]
 });
 }
 });

 app.get('/exercise/v1/resources', function (req, res) {
 if (req.param("ts") == "1") {
 res.jsonp({
 is_cached: true,
 progress: 100,
 manifest: [
 {
 url: "/exercise/v1/lessons/走一步，再走一步/freeculture.pdf"
 }
 ]
 });
 }
 });

 // LESSONS
 app.get('/exercise/v1/lessons/:id', function (req, res) {
 fs.readFile(
 __dirname + '/data/' + req.param("id") + '/lesson.json',
 'utf8',
 function (err, data) {
 if (err) {
 res.jsonp(404, {error: "no such lesson"});
 } else {
 res.jsonp(JSON.parse(data));
 }
 })
 })

 app.get('/exercise/v1/lessons/:id/:fname', function (req, res) {
 res.sendfile(__dirname + "/data/" + req.param("id") + "/materials/" + req.param("fname"));
 });


 // app.get('/exercise/v1/user_data/lessons/:id', function (req, res) {
 // 	//res.jsonp(user_data[req.param("id")]);
 // 	res.jsonp({});
 // });

 // USERDATA
 var lessons_user_data = {};

 app.get('/exercise/v1/user_data/lessons/:id', function (req, res) {
 console.log('get lesson user_data,' + req.param("id"));
 res.send(lessons_user_data[req.param("id")]);
 });

 app.post('/exercise/v1/user_data/lessons/:id', express.bodyParser(), function (req, res) {
 console.log('save lesson user_data,' + req.param("id") + "," + req.body.data);
 lessons_user_data[req.param("id")] = req.body.data;
 res.jsonp({is_correct:true})
 });

 // USER_INFO
 app.get('/exercise/v1/user_data/user_info', express.bodyParser(), function (req, res) {
 console.log('get user_info user_data');
 res.jsonp(currentUser)
 });

 app.post('/exercise/v1/user_data/user_info', express.bodyParser(), function (req, res) {
 console.log('save user_info user_data,' + req.body.data);
 user_info_user_data= req.body.data;
 res.jsonp({is_correct:true})
 });

 var currentUser = {
 name: "小明",
 age: "12",
 achievements: {
 badges: {},
 awards: {}
 }
 };

 app.get('/exercise/v1/user_info', function (req, res) {
 console.log("get userinfo:" + currentUser);
 res.jsonp(currentUser);
 });

 app.post('/userinfo', express.bodyParser(), function (req, res) {
 currentUser = req.param("data");
 console.log("currentUser=" + currentUser);
 res.send("complete");
 });

 app.use('/media', express.static(__dirname + '/data/media'));
 */
app.listen(8000);
console.log("Yep. I'm listening on port 8000");

