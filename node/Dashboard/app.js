var express = require('express')
var app = express()
var basicAuth = require('express-basic-auth')
/*app.use(basicAuth({
        users: { 'monitor': 'password' },
    unauthorizedResponse: getUnauthorizedResponse
    }))*/
 
    function getUnauthorizedResponse(req) {
        return req.auth ?
            ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
            'No credentials provided'
    }




app.use(express.static('public'))

var port = process.env.PORT || 4001;
app.listen(port, function () {
  console.log('Kibana custom dashboard is listening on port 4001!')
})