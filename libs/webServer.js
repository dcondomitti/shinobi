var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var app = express()
module.exports = function(s,config,lang,io){
    var server = http.createServer(app);
    //SSL options
    if(config.ssl&&config.ssl.key&&config.ssl.cert){
        config.ssl.key=fs.readFileSync(s.checkRelativePath(config.ssl.key),'utf8')
        config.ssl.cert=fs.readFileSync(s.checkRelativePath(config.ssl.cert),'utf8')
        if(config.ssl.port === undefined){
            config.ssl.port=443
        }
        if(config.ssl.bindip === undefined){
            config.ssl.bindip=config.bindip
        }
        if(config.ssl.ca&&config.ssl.ca instanceof Array){
            config.ssl.ca.forEach(function(v,n){
                config.ssl.ca[n]=fs.readFileSync(s.checkRelativePath(v),'utf8')
            })
        }
        var serverHTTPS = https.createServer(config.ssl,app);
        serverHTTPS.listen(config.ssl.port,config.bindip,function(){
            console.log('SSL '+lang.Shinobi+' : SSL Web Server Listening on '+config.ssl.port);
        });
        io.attach(serverHTTPS);
    }
    //start HTTP
    server.listen(config.port,config.bindip,function(){
        console.log(lang.Shinobi+' : Web Server Listening on '+config.port);
    });
    io.attach(server);
    return app
}
