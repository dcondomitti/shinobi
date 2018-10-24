var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
module.exports = function(s,config,lang,app,io){
    //setup Master for childNodes
    if(config.childNodes.enabled === true && config.childNodes.mode === 'master'){
        s.childNodes = {};
        var childNodeHTTP = express();
        var childNodeServer = http.createServer(app);
        var childNodeWebsocket = new (require('socket.io'))()
        childNodeServer.listen(config.childNodes.port,config.bindip,function(){
            console.log(lang.Shinobi+' - CHILD NODE PORT : '+config.childNodes.port);
        });
        s.debugLog('childNodeWebsocket.attach(childNodeServer)')
        childNodeWebsocket.attach(childNodeServer);
        //send data to child node function (experimental)
        s.cx = function(z,y,x){
            if(!z.mid && !z.d){
                console.error('Missing ID')
            }else if(x){
                x.broadcast.to(y).emit('c',z)
            }else{
                childNodeWebsocket.to(y).emit('c',z)
            }
        }
        //child Node Websocket
        childNodeWebsocket.on('connection', function (cn) {
            //functions for dispersing work to child servers;
            cn.on('c',function(d){
                if(config.childNodes.key.indexOf(d.socketKey) > -1){
                    if(!cn.shinobi_child&&d.f=='init'){
                        cn.ip = cn.request.connection.remoteAddress.replace('::ffff:','')+':'+d.port
                        cn.shinobi_child = 1
                        tx = function(z){
                            cn.emit('c',z)
                        }
                        if(!s.childNodes[cn.ip]){
                            s.childNodes[cn.ip] = {}
                        };
                        s.childNodes[cn.ip].cnid = cn.id
                        s.childNodes[cn.ip].cpu = 0
                        s.childNodes[cn.ip].activeCameras = {}
                        d.availableHWAccels.forEach(function(accel){
                            if(config.availableHWAccels.indexOf(accel) === -1)config.availableHWAccels.push(accel)
                        })
                        tx({
                            f : 'init_success',
                            childNodes : s.childNodes
                        })
                        s.childNodes[cn.ip].coreCount = d.coreCount
                    }else{
                        switch(d.f){
                            case'cpu':
                                s.childNodes[cn.ip].cpu = d.cpu;
                            break;
                            case'sql':
                                s.sqlQuery(d.query,d.values,function(err,rows){
                                    cn.emit('c',{f:'sqlCallback',rows:rows,err:err,callbackId:d.callbackId});
                                });
                            break;
                            case'camera':
                                s.camera(d.mode,d.data)
                            break;
                            case's.tx':
                                s.tx(d.data,d.to)
                            break;
                            case's.userLog':
                                if(!d.mon || !d.data)return console.log('LOG DROPPED',d.mon,d.data);
                                s.userLog(d.mon,d.data)
                            break;
                            case'created_file_chunk':
                                if(!s.group[d.ke].mon[d.mid].childNodeStreamWriters[d.filename]){
                                    d.dir = s.getVideoDirectory(s.group[d.ke].mon_conf[d.mid])
                                    s.group[d.ke].mon[d.mid].childNodeStreamWriters[d.filename] = fs.createWriteStream(d.dir+d.filename)
                                }
                                s.group[d.ke].mon[d.mid].childNodeStreamWriters[d.filename].write(d.chunk)
                            break;
                            case'created_file':
                                if(!s.group[d.ke].mon[d.mid].childNodeStreamWriters[d.filename]){
                                    return console.log('FILE NOT EXIST')
                                }
                                s.group[d.ke].mon[d.mid].childNodeStreamWriters[d.filename].end();
                                tx({
                                    f:'delete',
                                    file:d.filename,
                                    ke:d.ke,
                                    mid:d.mid
                                });
                                s.txWithSubPermissions({
                                    f:'video_build_success',
                                    hrefNoAuth:'/videos/'+d.ke+'/'+d.mid+'/'+d.filename,
                                    filename:d.filename,
                                    mid:d.mid,
                                    ke:d.ke,
                                    time:d.time,
                                    size:d.filesize,
                                    end:d.end
                                },'GRP_'+d.ke,'video_view')
                                //save database row
                                var insert = {
                                    startTime : d.time,
                                    filesize : d.filesize,
                                    endTime : d.end,
                                    dir : s.getVideoDirectory(d.d),
                                    file : d.filename,
                                    filename : d.filename,
                                    filesizeMB : parseFloat((d.filesize/1000000).toFixed(2))
                                }
                                s.insertDatabaseRow(d.d,insert)
                                s.insertCompletedVideoExtensions.forEach(function(extender){
                                    extender(d.d,insert)
                                })
                                //purge over max
                                s.purgeDiskForGroup(d)
                                //send new diskUsage values
                                s.setDiskUsedForGroup(d,insert.filesizeMB)
                                clearTimeout(s.group[d.ke].mon[d.mid].recordingChecker)
                                clearTimeout(s.group[d.ke].mon[d.mid].streamChecker)
                            break;
                        }
                    }
                }
            })
            cn.on('disconnect',function(){
                console.log('childNodeWebsocket.disconnect')

                if(s.childNodes[cn.ip]){
                    var activeCameraKeys = Object.keys(s.childNodes[cn.ip].activeCameras)
                    activeCameraKeys.forEach(function(key){
                        var monitor = s.childNodes[cn.ip].activeCameras[key]
                        s.camera('stop',s.cleanMonitorObject(monitor))
                        delete(s.group[monitor.ke].mon[monitor.mid].childNode)
                        delete(s.group[monitor.ke].mon[monitor.mid].childNodeId)
                        setTimeout(function(){
                            s.camera(monitor.mode,s.cleanMonitorObject(monitor))
                        },1300)
                    })
                    delete(s.childNodes[cn.ip]);
                }
            })
        })
    }else
    //setup Child for childNodes
    if(config.childNodes.enabled === true && config.childNodes.mode === 'child' && config.childNodes.host){
        s.connected = false;
        childIO = require('socket.io-client')('ws://'+config.childNodes.host);
        s.cx = function(x){x.socketKey = config.childNodes.key;childIO.emit('c',x)}
        s.tx = function(x,y){s.cx({f:'s.tx',data:x,to:y})}
        s.userLog = function(x,y){s.cx({f:'s.userLog',mon:x,data:y})}
        s.queuedSqlCallbacks = {}
        s.sqlQuery = function(query,values,onMoveOn){
            var callbackId = s.gid()
            if(!values){values=[]}
            if(typeof values === 'function'){
                var onMoveOn = values;
                var values = [];
            }
            if(typeof onMoveOn !== 'function'){onMoveOn=function(){}}
            s.queuedSqlCallbacks[callbackId] = onMoveOn
            s.cx({f:'sql',query:query,values:values,callbackId:callbackId});
        }
        setInterval(function(){
            s.cpuUsage(function(cpu){
                io.emit('c',{f:'cpu',cpu:parseFloat(cpu)});
            })
        },2000);
        childIO.on('connect', function(d){
            console.log('CHILD CONNECTION SUCCESS')
            s.cx({
                f : 'init',
                port : config.port,
                coreCount : s.coreCount,
                availableHWAccels : config.availableHWAccels
            })
        })
        childIO.on('c', function (d) {
            switch(d.f){
                case'sqlCallback':
                    if(s.queuedSqlCallbacks[d.callbackId]){
                        s.queuedSqlCallbacks[d.callbackId](d.err,d.rows)
                        delete(s.queuedSqlCallbacks[d.callbackId])
                    }
                break;
                case'init_success':
                    s.connected=true;
                    s.other_helpers=d.child_helpers;
                break;
                case'kill':
                    s.initiateMonitorObject(d.d);
                    s.cameraDestroy(s.group[d.d.ke].mon[d.d.id].spawn,d.d)
                break;
                case'sync':
                    s.initiateMonitorObject(d.sync);
                    Object.keys(d.sync).forEach(function(v){
                        s.group[d.sync.ke].mon[d.sync.mid][v]=d.sync[v];
                    });
                break;
                case'delete'://delete video
                    s.file('delete',s.dir.videos+d.ke+'/'+d.mid+'/'+d.file)
                break;
                case'insertCompleted'://close video
                    s.insertCompletedVideo(d.d,d.k)
                break;
                case'cameraStop'://start camera
                    s.camera('stop',d.d)
                break;
                case'cameraStart'://start or record camera
                    s.camera(d.mode,d.d)
                break;
            }
        })
        childIO.on('disconnect',function(d){
            s.connected = false;
        })
    }
}
