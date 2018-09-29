//
// Shinobi
// Copyright (C) 2016 Moe Alam, moeiscool
//
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
var os = require('os');
var io = new (require('socket.io'))()
// s = Shinobi
s = {
    //for 2-Factor Authenticated login
    factorAuth : {},
    //Total Memory
    totalmem : os.totalmem(),
    //Check Platform
    platform : os.platform(),
    //Pretty Print JSON
    s : function(obj){return JSON.stringify(obj,null,3)},
    //Check if Windows
    isWin : (process.platform === 'win32'),
    //UTC Offset
    utcOffset : require('moment')().utcOffset(),
    //directory path for this file
    mainDirectory : __dirname
}
//library loader
var loadLib = function(lib){
    return require(__dirname+'/libs/'+lib+'.js')
}
//process handlers
loadLib('process')(process)
//configuration loader
var config = loadLib('config')(s)
//language loader
var lang = loadLib('language')(s,config)
//basic functions
loadLib('basic')(s,config)
//video processing engine
loadLib('ffmpeg')(s,config)
//database connection : mysql, sqlite3..
loadLib('sql')(s,config)
//working directories : videos, streams, fileBin..
loadLib('folders')(s,config)
//authenticator functions : API, dashboard login..
loadLib('auth')(s,config,lang)
//express web server with ejs
var app = loadLib('webServer')(s,config,lang,io)
//web server routes : page handling, streams..
loadLib('webServerPaths')(s,config,lang,app)
//websocket connection handlers : login and streams..
loadLib('socketio')(s,config,io)
//user and group functions
loadLib('user')(s,config)
//monitor/camera handlers
loadLib('monitor')(s,config,lang)
//notifiers : discord..
loadLib('notification')(s,config,lang)
//built-in detector functions : pam-diff..
loadLib('detector')(s,config)
//recording functions
loadLib('videos')(s,config)
//event functions : motion, object matrix handler
loadLib('events')(s,config,lang)
//plugins : websocket connected services..
loadLib('plugins')(s,config,lang)
//health : cpu and ram trackers..
loadLib('health')(s,config,lang,io)
//cluster module
loadLib('childNode')(s,config,lang,io)
//on-start actions
loadLib('startup')(s,config,lang)
