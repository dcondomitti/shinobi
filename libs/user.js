var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
module.exports = function(s,config){
    s.purgeDiskForGroup = function(e){
        if(config.cron.deleteOverMax === true){
                s.group[e.ke].sizePurgeQueue.push(1)
                if(s.group[e.ke].sizePurging !== true){
                    s.group[e.ke].sizePurging = true
                    var finish = function(){
                        //remove value just used from queue
                        s.group[e.ke].sizePurgeQueue.shift()
                        //do next one
                        if(s.group[e.ke].sizePurgeQueue.length > 0){
                            checkQueue()
                        }else{
                            s.group[e.ke].sizePurging=false
                            s.sendDiskUsedAmountToClients(e)
                        }
                    }
                    var checkQueue = function(){
                        //get first in queue
                        var currentPurge = s.group[e.ke].sizePurgeQueue[0]
                        var deleteVideos = function(){
                            //run purge command
                            if(s.group[e.ke].usedSpace > (s.group[e.ke].sizeLimit*config.cron.deleteOverMaxOffset)){
                                s.sqlQuery('SELECT * FROM Videos WHERE status != 0 AND details NOT LIKE \'%"archived":"1"%\' AND ke=? ORDER BY `time` ASC LIMIT 3',[e.ke],function(err,videos){
                                    var videosToDelete = []
                                    var queryValues = [e.ke]
                                    var completedCheck = 0
                                    if(videos){
                                        videos.forEach(function(video){
                                            video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                                            videosToDelete.push('(mid=? AND `time`=?)')
                                            queryValues.push(video.mid)
                                            queryValues.push(video.time)
                                            fs.chmod(video.dir,0o777,function(err){
                                                fs.unlink(video.dir,function(err){
                                                    ++completedCheck
                                                    if(err){
                                                        fs.stat(video.dir,function(err){
                                                            if(!err){
                                                                s.file('delete',video.dir)
                                                            }
                                                        })
                                                    }
                                                    if(videosToDelete.length === completedCheck){
                                                        videosToDelete = videosToDelete.join(' OR ')
                                                        s.sqlQuery('DELETE FROM Videos WHERE ke =? AND ('+videosToDelete+')',queryValues,function(){
                                                            deleteVideos()
                                                        })
                                                    }
                                                })
                                            })
                                            s.setDiskUsedForGroup(e,-(video.size/1000000))
                                            s.tx({
                                                f: 'video_delete',
                                                ff: 'over_max',
                                                filename: s.formattedTime(video.time)+'.'+video.ext,
                                                mid: video.mid,
                                                ke: video.ke,
                                                time: video.time,
                                                end: s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')
                                            },'GRP_'+e.ke)
                                        })
                                    }else{
                                        console.log(err)
                                    }
                                    if(videosToDelete.length === 0){
                                        finish()
                                    }
                                })
                        }else{
                            finish()
                        }
                    }
                    deleteVideos()
                }
                checkQueue()
            }
        }else{
            s.sendDiskUsedAmountToClients(e)
        }
    }
    s.setDiskUsedForGroup = function(e,bytes){
        //`bytes` will be used as the value to add or substract
        if(s.group[e.ke] && s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('set',bytes)
        }
    }
    s.purgeCloudDiskForGroup = function(e,storageType){
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('purgeCloud',storageType)
        }
    }
    s.setCloudDiskUsedForGroup = function(e,usage){
        //`bytes` will be used as the value to add or substract
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('setCloud',usage)
        }
    }
    s.sendDiskUsedAmountToClients = function(e){
        //send the amount used disk space to connected users
        if(s.group[e.ke]&&s.group[e.ke].init){
            s.tx({f:'diskUsed',size:s.group[e.ke].usedSpace,limit:s.group[e.ke].sizeLimit},'GRP_'+e.ke);
        }
    }
    //user log
    s.userLog = function(e,x){
        if(e.id && !e.mid)e.mid = e.id
        if(!x||!e.mid){return}
        if((e.details&&e.details.sqllog==='1')||e.mid.indexOf('$')>-1){
            s.sqlQuery('INSERT INTO Logs (ke,mid,info) VALUES (?,?,?)',[e.ke,e.mid,s.s(x)]);
        }
        s.tx({f:'log',ke:e.ke,mid:e.mid,log:x,time:s.timeObject()},'GRPLOG_'+e.ke);
    }
    s.loadGroup = function(e){
        if(!s.group[e.ke]){
            s.group[e.ke]={}
        }
        if(!s.group[e.ke].init){
            s.group[e.ke].init={}
        }
        if(!s.group[e.ke].fileBin){s.group[e.ke].fileBin={}};
        if(!s.group[e.ke].users){s.group[e.ke].users={}}
        if(!s.group[e.ke].dashcamUsers){s.group[e.ke].dashcamUsers={}}
        if(!s.group[e.ke].sizePurgeQueue){s.group[e.ke].sizePurgeQueue=[]}
        if(!e.limit||e.limit===''){e.limit=10000}else{e.limit=parseFloat(e.limit)}
        //save global space limit for group key (mb)
        s.group[e.ke].sizeLimit=e.limit;
        //save global used space as megabyte value
        s.group[e.ke].usedSpace=e.size/1000000;
        //emit the changes to connected users
        s.sendDiskUsedAmountToClients(e)
    }
    s.loadGroupApps = function(e){
        // e = user
        if(!s.group[e.ke].init){
            s.group[e.ke].init={};
        }
        s.sqlQuery('SELECT * FROM Users WHERE ke=? AND details NOT LIKE ?',[e.ke,'%"sub"%'],function(ar,r){
            if(r&&r[0]){
                r=r[0];
                ar=JSON.parse(r.details);
                //load extenders
                s.loadGroupAppExtensions.forEach(function(extender){
                    extender(r)
                })
                //disk Used Emitter
                if(!s.group[e.ke].diskUsedEmitter){
                    s.group[e.ke].diskUsedEmitter = new events.EventEmitter()
                    s.group[e.ke].diskUsedEmitter.on('setCloud',function(currentChange){
                        var amount = currentChange.amount
                        var storageType = currentChange.storageType
                        var cloudDisk = s.group[e.ke].cloudDiskUse[storageType]
                        //validate current values
                        if(!cloudDisk.usedSpace){
                            cloudDisk.usedSpace = 0
                        }else{
                            cloudDisk.usedSpace = parseFloat(cloudDisk.usedSpace)
                        }
                        if(cloudDisk.usedSpace < 0 || isNaN(cloudDisk.usedSpace)){
                            cloudDisk.usedSpace = 0
                        }
                        //change global size value
                        cloudDisk.usedSpace = cloudDisk.usedSpace + amount
                    })
                    s.group[e.ke].diskUsedEmitter.on('purgeCloud',function(storageType){
                        if(config.cron.deleteOverMax === true){
                                //set queue processor
                                var finish=function(){
                                    // s.sendDiskUsedAmountToClients(e)
                                }
                                var deleteVideos = function(){
                                    //run purge command
                                    var cloudDisk = s.group[e.ke].cloudDiskUse[storageType]
                                    if(cloudDisk.sizeLimitCheck && cloudDisk.usedSpace > (cloudDisk.sizeLimit*config.cron.deleteOverMaxOffset)){
                                            s.sqlQuery('SELECT * FROM `Cloud Videos` WHERE status != 0 AND ke=? AND details LIKE \'%"type":"'+storageType+'"%\' ORDER BY `time` ASC LIMIT 2',[e.ke],function(err,videos){
                                                var videosToDelete = []
                                                var queryValues = [e.ke]
                                                if(!videos)return console.log(err)
                                                videos.forEach(function(video){
                                                    video.dir = s.getVideoDirectory(video) + s.formattedTime(video.time) + '.' + video.ext
                                                    videosToDelete.push('(mid=? AND `time`=?)')
                                                    queryValues.push(video.mid)
                                                    queryValues.push(video.time)
                                                    s.setCloudDiskUsedForGroup(e,{
                                                        amount : -(video.size/1000000),
                                                        storageType : storageType
                                                    })
                                                    s.deleteVideoFromCloudExtensionsRunner(e,storageType,video)
                                                })
                                                if(videosToDelete.length > 0){
                                                    videosToDelete = videosToDelete.join(' OR ')
                                                    s.sqlQuery('DELETE FROM `Cloud Videos` WHERE ke =? AND ('+videosToDelete+')',queryValues,function(){
                                                        deleteVideos()
                                                    })
                                                }else{
                                                    finish()
                                                }
                                            })
                                    }else{
                                        finish()
                                    }
                                }
                                deleteVideos()
                        }else{
                            // s.sendDiskUsedAmountToClients(e)
                        }
                    })
                    //s.setDiskUsedForGroup
                    s.group[e.ke].diskUsedEmitter.on('set',function(currentChange){
                        //validate current values
                        if(!s.group[e.ke].usedSpace){
                            s.group[e.ke].usedSpace=0
                        }else{
                            s.group[e.ke].usedSpace=parseFloat(s.group[e.ke].usedSpace)
                        }
                        if(s.group[e.ke].usedSpace<0||isNaN(s.group[e.ke].usedSpace)){
                            s.group[e.ke].usedSpace=0
                        }
                        //change global size value
                        s.group[e.ke].usedSpace += currentChange
                        //remove value just used from queue
                        s.sendDiskUsedAmountToClients(e)
                    })
                }
                Object.keys(ar).forEach(function(v){
                    s.group[e.ke].init[v]=ar[v]
                })
            }
        });
    }
}
