var express = require('express')
var app = express()

app.get('/', function (req, res) {
  res.send('Hello Capcha!')
})

app.use(express.static('public'))

var port = process.env.PORT || 4001;
app.listen(port, function () {
  console.log('Example app listening on port 4001!')
})