var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var request = require('request');
var webdav = require("webdav-fs");
module.exports = function(s,config,lang,io){
    s.purgeDiskForGroup = function(e,video){
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('purge',video)
        }
    }
    s.setDiskUsedForGroup = function(e,bytes){
        //`bytes` will be used as the value to add or substract
        if(s.group[e.ke].diskUsedEmitter){
            s.group[e.ke].diskUsedEmitter.emit('set',bytes)
        }
    }
    s.sendDiskUsedAmountToClients = function(e){
        //send the amount used disk space to connected users
        if(s.group[e.ke]&&s.group[e.ke].init){
            s.tx({f:'diskUsed',size:s.group[e.ke].usedSpace,limit:s.group[e.ke].sizeLimit},'GRP_'+e.ke);
        }
    }
    //user log
    s.log = function(e,x){
        if(!x||!e.mid){return}
        if((e.details&&e.details.sqllog==='1')||e.mid.indexOf('$')>-1){
            s.sqlQuery('INSERT INTO Logs (ke,mid,info) VALUES (?,?,?)',[e.ke,e.mid,s.s(x)]);
        }
        s.tx({f:'log',ke:e.ke,mid:e.mid,log:x,time:s.timeObject()},'GRPLOG_'+e.ke);
    //    s.systemLog('s.log : ',{f:'log',ke:e.ke,mid:e.mid,log:x,time:s.timeObject()},'GRP_'+e.ke)
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
        if(!e.limit||e.limit===''){e.limit=10000}else{e.limit=parseFloat(e.limit)}
        //save global space limit for group key (mb)
        s.group[e.ke].sizeLimit=e.limit;
        //save global used space as megabyte value
        s.group[e.ke].usedSpace=e.size/1000000;
        //emit the changes to connected users
        s.sendDiskUsedAmountToClients(e)
    }
    s.loadGroupApps = function(e){
        if(!s.group[e.ke].init){
            s.group[e.ke].init={};
        }
        s.sqlQuery('SELECT * FROM Users WHERE ke=? AND details NOT LIKE ?',[e.ke,'%"sub"%'],function(ar,r){
            if(r&&r[0]){
                r=r[0];
                ar=JSON.parse(r.details);
                //owncloud/webdav
                if(!s.group[e.ke].webdav &&
                   ar.webdav_user&&
                   ar.webdav_user!==''&&
                   ar.webdav_pass&&
                   ar.webdav_pass!==''&&
                   ar.webdav_url&&
                   ar.webdav_url!==''
                  ){
                    if(!ar.webdav_dir||ar.webdav_dir===''){
                        ar.webdav_dir='/'
                    }
                    ar.webdav_dir = s.checkCorrectPathEnding(ar.webdav_dir)
                    s.group[e.ke].webdav = webdav(
                        ar.webdav_url,
                        ar.webdav_user,
                        ar.webdav_pass
                    )
                }
                //Amazon S3
                if(!s.group[e.ke].aws &&
                   !s.group[e.ke].aws_s3 &&
                   ar.aws_s3 !== '0' &&
                   ar.aws_accessKeyId !== ''&&
                   ar.aws_secretAccessKey &&
                   ar.aws_secretAccessKey !== ''&&
                   ar.aws_region &&
                   ar.aws_region !== ''&&
                   ar.aws_s3_bucket !== ''
                  ){
                    if(!ar.aws_s3_dir || ar.aws_s3_dir === '/'){
                        ar.aws_s3_dir = ''
                    }
                    if(ar.aws_s3_dir !== ''){
                        ar.aws_s3_dir = s.checkCorrectPathEnding(ar.aws_s3_dir)
                    }
                    s.group[e.ke].aws = new require("aws-sdk")
                    s.group[e.ke].aws.config = new s.group[e.ke].aws.Config({
                        accessKeyId: ar.aws_accessKeyId,
                        secretAccessKey: ar.aws_secretAccessKey,
                        region: ar.aws_region
                    })
                    s.group[e.ke].aws_s3 = new s.group[e.ke].aws.S3();
                }
                //discordbot
                if(!s.group[e.ke].discordBot &&
                   config.discordBot === true &&
                   ar.discordbot === '1' &&
                   ar.discordbot_token !== ''
                  ){
                    s.group[e.ke].discordBot = new Discord.Client()
                    s.group[e.ke].discordBot.on('ready', () => {
                        console.log(`${r.mail} : Discord Bot Logged in as ${s.group[e.ke].discordBot.user.tag}!`)
                    })
                    s.group[e.ke].discordBot.login(ar.discordbot_token)
                }
                //disk Used Emitter
                if(!s.group[e.ke].diskUsedEmitter){
                    s.group[e.ke].diskUsedEmitter = new events.EventEmitter()
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
                        s.group[e.ke].usedSpace=s.group[e.ke].usedSpace+currentChange
                        //remove value just used from queue
                        s.sendDiskUsedAmountToClients(e)
                    })
                    s.group[e.ke].diskUsedEmitter.on('purge',function(currentPurge){
                        s.setDiskUsedForGroup(e,currentPurge.filesizeMB)
                        if(config.cron.deleteOverMax===true){
                                //set queue processor
                                var finish=function(){
                                    s.sendDiskUsedAmountToClients(e)
                                }
                                var deleteVideos = function(){
                                    //run purge command
                                    if(s.group[e.ke].usedSpace>(s.group[e.ke].sizeLimit*config.cron.deleteOverMaxOffset)){
                                            s.sqlQuery('SELECT * FROM Videos WHERE status != 0 AND details NOT LIKE \'%"archived":"1"%\' AND ke=? ORDER BY `time` ASC LIMIT 2',[e.ke],function(err,evs){
                                                k.del=[];k.ar=[e.ke];
                                                if(!evs)return console.log(err)
                                                evs.forEach(function(ev){
                                                    ev.dir=s.getVideoDirectory(ev)+s.formattedTime(ev.time)+'.'+ev.ext;
                                                    k.del.push('(mid=? AND `time`=?)');
                                                    k.ar.push(ev.mid),k.ar.push(ev.time);
                                                    s.file('delete',ev.dir);
                                                    s.setDiskUsedForGroup(e,-(ev.size/1000000))
                                                    s.tx({f:'video_delete',ff:'over_max',filename:s.formattedTime(ev.time)+'.'+ev.ext,mid:ev.mid,ke:ev.ke,time:ev.time,end:s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss')},'GRP_'+e.ke);
                                                });
                                                if(k.del.length>0){
                                                    k.qu=k.del.join(' OR ');
                                                    s.sqlQuery('DELETE FROM Videos WHERE ke =? AND ('+k.qu+')',k.ar,function(){
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
                            s.sendDiskUsedAmountToClients(e)
                        }
                    })
                }
                Object.keys(ar).forEach(function(v){
                    s.group[e.ke].init[v]=ar[v]
                })
            }
        });
    }
}
