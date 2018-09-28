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
var fs = require('fs');
process.on('uncaughtException', function (err) {
    console.error('Uncaught Exception occured!');
    console.error(err.stack);
});
process.on('SIGINT', function() {
    process.exit();
});
var staticFFmpeg = false;
try{
    staticFFmpeg = require('ffmpeg-static').path;
    if (!fs.existsSync(staticFFmpeg)) {
        staticFFmpeg = false
        console.log('"ffmpeg-static" from NPM has failed to provide a compatible library or has been corrupted.')
        console.log('You may need to install FFmpeg manually or you can try running "npm uninstall ffmpeg-static && npm install ffmpeg-static".')
    }
}catch(err){
    staticFFmpeg = false;
    console.log('No Static FFmpeg. Continuing.')
}
var os = require('os');
var moment = require('moment');
var express = require('express');
var app = express();
var io = new (require('socket.io'))();
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;

s={
    factorAuth : {},
    totalmem : os.totalmem(),
    platform : os.platform(),
    s : JSON.stringify,
    isWin : (process.platform === 'win32'),
    utcOffset : moment().utcOffset()
};

var location = {}
location.super = __dirname+'/super.json'
location.config = __dirname+'/conf.json'
location.languages = __dirname+'/languages'
location.definitions = __dirname+'/definitions'
var config = require(location.config);
if(!config.productType){
    config.productType='CE'
}
if(config.productType==='Pro'){
    var LdapAuth = require('ldapauth-fork');
}
if(!config.language){
    config.language='en_CA'
}
try{
    var lang = require(location.languages+'/'+config.language+'.json');
}catch(er){
    console.error(er)
    console.log('There was an error loading your language file.')
    var lang = require(location.languages+'/en_CA.json');
}
try{
    var definitions = require(location.definitions+'/'+config.language+'.json');
}catch(er){
    console.error(er)
    console.log('There was an error loading your language file.')
    var definitions = require(location.definitions+'/en_CA.json');
}
//config defaults
if(config.cpuUsageMarker === undefined){config.cpuUsageMarker='%Cpu'}
if(config.customCpuCommand === undefined){config.customCpuCommand=null}
if(config.autoDropCache === undefined){config.autoDropCache=true}
if(config.doSnapshot === undefined){config.doSnapshot=true}
if(config.restart === undefined){config.restart={}}
if(config.systemLog === undefined){config.systemLog=true}
if(config.deleteCorruptFiles === undefined){config.deleteCorruptFiles=true}
if(config.restart.onVideoNotExist === undefined){config.restart.onVideoNotExist=true}
if(config.ip === undefined||config.ip===''||config.ip.indexOf('0.0.0.0')>-1){config.ip='localhost'}else{config.bindip=config.ip};
if(config.cron === undefined)config.cron={};
if(config.cron.enabled === undefined)config.cron.enabled=true;
if(config.cron.deleteOld === undefined)config.cron.deleteOld=true;
if(config.cron.deleteOrphans === undefined)config.cron.deleteOrphans=false;
if(config.cron.deleteNoVideo === undefined)config.cron.deleteNoVideo=true;
if(config.cron.deleteNoVideoRecursion === undefined)config.cron.deleteNoVideoRecursion=false;
if(config.cron.deleteOverMax === undefined)config.cron.deleteOverMax=true;
if(config.cron.deleteOverMaxOffset === undefined)config.cron.deleteOverMaxOffset=0.9;
if(config.cron.deleteLogs === undefined)config.cron.deleteLogs=true;
if(config.cron.deleteEvents === undefined)config.cron.deleteEvents=true;
if(config.cron.deleteFileBins === undefined)config.cron.deleteFileBins=true;
if(config.cron.interval === undefined)config.cron.interval=1;
if(config.databaseType === undefined){config.databaseType='mysql'}
if(config.pluginKeys === undefined)config.pluginKeys={};
if(config.databaseLogs === undefined){config.databaseLogs=false}
if(config.useUTC === undefined){config.useUTC=false}
if(config.iconURL === undefined){config.iconURL = "https://shinobi.video/libs/assets/icon/apple-touch-icon-152x152.png"}
if(config.pipeAddition === undefined){config.pipeAddition=7}else{config.pipeAddition=parseInt(config.pipeAddition)}
if(config.hideCloudSaveUrls === undefined){config.hideCloudSaveUrls = true}
//Child Nodes
if(config.childNodes === undefined)config.childNodes = {};
    //enabled
    if(config.childNodes.enabled === undefined)config.childNodes.enabled = false;
    //mode, set value as `child` for all other machines in the cluster
    if(config.childNodes.mode === undefined)config.childNodes.mode = 'master';
    //child node connection port
    if(config.childNodes.port === undefined)config.childNodes.port = 8288;
    //child node connection key
    if(config.childNodes.key === undefined)config.childNodes.key = [
        '3123asdasdf1dtj1hjk23sdfaasd12asdasddfdbtnkkfgvesra3asdsd3123afdsfqw345'
    ];

