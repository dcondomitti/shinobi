var moment = require('moment');
var crypto = require('crypto');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var events = require('events');
var webdav = require("webdav-fs");
module.exports = function(s,config){
    //kill any ffmpeg running
    s.ffmpegKill=function(){
        var cmd=''
        if(s.isWin===true){
            cmd="Taskkill /IM ffmpeg.exe /F"
        }else{
            cmd="ps aux | grep -ie ffmpeg | awk '{print $2}' | xargs kill -9"
        }
        exec(cmd,{detached: true})
    };
    process.on('exit',s.ffmpegKill.bind(null,{cleanup:true}));
    process.on('SIGINT',s.ffmpegKill.bind(null, {exit:true}));
    s.checkRelativePath=function(x){
        if(x.charAt(0)!=='/'){
            x=s.currentDirectory+'/'+x
        }
        return x
    }
    s.addUserPassToUrl = function(url,user,pass){
        var splitted = url.split('://')
        splitted[1] = user + ':' + pass + '@' + splitted[1]
        return splitted.join('://')
    }
    s.checkCorrectPathEnding = function(x){
        var length=x.length
        if(x.charAt(length-1)!=='/'){
            x=x+'/'
        }
        return x.replace('__DIR__',s.currentDirectory)
    }
    s.md5 = function(x){return crypto.createHash('md5').update(x).digest("hex")}
    s.createHash = s.md5
    switch(config.passwordType){
        case'sha512':
            if(config.passwordSalt){
                s.createHash = function(x){return crypto.pbkdf2Sync(x, config.passwordSalt, 100000, 64, 'sha512').toString('hex')}
            }
        break;
        case'sha256':
            s.createHash = function(x){return crypto.createHash('sha256').update(x).digest("hex")}
        break;
    }
    //load camera controller vars
    s.nameToTime=function(x){x=x.split('.')[0].split('T'),x[1]=x[1].replace(/-/g,':');x=x.join(' ');return x;}
    s.ratio=function(width,height,ratio){ratio = width / height;return ( Math.abs( ratio - 4 / 3 ) < Math.abs( ratio - 16 / 9 ) ) ? '4:3' : '16:9';}
    s.randomNumber=function(x){
        if(!x){x=10};
        return Math.floor((Math.random() * x) + 1);
    };
    s.gid=function(x){
        if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    };
    s.nid=function(x){
        if(!x){x=6};var t = "";var p = "0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    };
    s.formattedTime_withOffset=function(e,x){
        if(!e){e=new Date};if(!x){x='YYYY-MM-DDTHH-mm-ss'};
        e=s.timeObject(e);if(config.utcOffset){e=e.utcOffset(config.utcOffset)}
        return e.format(x);
    }
    s.formattedTime=function(e,x){
        if(!e){e=new Date};if(!x){x='YYYY-MM-DDTHH-mm-ss'};
        return s.timeObject(e).format(x);
    }
    s.utcToLocal = function(time){
        return moment.utc(time).utcOffset(s.utcOffset).format()
    }
    s.localTimeObject = function(e,x){
        return moment(e)
    }
    if(config.useUTC === true){
        s.timeObject = function(time){
            return moment(time).utc()
        }
    }else{
        s.timeObject = moment
    }
    console.log('config.useUTC',config.useUTC)
    s.ipRange=function(start_ip, end_ip) {
      var start_long = s.toLong(start_ip);
      var end_long = s.toLong(end_ip);
      if (start_long > end_long) {
        var tmp=start_long;
        start_long=end_long
        end_long=tmp;
      }
      var range_array = [];
      var i;
      for (i=start_long; i<=end_long;i++) {
        range_array.push(s.fromLong(i));
      }
      return range_array;
    }
    s.portRange=function(lowEnd,highEnd){
        var list = [];
        for (var i = lowEnd; i <= highEnd; i++) {
            list.push(i);
        }
        return list;
    }
    //toLong taken from NPM package 'ip'
    s.toLong=function(ip) {
      var ipl = 0;
      ip.split('.').forEach(function(octet) {
        ipl <<= 8;
        ipl += parseInt(octet);
      });
      return(ipl >>> 0);
    };

    //fromLong taken from NPM package 'ip'
    s.fromLong=function(ipl) {
      return ((ipl >>> 24) + '.' +
          (ipl >> 16 & 255) + '.' +
          (ipl >> 8 & 255) + '.' +
          (ipl & 255) );
    };
    s.getFunctionParamNames = function(func) {
      var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
      var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
      if(result === null)
         result = [];
      return result;
    }
    s.getRequest = function(url,callback){
        return http.get(url, function(res){
            var body = '';
            res.on('data', function(chunk){
                body += chunk;
            });
            res.on('end',function(){
                try{body = JSON.parse(body)}catch(err){}
                callback(body)
            });
        }).on('error', function(e){
    //                              s.systemLog("Get Snapshot Error", e);
        });
    }
    //user log
    s.log=function(e,x){
        if(!x||!e.mid){return}
        if((e.details&&e.details.sqllog==='1')||e.mid.indexOf('$')>-1){
            s.sqlQuery('INSERT INTO Logs (ke,mid,info) VALUES (?,?,?)',[e.ke,e.mid,s.s(x)]);
        }
        s.tx({f:'log',ke:e.ke,mid:e.mid,log:x,time:s.timeObject()},'GRPLOG_'+e.ke);
    //    s.systemLog('s.log : ',{f:'log',ke:e.ke,mid:e.mid,log:x,time:s.timeObject()},'GRP_'+e.ke)
    }
    //system log
    s.systemLog = function(q,w,e){
        if(!w){w=''}
        if(!e){e=''}
        if(config.systemLog===true){
            if(typeof q==='string'&&s.databaseEngine){
                s.sqlQuery('INSERT INTO Logs (ke,mid,info) VALUES (?,?,?)',['$','$SYSTEM',s.s({type:q,msg:w})]);
                s.tx({f:'log',log:{time:s.timeObject(),ke:'$',mid:'$SYSTEM',time:s.timeObject(),info:s.s({type:q,msg:w})}},'$');
            }
            return console.log(s.timeObject().format(),q,w,e)
        }
    }
    //system log
    s.debugLog = function(q,w,e){
        if(config.debugLog === true){
            if(!w){w = ''}
            if(!e){e = ''}
            console.log(s.timeObject().format(),q,w,e)
            if(config.debugLogVerbose === true){
                console.log(new Error())
            }
        }
    }
    s.getOriginalUrl = function(req){
        var url
        if(config.baseURL || config.baseURL === ''){
            url = config.baseURL
        }else{
            url = req.protocol + '://' + req.get('host') + '/'
        }
        return url
    }
    s.file=function(x,e){
        if(!e){e={}};
        switch(x){
            case'size':
                 return fs.statSync(e.filename)["size"];
            break;
            case'delete':
                if(!e){return false;}
                return exec('rm -f '+e,{detached: true});
            break;
            case'deleteFolder':
                if(!e){return false;}
                return exec('rm -rf '+e,{detached: true});
            break;
            case'deleteFiles':
                if(!e.age_type){e.age_type='min'};if(!e.age){e.age='1'};
                exec('find '+e.path+' -type f -c'+e.age_type+' +'+e.age+' -exec rm -f {} +',{detached: true});
            break;
        }
    }
    ////Initiator Controller
    s.init=function(x,e,k,fn){
        if(!e){e={}}
        if(!k){k={}}
        switch(x){
            case 0://init camera
                if(!s.group[e.ke]){s.group[e.ke]={}};
                if(!s.group[e.ke].mon){s.group[e.ke].mon={}}
                if(!s.group[e.ke].mon[e.mid]){s.group[e.ke].mon[e.mid]={}}
                if(!s.group[e.ke].mon[e.mid].streamIn){s.group[e.ke].mon[e.mid].streamIn={}};
                if(!s.group[e.ke].mon[e.mid].emitterChannel){s.group[e.ke].mon[e.mid].emitterChannel={}};
                if(!s.group[e.ke].mon[e.mid].mp4frag){s.group[e.ke].mon[e.mid].mp4frag={}};
                if(!s.group[e.ke].mon[e.mid].firstStreamChunk){s.group[e.ke].mon[e.mid].firstStreamChunk={}};
                if(!s.group[e.ke].mon[e.mid].contentWriter){s.group[e.ke].mon[e.mid].contentWriter={}};
                if(!s.group[e.ke].mon[e.mid].childNodeStreamWriters){s.group[e.ke].mon[e.mid].childNodeStreamWriters={}};
                if(!s.group[e.ke].mon[e.mid].eventBasedRecording){s.group[e.ke].mon[e.mid].eventBasedRecording={}};
                if(!s.group[e.ke].mon[e.mid].watch){s.group[e.ke].mon[e.mid].watch={}};
                if(!s.group[e.ke].mon[e.mid].fixingVideos){s.group[e.ke].mon[e.mid].fixingVideos={}};
                if(!s.group[e.ke].mon[e.mid].record){s.group[e.ke].mon[e.mid].record={yes:e.record}};
                if(!s.group[e.ke].mon[e.mid].started){s.group[e.ke].mon[e.mid].started=0};
                if(s.group[e.ke].mon[e.mid].delete){clearTimeout(s.group[e.ke].mon[e.mid].delete)}
                if(!s.group[e.ke].mon_conf){s.group[e.ke].mon_conf={}}
            break;
            case'group':
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
                s.init('diskUsedEmit',e)
            break;
            case'apps':
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
                                s.init('diskUsedEmit',e)
                            })
                            s.group[e.ke].diskUsedEmitter.on('purge',function(currentPurge){
                                s.init('diskUsedSet',e,currentPurge.filesizeMB)
                                if(config.cron.deleteOverMax===true){
                                        //set queue processor
                                        var finish=function(){
                                            s.init('diskUsedEmit',e)
                                        }
                                        var deleteVideos = function(){
                                            //run purge command
                                            if(s.group[e.ke].usedSpace>(s.group[e.ke].sizeLimit*config.cron.deleteOverMaxOffset)){
                                                    s.sqlQuery('SELECT * FROM Videos WHERE status != 0 AND details NOT LIKE \'%"archived":"1"%\' AND ke=? ORDER BY `time` ASC LIMIT 2',[e.ke],function(err,evs){
                                                        k.del=[];k.ar=[e.ke];
                                                        if(!evs)return console.log(err)
                                                        evs.forEach(function(ev){
                                                            ev.dir=s.video('getDir',ev)+s.formattedTime(ev.time)+'.'+ev.ext;
                                                            k.del.push('(mid=? AND `time`=?)');
                                                            k.ar.push(ev.mid),k.ar.push(ev.time);
                                                            s.file('delete',ev.dir);
                                                            s.init('diskUsedSet',e,-(ev.size/1000000))
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
                                    s.init('diskUsedEmit',e)
                                }
                            })
                        }
                        Object.keys(ar).forEach(function(v){
                            s.group[e.ke].init[v]=ar[v]
                        })
                    }
                });
            break;
            case'sync':
                e.cn=Object.keys(s.childNodes);
                e.cn.forEach(function(v){
                    if(s.group[e.ke]){
                       s.cx({f:'sync',sync:s.init('noReference',s.group[e.ke].mon_conf[e.mid]),ke:e.ke,mid:e.mid},s.childNodes[v].cnid);
                    }
                });
            break;
            case'noReference':
                x={keys:Object.keys(e),ar:{}};
                x.keys.forEach(function(v){
                    if(v!=='last_frame'&&v!=='record'&&v!=='spawn'&&v!=='running'&&(v!=='time'&&typeof e[v]!=='function')){x.ar[v]=e[v];}
                });
                return x.ar;
            break;
            case'url':
                //build a complete url from pieces
                e.authd='';
                if(e.details.muser&&e.details.muser!==''&&e.host.indexOf('@')===-1) {
                    e.username = e.details.muser
                    e.password = e.details.mpass
                    e.authd=e.details.muser+':'+e.details.mpass+'@';
                }
                if(e.port==80&&e.details.port_force!=='1'){e.porty=''}else{e.porty=':'+e.port}
                e.url=e.protocol+'://'+e.authd+e.host+e.porty+e.path;return e.url;
            break;
            case'url_no_path':
                e.authd='';
                if(!e.details.muser){e.details.muser=''}
                if(!e.details.mpass){e.details.mpass=''}
                if(e.details.muser!==''&&e.host.indexOf('@')===-1) {
                    e.authd=e.details.muser+':'+e.details.mpass+'@';
                }
                if(e.port==80&&e.details.port_force!=='1'){e.porty=''}else{e.porty=':'+e.port}
                e.url=e.protocol+'://'+e.authd+e.host+e.porty;return e.url;
            break;
            case'diskUsedEmit':
                //send the amount used disk space to connected users
                if(s.group[e.ke]&&s.group[e.ke].init){
                    s.tx({f:'diskUsed',size:s.group[e.ke].usedSpace,limit:s.group[e.ke].sizeLimit},'GRP_'+e.ke);
                }
            break;
            case'diskUsedSet':
                //`k` will be used as the value to add or substract
                s.group[e.ke].diskUsedEmitter.emit('set',k)
            break;
            case'monitorStatus':
    //            s.discordMsg({
    //                author: {
    //                  name: s.group[e.ke].mon_conf[e.id].name,
    //                  icon_url: config.iconURL
    //                },
    //                title: lang['Status Changed'],
    //                description: lang['Monitor is now '+e.status],
    //                fields: [],
    //                timestamp: new Date(),
    //                footer: {
    //                  icon_url: config.iconURL,
    //                  text: "Shinobi Systems"
    //                }
    //            },[],e.ke)
                s.group[e.ke].mon[e.id].monitorStatus = e.status
                s.tx(Object.assign(e,{f:'monitor_status'}),'GRP_'+e.ke)
            break;
        }
        if(typeof e.callback==='function'){setTimeout(function(){e.callback()},500);}
    }
}
