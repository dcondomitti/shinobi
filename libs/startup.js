var moment = require('moment');
var crypto = require('crypto');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,io){
    console.log('FFmpeg version : '+s.ffmpegVersion)
    console.log('Node.js version : '+execSync("node -v"))
    s.processReady = function(){
        s.systemLog(lang.startUpText5)
        process.send('ready')
    }
    var loadedAccounts = []
    var loadMonitors = function(callback){
        s.systemLog(lang.startUpText4)
        //preliminary monitor start
        s.sqlQuery('SELECT * FROM Monitors', function(err,monitors) {
            if(err){s.systemLog(err)}
            if(monitors && monitors[0]){
                monitors.forEach(function(monitor){
                    s.initiateMonitorObject(monitor)
                    monitor.details = JSON.parse(monitor.details)
                    s.group[monitor.ke].mon_conf[monitor.mid] = monitor
                    var monObj = Object.assign(monitor,{id : monitor.mid})
                    s.camera(monitor.mode,monObj)
                });
            }
            callback()
        })
    }
    var loadAdminUsers = function(callback){
        //get current disk used for each isolated account (admin user) on startup
        s.sqlQuery('SELECT * FROM Users WHERE details NOT LIKE ?',['%"sub"%'],function(err,users){
            if(users && users[0]){
                var count = users.length
                var countFinished = 0
                users.forEach(function(user){
                    loadedAccounts.push(user.ke)
                    var userDetails = JSON.parse(user.details)
                    user.size = 0
                    user.limit = userDetails.size
                    s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND status!=?',[user.ke,0],function(err,videos){
                        if(videos && videos[0]){
                            videos.forEach(function(video){
                                user.size += video.size
                            })
                        }
                        s.loadGroup(user)
                        s.loadGroupApps(user)
                        ++countFinished
                        s.systemLog(user.mail+' : '+lang.startUpText0+' : '+videos.length,user.size)
                        s.systemLog(user.mail+' : '+lang.startUpText1,countFinished+'/'+count)
                        if(countFinished === count){
                            callback()
                        }
                    })
                })
            }else{
                s.processReady()
            }
        })
    }
    if(config.childNodes.mode !== 'child'){
        s.preQueries()
        setTimeout(function(){
            loadAdminUsers(function(){
                loadMonitors(function(){
                    s.processReady()
                })
            })
        },1500)
    }
}