if(config.mail){
    if(config.mail.from === undefined){config.mail.from = '"ShinobiCCTV" <no-reply@shinobi.video>'}
    s.nodemailer = require('nodemailer').createTransport(config.mail);
}
var loadLib = function(lib){
    return require(__dirname+'/libs/'+lib+'.js')
}
loadLib('language')(s,config,lang,definitions,io,app)
loadLib('sql')(s,config)
loadLib('notification')(s,config,lang,definitions)
loadLib('basic')(s,config)
loadLib('socketio')(s,config,io)
loadLib('monitor')(s,config,lang)
loadLib('detector')(s,config)
loadLib('webServer')(s,config,lang,definitions,io,app)
loadLib('ffmpegLocation')(s,config,staticFFmpeg)
loadLib('folders')(s,config,location)
loadLib('videos')(s,config)
loadLib('events')(s,config,lang)
loadLib('plugins')(s,config,lang)
loadLib('auth')(s,config,lang)
loadLib('webServerPaths')(s,config,lang,app)
loadLib('health')(s,config,lang,io)
loadLib('childNode')(s,config,lang,io)

console.log('NODE.JS version : '+execSync("node -v"))

process.send = process.send || function () {};
if(config.childNodes.mode !== 'child'){
    //add Cloud Videos table, will remove in future
    s.sqlQuery('CREATE TABLE IF NOT EXISTS `Cloud Videos` (`mid` varchar(50) NOT NULL,`ke` varchar(50) DEFAULT NULL,`href` text NOT NULL,`size` float DEFAULT NULL,`time` timestamp NULL DEFAULT NULL,`end` timestamp NULL DEFAULT NULL,`status` int(1) DEFAULT \'0\' COMMENT \'0:Complete,1:Read,2:Archive\',`details` text) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',[],function(err){
        // if(err)console.log(err)
    },true)
    //create Files table
    s.sqlQuery('CREATE TABLE IF NOT EXISTS `Files` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`name` tinytext NOT NULL,`size` float NOT NULL DEFAULT \'0\',`details` text NOT NULL,`status` int(1) NOT NULL DEFAULT \'0\') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',[],function(err){
        // if(err)console.log(err)
    },true)
    //add time to Files table
    s.sqlQuery('ALTER TABLE `Files`	ADD COLUMN `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `status`;',[],function(err){
        // if(err)console.log(err)
    },true)
    //master node - startup functions
    setInterval(function(){
        s.cpuUsage(function(cpu){
            s.ramUsage(function(ram){
                s.tx({f:'os',cpu:cpu,ram:ram},'CPU');
            })
        })
    },10000);
    setTimeout(function(){
        //get current disk used for each isolated account (admin user) on startup
        s.sqlQuery('SELECT * FROM Users WHERE details NOT LIKE ?',['%"sub"%'],function(err,r){
            if(r&&r[0]){
                var count = r.length
                var countFinished = 0
                r.forEach(function(v,n){
                    v.size=0;
                    v.limit=JSON.parse(v.details).size
                    s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND status!=?',[v.ke,0],function(err,rr){
                        ++countFinished
                        if(r&&r[0]){
                            rr.forEach(function(b){
                                v.size+=b.size
                            })
                        }
                        s.systemLog(v.mail+' : '+lang.startUpText0+' : '+rr.length,v.size)
                        s.init('group',v)
                        s.init('apps',v)
                        s.systemLog(v.mail+' : '+lang.startUpText1,countFinished+'/'+count)
                        if(countFinished===count){
                            s.systemLog(lang.startUpText4)
                            //preliminary monitor start
                            s.sqlQuery('SELECT * FROM Monitors', function(err,r) {
                                if(err){s.systemLog(err)}
                                if(r&&r[0]){
                                    r.forEach(function(v){
                                        s.init(0,v);
                                        r.ar={};
                                        r.ar.id=v.mid;
                                        Object.keys(v).forEach(function(b){
                                            r.ar[b]=v[b];
                                        })
                                        if(!s.group[v.ke]){
                                            s.group[v.ke]={}
                                            s.group[v.ke].mon_conf={}
                                        }
                                        v.details=JSON.parse(v.details);
                                        s.group[v.ke].mon_conf[v.mid]=v;
                                        s.camera(v.mode,r.ar);
                                    });
                                }
                                s.processReady()
                            });
                        }
                    })
                })
            }else{
                s.processReady()
            }
        })
    },1500)
}
