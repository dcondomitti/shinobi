var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var app = express()
module.exports = function(s,config,lang,io){
    //get page URL
    if(!config.baseURL){
        config.baseURL = ""
    }else if(config.baseURL !== ''){
        config.baseURL = s.checkCorrectPathEnding(config.baseURL)
    }
    //Render Configurations - Web Paths
    if(config.webPaths === undefined){config.webPaths={}}
        //main access URI
        if(config.webPaths.home === undefined){config.webPaths.home='/'}
        //Super User URI
        if(config.webPaths.super === undefined){config.webPaths.super='/super'}
        //Admin URI
        if(config.webPaths.admin === undefined){config.webPaths.admin='/admin'}
        //Libraries URI
        if(config.webPaths.libs === undefined){config.webPaths.libs='/libs'}
        //API Prefix
        if(config.webPaths.apiPrefix === undefined){config.webPaths.apiPrefix = s.checkCorrectPathEnding(config.webPaths.home)}else{config.webPaths.apiPrefix = s.checkCorrectPathEnding(config.webPaths.apiPrefix)}
        //Admin API Prefix
        if(config.webPaths.adminApiPrefix === undefined){config.webPaths.adminApiPrefix=s.checkCorrectPathEnding(config.webPaths.admin)}else{config.webPaths.adminApiPrefix = s.checkCorrectPathEnding(config.webPaths.adminApiPrefix)}
        //Super API Prefix
        if(config.webPaths.superApiPrefix === undefined){config.webPaths.superApiPrefix=s.checkCorrectPathEnding(config.webPaths.super)}else{config.webPaths.superApiPrefix = s.checkCorrectPathEnding(config.webPaths.superApiPrefix)}
    //Render Configurations - Page Render Paths
    if(config.renderPaths === undefined){config.renderPaths={}}
        //login page
        if(config.renderPaths.index === undefined){config.renderPaths.index='pages/index'}
        //dashboard page
        if(config.renderPaths.home === undefined){config.renderPaths.home='pages/home'}
        //sub-account administration page
        if(config.renderPaths.admin === undefined){config.renderPaths.admin='pages/admin'}
        //superuser page
        if(config.renderPaths.super === undefined){config.renderPaths.super='pages/super'}
        //2-Factor Auth page
        if(config.renderPaths.factorAuth === undefined){config.renderPaths.factorAuth='pages/factor'}
        //Streamer v1 (Dashcam Prototype) page
        if(config.renderPaths.streamer === undefined){config.renderPaths.streamer='pages/streamer'}
        //Streamer v2 (Dashcam) page
        if(config.renderPaths.dashcam === undefined){config.renderPaths.dashcam='pages/dashcam'}
        //embeddable widget page
        if(config.renderPaths.embed === undefined){config.renderPaths.embed='pages/embed'}
        //mjpeg full screen page
        if(config.renderPaths.mjpeg === undefined){config.renderPaths.mjpeg='pages/mjpeg'}
        //gridstack only page
        if(config.renderPaths.grid === undefined){config.renderPaths.grid='pages/grid'}
        //slick.js (cycle) page
        if(config.renderPaths.cycle === undefined){config.renderPaths.cycle='pages/cycle'}
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
        if(config.webPaths.home !== '/'){
            io.attach(serverHTTPS,{
                path:'/socket.io',
                transports: ['websocket']
            })
        }
        io.attach(serverHTTPS,{
            path:s.checkCorrectPathEnding(config.webPaths.home)+'socket.io',
            transports: ['websocket']
        })
        io.attach(serverHTTPS,{
            path:s.checkCorrectPathEnding(config.webPaths.admin)+'socket.io',
            transports: ['websocket']
        })
        io.attach(serverHTTPS,{
            path:s.checkCorrectPathEnding(config.webPaths.super)+'socket.io',
            transports: ['websocket']
        })
    }
    //start HTTP
    var server = http.createServer(app);
    server.listen(config.port,config.bindip,function(){
        console.log(lang.Shinobi+' : Web Server Listening on '+config.port);
    });
    if(config.webPaths.home !== '/'){
        io.attach(server,{
            path:'/socket.io',
            transports: ['websocket']
        })
    }
    io.attach(server,{
        path:s.checkCorrectPathEnding(config.webPaths.home)+'socket.io',
        transports: ['websocket']
    })
    io.attach(server,{
        path:s.checkCorrectPathEnding(config.webPaths.admin)+'socket.io',
        transports: ['websocket']
    })
    io.attach(server,{
        path:s.checkCorrectPathEnding(config.webPaths.super)+'socket.io',
        transports: ['websocket']
    })
    return app
}
