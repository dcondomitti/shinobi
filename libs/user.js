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
        })
    }
    s.accountSettingsEdit = function(d){
        s.sqlQuery('SELECT details FROM Users WHERE ke=? AND uid=?',[d.ke,d.uid],function(err,r){
            if(r&&r[0]){
                r=r[0];
                d.d=JSON.parse(r.details);
                if(!d.d.sub || d.d.user_change !== "0"){
                    if(d.cnid){
                        if(d.d.get_server_log==='1'){
                            s.clientSocketConnection[d.cnid].join('GRPLOG_'+d.ke)
                        }else{
                            s.clientSocketConnection[d.cnid].leave('GRPLOG_'+d.ke)
                        }
                    }
                    ///unchangeable from client side, so reset them in case they did.
                    d.form.details=JSON.parse(d.form.details)
                    s.beforeAccountSaveExtensions.forEach(function(extender){
                        extender(d)
                    })
                    //admin permissions
                    d.form.details.permissions=d.d.permissions
                    d.form.details.edit_size=d.d.edit_size
                    d.form.details.edit_days=d.d.edit_days
                    d.form.details.use_admin=d.d.use_admin
                    d.form.details.use_ldap=d.d.use_ldap
                    //check
                    if(d.d.edit_days=="0"){
                        d.form.details.days=d.d.days;
                    }
                    if(d.d.edit_size=="0"){
                        d.form.details.size=d.d.size;
                    }
                    if(d.d.sub){
                        d.form.details.sub=d.d.sub;
                        if(d.d.monitors){d.form.details.monitors=d.d.monitors;}
                        if(d.d.allmonitors){d.form.details.allmonitors=d.d.allmonitors;}
                        if(d.d.monitor_create){d.form.details.monitor_create=d.d.monitor_create;}
                        if(d.d.video_delete){d.form.details.video_delete=d.d.video_delete;}
                        if(d.d.video_view){d.form.details.video_view=d.d.video_view;}
                        if(d.d.monitor_edit){d.form.details.monitor_edit=d.d.monitor_edit;}
                        if(d.d.size){d.form.details.size=d.d.size;}
                        if(d.d.days){d.form.details.days=d.d.days;}
                        delete(d.form.details.mon_groups)
                    }
                    var newSize = d.form.details.size || 10000
                    d.form.details=JSON.stringify(d.form.details)
                    ///
                    d.set=[],d.ar=[];
                    if(d.form.pass&&d.form.pass!==''){d.form.pass=s.createHash(d.form.pass);}else{delete(d.form.pass)};
                    delete(d.form.password_again);
                    d.for=Object.keys(d.form);
                    d.for.forEach(function(v){
                        d.set.push(v+'=?'),d.ar.push(d.form[v]);
                    });
                    d.ar.push(d.ke),d.ar.push(d.uid);
                    s.sqlQuery('UPDATE Users SET '+d.set.join(',')+' WHERE ke=? AND uid=?',d.ar,function(err,r){
                        if(!d.d.sub){
                            var user = Object.assign(d.form,{ke : d.ke})
                            var userDetails = JSON.parse(d.form.details)
                            s.group[d.ke].sizeLimit = parseFloat(newSize)
                            s.onAccountSaveExtensions.forEach(function(extender){
                                extender(s.group[d.ke],userDetails)
                            })
                            s.unloadGroupAppExtensions.forEach(function(extender){
                                extender(user)
                            })
                            s.loadGroupApps(d)
                        }
                        if(d.cnid)s.tx({f:'user_settings_change',uid:d.uid,ke:d.ke,form:d.form},d.cnid)
                    })
                }
            }
        })
    }
}
