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
var io = new (require('socket.io'))()
//library loader
var loadLib = function(lib){
    return require(__dirname+'/libs/'+lib+'.js')
}
//process handlers
var s = loadLib('process')(process,__dirname)
//load extender functions
loadLib('extenders')(s)
//configuration loader
var config = loadLib('config')(s)
//language loader
var lang = loadLib('language')(s,config)
//code test module
loadLib('codeTester')(s,config,lang)
//basic functions
loadLib('basic')(s,config)
//video processing engine
loadLib('ffmpeg')(s,config,function(ffmpeg){
    //ffmpeg coProcessor
    loadLib('ffmpegCoProcessor')(s,config,lang,ffmpeg)
    //database connection : mysql, sqlite3..
    loadLib('sql')(s,config)
    //working directories : videos, streams, fileBin..
    loadLib('folders')(s,config)
    //authenticator functions : API, dashboard login..
    loadLib('auth')(s,config,lang)
    //express web server with ejs
    var app = loadLib('webServer')(s,config,lang,io)
    //web server routes : page handling..
    loadLib('webServerPaths')(s,config,lang,app,io)
    //web server routes for streams : streams..
    loadLib('webServerStreamPaths')(s,config,lang,app,io)
    //web server admin routes : create sub accounts, share monitors, share videos
    loadLib('webServerAdminPaths')(s,config,lang,app,io)
    //web server superuser routes : create admin accounts and manage system functions
    loadLib('webServerSuperPaths')(s,config,lang,app,io)
    //websocket connection handlers : login and streams..
    loadLib('socketio')(s,config,lang,io)
    //user and group functions
    loadLib('user')(s,config)
    //monitor/camera handlers
    loadLib('monitor')(s,config,lang)
    //event functions : motion, object matrix handler
    loadLib('events')(s,config,lang)
    //built-in detector functions : pam-diff..
    loadLib('detector')(s,config)
    //recording functions
    loadLib('videos')(s,config,lang)
    //plugins : websocket connected services..
    loadLib('plugins')(s,config,lang)
    //health : cpu and ram trackers..
    loadLib('health')(s,config,lang,io)
    //cluster module
    loadLib('childNode')(s,config,lang,app,io)
    //cloud uploaders : amazon s3, webdav, backblaze b2..
    loadLib('uploaders')(s,config,lang)
    //notifiers : discord..
    loadLib('notification')(s,config,lang)
    //notifiers : discord..
    loadLib('rtmpserver')(s,config,lang)
    //dropInEvents server (file manipulation to create event trigger)
    loadLib('dropInEvents')(s,config,lang,app,io)
    //custom module loader
    loadLib('customAutoLoad')(s,config,lang,app,io)
    //scheduling engine
    loadLib('scheduler')(s,config,lang,app,io)
    //on-start actions, daemon(s) starter
    loadLib('startup')(s,config,lang)
})
