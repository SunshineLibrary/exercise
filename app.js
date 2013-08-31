var express = require('express');
var app = express();

// New call to compress content
//app.use(express.compress());

app.use('/app/exercise', express.static(__dirname + '/exercise'));

app.listen(8000);
console.log('Listening on port 8000');

