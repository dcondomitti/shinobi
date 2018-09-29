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
process.send = process.send || function () {};
process.on('uncaughtException', function (err) {
    console.error('Uncaught Exception occured!');
    console.error(err.stack);
});
process.on('SIGINT', function() {
    process.exit();
});
var os = require('os');
var io = new (require('socket.io'))()

s = {
    factorAuth : {},
    totalmem : os.totalmem(),
    platform : os.platform(),
    s : function(obj){return JSON.stringify(obj,null,3)},
    isWin : (process.platform === 'win32'),
    utcOffset : require('moment')().utcOffset(),
    currentDirectory : __dirname
}
var loadLib = function(lib){
    return require(__dirname+'/libs/'+lib+'.js')
}
var config = loadLib('config')(s)
var lang = loadLib('language')(s,config)
loadLib('basic')(s,config)
var app = loadLib('webServer')(s,config,lang,io)
loadLib('sql')(s,config)
loadLib('user')(s,config)
loadLib('notification')(s,config,lang)
loadLib('socketio')(s,config,io)
loadLib('monitor')(s,config,lang)
loadLib('detector')(s,config)
loadLib('ffmpegLocation')(s,config)
loadLib('folders')(s,config)
loadLib('videos')(s,config)
loadLib('events')(s,config,lang)
loadLib('plugins')(s,config,lang)
loadLib('auth')(s,config,lang)
loadLib('webServerPaths')(s,config,lang,app)
loadLib('health')(s,config,lang,io)
loadLib('childNode')(s,config,lang,io)
loadLib('startup')(s,config,lang)
