
var fs = require('fs');
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
                var loadCompleted = 0
                var orphanedVideosForMonitors = {}
                var loadMonitor = function(monitor){
                    if(!orphanedVideosForMonitors[monitor.ke])orphanedVideosForMonitors[monitor.ke] = {}
                    if(!orphanedVideosForMonitors[monitor.ke][monitor.mid])orphanedVideosForMonitors[monitor.ke][monitor.mid] = 0
                    s.initiateMonitorObject(monitor)
                    s.orphanedVideoCheck(monitor,2,function(orphanedFilesCount){
                        if(orphanedFilesCount){
                            orphanedVideosForMonitors[monitor.ke][monitor.mid] += orphanedFilesCount
                        }
                        s.group[monitor.ke].mon_conf[monitor.mid] = monitor
                        s.sendMonitorStatus({id:monitor.mid,ke:monitor.ke,status:'Stopped'});
                        var monObj = Object.assign(monitor,{id : monitor.mid})
                        s.camera(monitor.mode,monObj)
                        ++loadCompleted
                        if(monitors[loadCompleted]){
                            loadMonitor(monitors[loadCompleted])
                        }else{
                            s.systemLog(lang.startUpText6+' : '+s.s(orphanedVideosForMonitors))
                            callback()
                        }
                    })
                }
                loadMonitor(monitors[loadCompleted])
            }else{
                callback()
            }
        })
    }
    var loadDiskUseForUser = function(user,callback){
        s.systemLog(user.mail+' : '+lang.startUpText0)
        var userDetails = JSON.parse(user.details)
        user.size = 0
        user.limit = userDetails.size
        s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND status!=?',[user.ke,0],function(err,videos){
            if(videos && videos[0]){
                videos.forEach(function(video){
                    user.size += video.size
                })
            }
            s.systemLog(user.mail+' : '+lang.startUpText1+' : '+videos.length,user.size)
            callback()
        })
    }
    var loadCloudDiskUseForUser = function(user,callback){
        var userDetails = JSON.parse(user.details)
        user.cloudDiskUse = {}
        user.size = 0
        user.limit = userDetails.size
        s.cloudDisksLoaded.forEach(function(storageType){
            user.cloudDiskUse[storageType] = {
                usedSpace : 0,
                firstCount : 0
            }
            if(s.cloudDiskUseStartupExtensions[storageType])s.cloudDiskUseStartupExtensions[storageType](user,userDetails)
        })
        s.sqlQuery('SELECT * FROM `Cloud Videos` WHERE ke=? AND status!=?',[user.ke,0],function(err,videos){
            if(videos && videos[0]){
                videos.forEach(function(video){
                    var storageType = JSON.parse(video.details).type
                    if(!storageType)storageType = 's3'
                    user.cloudDiskUse[storageType].usedSpace += (video.size /1000000)
                    ++user.cloudDiskUse[storageType].firstCount
                })
                s.cloudDisksLoaded.forEach(function(storageType){
                    var firstCount = user.cloudDiskUse[storageType].firstCount
                    s.systemLog(user.mail+' : '+lang.startUpText1+' : '+firstCount,storageType,user.cloudDiskUse[storageType].usedSpace)
                    delete(user.cloudDiskUse[storageType].firstCount)
                })
            }
            s.group[user.ke].cloudDiskUse = user.cloudDiskUse
            callback()
        })
    }
    var loadAdminUsers = function(callback){
        //get current disk used for each isolated account (admin user) on startup
        s.sqlQuery('SELECT * FROM Users WHERE details NOT LIKE ?',['%"sub"%'],function(err,users){
            if(users && users[0]){
                var loadLocalDiskUse = function(callback){
                    var count = users.length
                    var countFinished = 0
                    users.forEach(function(user){
                        loadedAccounts.push(user.ke)
                        loadDiskUseForUser(user,function(){
                            s.loadGroup(user)
                            s.loadGroupApps(user)
                            ++countFinished
                            if(countFinished === count){
                                callback()
                            }
                        })
                    })
                }
                var loadCloudDiskUse = function(callback){
                    var count = users.length
                    var countFinished = 0
                    users.forEach(function(user){
                        loadCloudDiskUseForUser(user,function(){
                            ++countFinished
                            if(countFinished === count){
                                callback()
                            }
                        })
                    })
                }
                loadLocalDiskUse(function(){
                    loadCloudDiskUse(function(){
                        callback()
                    })
                })
            }else{
                s.processReady()
            }
        })
    }
    //check disk space every 20 minutes
    if(config.autoDropCache===true){
        setInterval(function(){
            exec('echo 3 > /proc/sys/vm/drop_caches',{detached: true})
        },60000*20)
    }
    //master node - startup functions
    setInterval(function(){
        s.cpuUsage(function(cpu){
            s.ramUsage(function(ram){
                s.tx({f:'os',cpu:cpu,ram:ram},'CPU');
            })
        })
    },10000)
    //run prerequsite queries, load users and monitors
    if(config.childNodes.mode !== 'child'){
        //sql/database connection with knex
        s.databaseEngine = require('knex')(s.databaseOptions)
        //run prerequsite queries
        s.preQueries()
        setTimeout(function(){
            //load administrators (groups)
            loadAdminUsers(function(){
                //load monitors (for groups)
                loadMonitors(function(){
                    s.processReady()
                })
            })
        },1500)
    }
}
