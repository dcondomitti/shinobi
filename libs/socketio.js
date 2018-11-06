var os = require('os');
var moment = require('moment');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var jsonfile = require("jsonfile");
var onvif = require("node-onvif");
module.exports = function(s,config,lang,io){
    s.clientSocketConnection = {}
    //send data to detector plugin
    s.ocvTx=function(data){
        if(!s.ocv){return}
        if(s.ocv.isClientPlugin===true){
            s.tx(data,s.ocv.id)
        }else{
            s.connectedPlugins[s.ocv.plug].tx(data)
        }
    }
    //send data to socket client function
    s.tx = function(z,y,x){if(x){return x.broadcast.to(y).emit('f',z)};io.to(y).emit('f',z);}
    s.txToDashcamUsers = function(data,groupKey){
        if(s.group[groupKey] && s.group[groupKey].dashcamUsers){
            Object.keys(s.group[groupKey].dashcamUsers).forEach(function(auth){
                s.tx(data,s.group[groupKey].dashcamUsers[auth].cnid)
            })
        }
    }
    s.txWithSubPermissions = function(z,y,permissionChoices){
        if(typeof permissionChoices==='string'){
            permissionChoices=[permissionChoices]
        }
        if(s.group[z.ke]){
            Object.keys(s.group[z.ke].users).forEach(function(v){
                var user = s.group[z.ke].users[v]
                if(user.details.sub){
                    if(user.details.allmonitors!=='1'){
                        var valid=0
                        var checked=permissionChoices.length
                        permissionChoices.forEach(function(b){
                            if(user.details[b] && user.details[b].indexOf(z.mid)!==-1){
                                ++valid
                            }
                        })
                        if(valid===checked){
                           s.tx(z,user.cnid)
                        }
                    }else{
                        s.tx(z,user.cnid)
                    }
                }else{
                    s.tx(z,user.cnid)
                }
            })
        }
    }

    ////socket controller
    io.on('connection', function (cn) {
        var tx;
        //set "client" detector plugin event function
        cn.on('ocv',function(d){
            if(!cn.pluginEngine&&d.f==='init'){
                if(config.pluginKeys[d.plug]===d.pluginKey){
                    s.pluginInitiatorSuccess("client",d,cn)
                }else{
                    s.pluginInitiatorFail("client",d,cn)
                }
            }else{
                if(config.pluginKeys[d.plug]===d.pluginKey){
                    s.pluginEventController(d)
                }else{
                    cn.disconnect()
                }
            }
        })
        //unique h265 socket stream
        cn.on('h265',function(d){
            if(!s.group[d.ke]||!s.group[d.ke].mon||!s.group[d.ke].mon[d.id]){
                cn.disconnect();return;
            }
            cn.ip=cn.request.connection.remoteAddress;
            var toUTC = function(){
                return new Date().toISOString();
            }
            var tx=function(z){cn.emit('data',z);}
            d.failed=function(msg){
                tx({f:'stop_reconnect',msg:msg,token_used:d.auth,ke:d.ke});
                cn.disconnect();
            }
            d.success=function(r){
                r=r[0];
                var Emitter,chunkChannel
                if(!d.channel){
                    Emitter = s.group[d.ke].mon[d.id].emitter
                    chunkChannel = 'MAIN'
                }else{
                    Emitter = s.group[d.ke].mon[d.id].emitterChannel[parseInt(d.channel)+config.pipeAddition]
                    chunkChannel = parseInt(d.channel)+config.pipeAddition
                }
                if(!Emitter){
                    cn.disconnect();return;
                }
                if(!d.channel)d.channel = 'MAIN';
                cn.ke=d.ke,
                cn.uid=d.uid,
                cn.auth=d.auth;
                cn.channel=d.channel;
                cn.removeListenerOnDisconnect=true;
                cn.socketVideoStream=d.id;
                var contentWriter
                cn.closeSocketVideoStream = function(){
                    Emitter.removeListener('data', contentWriter);
                }
                Emitter.on('data',contentWriter = function(base64){
                    tx(base64)
                })
             }
            //check if auth key is user's temporary session key
            if(s.group[d.ke]&&s.group[d.ke].users&&s.group[d.ke].users[d.auth]){
                d.success(s.group[d.ke].users[d.auth]);
            }else{
                s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND auth=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                    if(r&&r[0]){
                        d.success(r)
                    }else{
                        s.sqlQuery('SELECT * FROM API WHERE ke=? AND code=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                            if(r&&r[0]){
                                r=r[0]
                                r.details=JSON.parse(r.details)
                                if(r.details.auth_socket==='1'){
                                    s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND uid=?',[r.ke,r.uid],function(err,r) {
                                        if(r&&r[0]){
                                            d.success(r)
                                        }else{
                                            d.failed('User not found')
                                        }
                                    })
                                }else{
                                    d.failed('Permissions for this key do not allow authentication with Websocket')
                                }
                            }else{
                                d.failed('Not an API key')
                            }
                        })
                    }
                })
            }
        })
        //unique Base64 socket stream
        cn.on('Base64',function(d){
            if(!s.group[d.ke]||!s.group[d.ke].mon||!s.group[d.ke].mon[d.id]){
                cn.disconnect();return;
            }
            cn.ip=cn.request.connection.remoteAddress;
            var toUTC = function(){
                return new Date().toISOString();
            }
            var tx=function(z){cn.emit('data',z);}
            d.failed=function(msg){
                tx({f:'stop_reconnect',msg:msg,token_used:d.auth,ke:d.ke});
                cn.disconnect();
            }
            d.success=function(r){
                r=r[0];
                var Emitter,chunkChannel
                if(!d.channel){
                    Emitter = s.group[d.ke].mon[d.id].emitter
                    chunkChannel = 'MAIN'
                }else{
                    Emitter = s.group[d.ke].mon[d.id].emitterChannel[parseInt(d.channel)+config.pipeAddition]
                    chunkChannel = parseInt(d.channel)+config.pipeAddition
                }
                if(!Emitter){
                    cn.disconnect();return;
                }
                if(!d.channel)d.channel = 'MAIN';
                cn.ke=d.ke,
                cn.uid=d.uid,
                cn.auth=d.auth;
                cn.channel=d.channel;
                cn.removeListenerOnDisconnect=true;
                cn.socketVideoStream=d.id;
                var contentWriter
                cn.closeSocketVideoStream = function(){
                    Emitter.removeListener('data', contentWriter);
                }
                Emitter.on('data',contentWriter = function(base64){
                    tx(base64)
                })
             }
            //check if auth key is user's temporary session key
            if(s.group[d.ke]&&s.group[d.ke].users&&s.group[d.ke].users[d.auth]){
                d.success(s.group[d.ke].users[d.auth]);
            }else{
                s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND auth=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                    if(r&&r[0]){
                        d.success(r)
                    }else{
                        s.sqlQuery('SELECT * FROM API WHERE ke=? AND code=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                            if(r&&r[0]){
                                r=r[0]
                                r.details=JSON.parse(r.details)
                                if(r.details.auth_socket==='1'){
                                    s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND uid=?',[r.ke,r.uid],function(err,r) {
                                        if(r&&r[0]){
                                            d.success(r)
                                        }else{
                                            d.failed('User not found')
                                        }
                                    })
                                }else{
                                    d.failed('Permissions for this key do not allow authentication with Websocket')
                                }
                            }else{
                                d.failed('Not an API key')
                            }
                        })
                    }
                })
            }
        })
        //unique FLV socket stream
        cn.on('FLV',function(d){
            if(!s.group[d.ke]||!s.group[d.ke].mon||!s.group[d.ke].mon[d.id]){
                cn.disconnect();return;
            }
            cn.ip=cn.request.connection.remoteAddress;
            var toUTC = function(){
                return new Date().toISOString();
            }
            var tx=function(z){cn.emit('data',z);}
            d.failed=function(msg){
                tx({f:'stop_reconnect',msg:msg,token_used:d.auth,ke:d.ke});
                cn.disconnect();
            }
            d.success=function(r){
                r=r[0];
                var Emitter,chunkChannel
                if(!d.channel){
                    Emitter = s.group[d.ke].mon[d.id].emitter
                    chunkChannel = 'MAIN'
                }else{
                    Emitter = s.group[d.ke].mon[d.id].emitterChannel[parseInt(d.channel)+config.pipeAddition]
                    chunkChannel = parseInt(d.channel)+config.pipeAddition
                }
                if(!Emitter){
                    cn.disconnect();return;
                }
                if(!d.channel)d.channel = 'MAIN';
                cn.ke=d.ke,
                cn.uid=d.uid,
                cn.auth=d.auth;
                cn.channel=d.channel;
                cn.removeListenerOnDisconnect=true;
                cn.socketVideoStream=d.id;
                var contentWriter
                cn.closeSocketVideoStream = function(){
                    Emitter.removeListener('data', contentWriter);
                }
                tx({time:toUTC(),buffer:s.group[d.ke].mon[d.id].firstStreamChunk[chunkChannel]})
                Emitter.on('data',contentWriter = function(buffer){
                    tx({time:toUTC(),buffer:buffer})
                })
             }
            if(s.group[d.ke] && s.group[d.ke].users && s.group[d.ke].users[d.auth]){
                d.success(s.group[d.ke].users[d.auth]);
            }else{
                s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND auth=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                    if(r&&r[0]){
                        d.success(r)
                    }else{
                        s.sqlQuery('SELECT * FROM API WHERE ke=? AND code=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                            if(r&&r[0]){
                                r=r[0]
                                r.details=JSON.parse(r.details)
                                if(r.details.auth_socket==='1'){
                                    s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND uid=?',[r.ke,r.uid],function(err,r) {
                                        if(r&&r[0]){
                                            d.success(r)
                                        }else{
                                            d.failed('User not found')
                                        }
                                    })
                                }else{
                                    d.failed('Permissions for this key do not allow authentication with Websocket')
                                }
                            }else{
                                d.failed('Not an API key')
                            }
                        })
                    }
                })
            }
        })
        //unique MP4 socket stream
        cn.on('MP4',function(d){
            if(!s.group[d.ke]||!s.group[d.ke].mon||!s.group[d.ke].mon[d.id]){
                cn.disconnect();return;
            }
            cn.ip=cn.request.connection.remoteAddress;
            var toUTC = function(){
                return new Date().toISOString();
            }
            var tx=function(z){cn.emit('data',z);}
            d.failed=function(msg){
                tx({f:'stop_reconnect',msg:msg,token_used:d.auth,ke:d.ke});
                cn.disconnect();
            }
            d.success=function(r){
                r=r[0];
                var Emitter,chunkChannel
                if(!d.channel){
                    Emitter = s.group[d.ke].mon[d.id].emitter
                    chunkChannel = 'MAIN'
                }else{
                    Emitter = s.group[d.ke].mon[d.id].emitterChannel[parseInt(d.channel)+config.pipeAddition]
                    chunkChannel = parseInt(d.channel)+config.pipeAddition
                }
                if(!Emitter){
                    cn.disconnect();return;
                }
                if(!d.channel)d.channel = 'MAIN';
                cn.ke=d.ke,
                cn.uid=d.uid,
                cn.auth=d.auth;
                cn.channel=d.channel;
                cn.socketVideoStream=d.id;
                var mp4frag = s.group[d.ke].mon[d.id].mp4frag[d.channel];
                var onInitialized = () => {
                    cn.emit('mime', mp4frag.mime);
                    mp4frag.removeListener('initialized', onInitialized);
                };
                //event listener
                var onSegment = function(data){
                    cn.emit('segment', data);
                };
                cn.closeSocketVideoStream = function(){
                    if(mp4frag){
                        mp4frag.removeListener('segment', onSegment)
                        mp4frag.removeListener('initialized', onInitialized)
                    }
                }
                cn.on('MP4Command',function(msg){
                    switch (msg) {
                        case 'mime' ://client is requesting mime
                            var mime = mp4frag.mime;
                            if (mime) {
                                cn.emit('mime', mime);
                            } else {
                                mp4frag.on('initialized', onInitialized);
                            }
                        break;
                        case 'initialization' ://client is requesting initialization segment
                            cn.emit('initialization', mp4frag.initialization);
                        break;
                        case 'segment' ://client is requesting a SINGLE segment
                            var segment = mp4frag.segment;
                            if (segment) {
                                cn.emit('segment', segment);
                            } else {
                                mp4frag.once('segment', onSegment);
                            }
                        break;
                        case 'segments' ://client is requesting ALL segments
                            //send current segment first to start video asap
                            var segment = mp4frag.segment;
                            if (segment) {
                                cn.emit('segment', segment);
                            }
                            //add listener for segments being dispatched by mp4frag
                            mp4frag.on('segment', onSegment);
                        break;
                        case 'pause' :
                            mp4frag.removeListener('segment', onSegment);
                        break;
                        case 'resume' :
                            mp4frag.on('segment', onSegment);
                        break;
                        case 'stop' ://client requesting to stop receiving segments
                            cn.closeSocketVideoStream()
                        break;
                    }
                })
            }
            if(s.group[d.ke]&&s.group[d.ke].users&&s.group[d.ke].users[d.auth]){
                d.success(s.group[d.ke].users[d.auth]);
            }else{
                s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND auth=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                    if(r&&r[0]){
                        d.success(r)
                    }else{
                        s.sqlQuery('SELECT * FROM API WHERE ke=? AND code=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                            if(r&&r[0]){
                                r=r[0]
                                r.details=JSON.parse(r.details)
                                if(r.details.auth_socket==='1'){
                                    s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND uid=?',[r.ke,r.uid],function(err,r) {
                                        if(r&&r[0]){
                                            d.success(r)
                                        }else{
                                            d.failed('User not found')
                                        }
                                    })
                                }else{
                                    d.failed('Permissions for this key do not allow authentication with Websocket')
                                }
                            }else{
                                d.failed('Not an API key')
                            }
                        })
                    }
                })
            }
        })
        //main socket control functions
        cn.on('f',function(d){
            if(!cn.ke&&d.f==='init'){//socket login
                cn.ip=cn.request.connection.remoteAddress;
                tx=function(z){if(!z.ke){z.ke=cn.ke;};cn.emit('f',z);}
                d.failed=function(){tx({ok:false,msg:'Not Authorized',token_used:d.auth,ke:d.ke});cn.disconnect();}
                d.success=function(r){
                    r=r[0];cn.join('GRP_'+d.ke);cn.join('CPU');
                    cn.ke=d.ke,
                    cn.uid=d.uid,
                    cn.auth=d.auth;
                    if(!s.group[d.ke])s.group[d.ke]={};
    //                    if(!s.group[d.ke].vid)s.group[d.ke].vid={};
                    if(!s.group[d.ke].users)s.group[d.ke].users={};
    //                    s.group[d.ke].vid[cn.id]={uid:d.uid};
                    s.group[d.ke].users[d.auth] = {
                        cnid: cn.id,
                        uid: r.uid,
                        mail: r.mail,
                        details: JSON.parse(r.details),
                        logged_in_at: s.timeObject(new Date).format(),
                        login_type: 'Dashboard'
                    }
                    s.clientSocketConnection[cn.id] = cn
                    try{s.group[d.ke].users[d.auth].details=JSON.parse(r.details)}catch(er){}
                    if(s.group[d.ke].users[d.auth].details.get_server_log!=='0'){
                        cn.join('GRPLOG_'+d.ke)
                    }
                    s.group[d.ke].users[d.auth].lang=s.getLanguageFile(s.group[d.ke].users[d.auth].details.lang)
                    s.userLog({ke:d.ke,mid:'$USER'},{type:s.group[d.ke].users[d.auth].lang['Websocket Connected'],msg:{mail:r.mail,id:d.uid,ip:cn.ip}})
                    if(!s.group[d.ke].mon){
                        s.group[d.ke].mon={}
                        if(!s.group[d.ke].mon){s.group[d.ke].mon={}}
                    }
                    if(s.ocv){
                        tx({f:'detector_plugged',plug:s.ocv.plug,notice:s.ocv.notice})
                        s.ocvTx({f:'readPlugins',ke:d.ke})
                    }
                    tx({f:'users_online',users:s.group[d.ke].users})
                    s.tx({f:'user_status_change',ke:d.ke,uid:cn.uid,status:1,user:s.group[d.ke].users[d.auth]},'GRP_'+d.ke)
                    s.sendDiskUsedAmountToClients(d)
                    s.loadGroupApps(d)
                    s.sqlQuery('SELECT * FROM API WHERE ke=? AND uid=?',[d.ke,d.uid],function(err,rrr) {
                        tx({
                            f:'init_success',
                            users:s.group[d.ke].vid,
                            apis:rrr,
                            os:{
                                platform:s.platform,
                                cpuCount:s.coreCount,
                                totalmem:s.totalmem
                            }
                        })
                        try{
                            s.sqlQuery('SELECT * FROM Monitors WHERE ke=?', [d.ke], function(err,r) {
                                if(r && r[0]){
                                    r.forEach(function(monitor){
                                        s.cameraSendSnapshot({mid:monitor.mid,ke:monitor.ke,mon:monitor})
                                    })
                                }
                            })
                        }catch(err){
                            console.log(err)
                        }
                    })
                }
                s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND auth=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                    if(r&&r[0]){
                        d.success(r)
                    }else{
                        s.sqlQuery('SELECT * FROM API WHERE ke=? AND code=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                            if(r&&r[0]){
                                r=r[0]
                                r.details=JSON.parse(r.details)
                                if(r.details.auth_socket==='1'){
                                    s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND uid=?',[r.ke,r.uid],function(err,r) {
                                        if(r&&r[0]){
                                            d.success(r)
                                        }else{
                                            d.failed()
                                        }
                                    })
                                }else{
                                    d.failed()
                                }
                            }else{
                                d.failed()
                            }
                        })
                    }
                })
                return;
            }
            if((d.id||d.uid||d.mid)&&cn.ke){
                try{
                switch(d.f){
                    case'ocv_in':
                        s.ocvTx(d.data)
                    break;
                    case'monitorOrder':
                        if(d.monitorOrder&&d.monitorOrder instanceof Object){
                            s.sqlQuery('SELECT details FROM Users WHERE uid=? AND ke=?',[cn.uid,cn.ke],function(err,r){
                                if(r&&r[0]){
                                    r=JSON.parse(r[0].details);
                                    r.monitorOrder=d.monitorOrder;
                                    s.sqlQuery('UPDATE Users SET details=? WHERE uid=? AND ke=?',[JSON.stringify(r),cn.uid,cn.ke])
                                }
                            })
                        }
                    break;
                    case'update':
                        if(!config.updateKey){
                            tx({error:lang.updateKeyText1});
                            return;
                        }
                        if(d.key===config.updateKey){
                            exec('chmod +x '+s.mainDirectory+'/UPDATE.sh&&'+s.mainDirectory+'/UPDATE.sh',{detached: true})
                        }else{
                            tx({error:lang.updateKeyText2});
                        }
                    break;
                    case'cron':
                        if(s.group[cn.ke]&&s.group[cn.ke].users[cn.auth].details&&!s.group[cn.ke].users[cn.auth].details.sub){
                            s.tx({f:d.ff},s.cron.id)
                        }
                    break;
                    case'api':
                        switch(d.ff){
                            case'delete':
                                d.set=[],d.ar=[];
                                d.form.ke=cn.ke;d.form.uid=cn.uid;delete(d.form.ip);
                                if(!d.form.code){tx({f:'form_incomplete',form:'APIs',uid:cn.uid});return}
                                d.for=Object.keys(d.form);
                                d.for.forEach(function(v){
                                    d.set.push(v+'=?'),d.ar.push(d.form[v]);
                                });
                                s.sqlQuery('DELETE FROM API WHERE '+d.set.join(' AND '),d.ar,function(err,r){
                                    if(!err){
                                        tx({f:'api_key_deleted',form:d.form,uid:cn.uid});
                                        delete(s.api[d.form.code]);
                                    }else{
                                        s.systemLog('API Delete Error : '+e.ke+' : '+' : '+e.mid,err)
                                    }
                                })
                            break;
                            case'add':
                                d.set=[],d.qu=[],d.ar=[];
                                d.form.ke=cn.ke,d.form.uid=cn.uid,d.form.code=s.gid(30);
                                d.for=Object.keys(d.form);
                                d.for.forEach(function(v){
                                    d.set.push(v),d.qu.push('?'),d.ar.push(d.form[v]);
                                });
                                s.sqlQuery('INSERT INTO API ('+d.set.join(',')+') VALUES ('+d.qu.join(',')+')',d.ar,function(err,r){
                                    d.form.time=s.formattedTime(new Date,'YYYY-DD-MM HH:mm:ss');
                                    if(!err){tx({f:'api_key_added',form:d.form,uid:cn.uid});}else{s.systemLog(err)}
                                });
                            break;
                        }
                    break;
                    case'settings':
                        switch(d.ff){
                            case'filters':
                                switch(d.fff){
                                    case'save':case'delete':
                                        s.sqlQuery('SELECT details FROM Users WHERE ke=? AND uid=?',[d.ke,d.uid],function(err,r){
                                            if(r&&r[0]){
                                                r=r[0];
                                                d.d=JSON.parse(r.details);
                                                if(d.form.id===''){d.form.id=s.gid(5)}
                                                if(!d.d.filters)d.d.filters={};
                                                //save/modify or delete
                                                if(d.fff==='save'){
                                                    d.d.filters[d.form.id]=d.form;
                                                }else{
                                                    delete(d.d.filters[d.form.id]);
                                                }
                                                s.sqlQuery('UPDATE Users SET details=? WHERE ke=? AND uid=?',[JSON.stringify(d.d),d.ke,d.uid],function(err,r){
                                                    tx({f:'filters_change',uid:d.uid,ke:d.ke,filters:d.d.filters});
                                                });
                                            }
                                        })
                                    break;
                                }
                            break;
                            case'edit':
                                d.cnid = cn.id
                                s.accountSettingsEdit(d)
                            break;
                        }
                    break;
                    case'monitor':
                        switch(d.ff){
                            case'get':
                                switch(d.fff){
                                    case'videos&events':
                                        if(!d.eventLimit){
                                            d.eventLimit = 500
                                        }else{
                                            d.eventLimit = parseInt(d.eventLimit);
                                        }
                                        if(!d.eventStartDate&&d.startDate){
                                            d.eventStartDate = s.stringToSqlTime(d.startDate)
                                        }
                                        if(!d.eventEndDate&&d.endDate){
                                            d.eventEndDate = s.stringToSqlTime(d.endDate)
                                        }
                                        var monitorQuery = ''
                                        var monitorValues = []
                                        var permissions = s.group[d.ke].users[cn.auth].details;
                                        if(!d.mid){
                                            if(permissions.sub&&permissions.monitors&&permissions.allmonitors!=='1'){
                                                try{permissions.monitors=JSON.parse(permissions.monitors);}catch(er){}
                                                var or = [];
                                                permissions.monitors.forEach(function(v,n){
                                                    or.push('mid=?');
                                                    monitorValues.push(v)
                                                })
                                                monitorQuery += ' AND ('+or.join(' OR ')+')'
                                            }
                                        }else if(!permissions.sub||permissions.allmonitors!=='0'||permissions.monitors.indexOf(d.mid)>-1){
                                            monitorQuery += ' and mid=?';
                                            monitorValues.push(d.mid)
                                        }
                                        var getEvents = function(callback){
                                            var eventQuery = 'SELECT * FROM Events WHERE ke=?';
                                            var eventQueryValues = [cn.ke];
                                            if(d.eventStartDate&&d.eventStartDate!==''){
                                                if(d.eventEndDate&&d.eventEndDate!==''){
                                                    eventQuery+=' AND `time` >= ? AND `time` <= ?';
                                                    eventQueryValues.push(d.eventStartDate)
                                                    eventQueryValues.push(d.eventEndDate)
                                                }else{
                                                    eventQuery+=' AND `time` >= ?';
                                                    eventQueryValues.push(d.eventStartDate)
                                                }
                                            }
                                            if(monitorValues.length>0){
                                                eventQuery += monitorQuery;
                                                eventQueryValues = eventQueryValues.concat(monitorValues);
                                            }
                                            eventQuery+=' ORDER BY `time` DESC LIMIT '+d.eventLimit+'';
                                            s.sqlQuery(eventQuery,eventQueryValues,function(err,r){
                                                if(err){
                                                    console.log(eventQuery)
                                                    console.error('LINE 2428',err)
                                                    setTimeout(function(){
                                                        getEvents(callback)
                                                    },2000)
                                                }else{
                                                    if(!r){r=[]}
                                                    r.forEach(function(v,n){
                                                        r[n].details=JSON.parse(v.details);
                                                    })
                                                    callback(r)
                                                }
                                            })
                                        }
                                        if(!d.videoLimit&&d.limit){
                                            d.videoLimit=d.limit
                                            eventQuery.push()
                                        }
                                        if(!d.videoStartDate&&d.startDate){
                                            d.videoStartDate = s.stringToSqlTime(d.startDate)
                                        }
                                        if(!d.videoEndDate&&d.endDate){
                                            d.videoEndDate = s.stringToSqlTime(d.endDate)
                                        }
                                         var getVideos = function(callback){
                                            var videoQuery='SELECT * FROM Videos WHERE ke=?';
                                            var videoQueryValues=[cn.ke];
                                            if(d.videoStartDate||d.videoEndDate){
                                                if(!d.videoStartDateOperator||d.videoStartDateOperator==''){
                                                    d.videoStartDateOperator='>='
                                                }
                                                if(!d.videoEndDateOperator||d.videoEndDateOperator==''){
                                                    d.videoEndDateOperator='<='
                                                }
                                                switch(true){
                                                    case(d.videoStartDate&&d.videoStartDate!==''&&d.videoEndDate&&d.videoEndDate!==''):
                                                        videoQuery+=' AND `time` '+d.videoStartDateOperator+' ? AND `end` '+d.videoEndDateOperator+' ?';
                                                        videoQueryValues.push(d.videoStartDate)
                                                        videoQueryValues.push(d.videoEndDate)
                                                    break;
                                                    case(d.videoStartDate&&d.videoStartDate!==''):
                                                        videoQuery+=' AND `time` '+d.videoStartDateOperator+' ?';
                                                        videoQueryValues.push(d.videoStartDate)
                                                    break;
                                                    case(d.videoEndDate&&d.videoEndDate!==''):
                                                        videoQuery+=' AND `end` '+d.videoEndDateOperator+' ?';
                                                        videoQueryValues.push(d.videoEndDate)
                                                    break;
                                                }
                                            }
                                            if(monitorValues.length>0){
                                                videoQuery += monitorQuery;
                                                videoQueryValues = videoQueryValues.concat(monitorValues);
                                            }
                                            videoQuery+=' ORDER BY `time` DESC';
                                            if(!d.videoLimit||d.videoLimit==''){
                                                d.videoLimit='100'
                                            }
                                            if(d.videoLimit!=='0'){
                                                videoQuery+=' LIMIT '+d.videoLimit
                                            }
                                            s.sqlQuery(videoQuery,videoQueryValues,function(err,r){
                                                if(err){
                                                    console.log(videoQuery)
                                                    console.error('LINE 2416',err)
                                                    setTimeout(function(){
                                                        getVideos(callback)
                                                    },2000)
                                                }else{
                                                    s.buildVideoLinks(r,{
                                                        auth : cn.auth
                                                    })
                                                    callback({total:r.length,limit:d.videoLimit,videos:r})
                                                }
                                            })
                                        }
                                        getVideos(function(videos){
                                            getEvents(function(events){
                                                tx({
                                                    f:'drawPowerVideoMainTimeLine',
                                                    videos:videos,
                                                    events:events
                                                })
                                            })
                                        })
                                    break;
                                }
                            break;
                            case'control':
                                s.cameraControl(d,function(resp){
                                    tx({f:'control',response:resp})
                                })
                            break;
                            case'jpeg_off':
                              delete(cn.jpeg_on);
                                if(cn.monitorsCurrentlyWatching){
                                  Object.keys(cn.monitorsCurrentlyWatching).forEach(function(n,v){
                                      v=cn.monitorsCurrentlyWatching[n];
                                      cn.join('MON_STREAM_'+n);
                                  });
                                }
                                tx({f:'mode_jpeg_off'})
                            break;
                            case'jpeg_on':
                              cn.jpeg_on=true;
                                if(cn.monitorsCurrentlyWatching){
                                  Object.keys(cn.monitorsCurrentlyWatching).forEach(function(n,v){
                                      v=cn.monitorsCurrentlyWatching[n];
                                      cn.leave('MON_STREAM_'+n);
                                  })
                                }
                              tx({f:'mode_jpeg_on'})
                            break;
                            case'watch_on':
                                if(!d.ke){d.ke=cn.ke}
                                s.initiateMonitorObject({mid:d.id,ke:d.ke});
                                if(!s.group[d.ke]||!s.group[d.ke].mon[d.id]||s.group[d.ke].mon[d.id].isStarted === false){return false}
                                cn.join('MON_'+d.ke+d.id);
                                cn.join('DETECTOR_'+d.ke+d.id);
                                if(cn.jpeg_on !== true){
                                    cn.join('MON_STREAM_'+d.ke+d.id);
                                }
                                tx({f:'monitor_watch_on',id:d.id,ke:d.ke})
                                s.camera('watch_on',d,cn)
                            break;
                            case'watch_off':
                                if(!d.ke){d.ke=cn.ke;};
                                cn.leave('MON_'+d.ke+d.id);
                                s.camera('watch_off',d,cn);
                                tx({f:'monitor_watch_off',ke:d.ke,id:d.id,cnid:cn.id})
                            break;
                            case'start':case'stop':
                                s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND mid=?',[cn.ke,d.id],function(err,r) {
                                    if(r && r[0]){
                                        r = r[0]
                                        s.camera(d.ff,{type:r.type,url:s.buildMonitorUrl(r),id:d.id,mode:d.ff,ke:cn.ke});
                                    }
                                })
                            break;
                        }
                    break;
    //                case'video':
    //                    switch(d.ff){
    //                        case'fix':
    //                            s.video('fix',d)
    //                        break;
    //                    }
    //                break;
                    case'ffprobe':
                        if(s.group[cn.ke].users[cn.auth]){
                            switch(d.ff){
                                case'stop':
                                    exec('kill -9 '+s.group[cn.ke].users[cn.auth].ffprobe.pid,{detatched: true})
                                break;
                                default:
                                    if(s.group[cn.ke].users[cn.auth].ffprobe){
                                        return
                                    }
                                    s.group[cn.ke].users[cn.auth].ffprobe=1;
                                    tx({f:'ffprobe_start'})
                                    exec('ffprobe '+('-v quiet -print_format json -show_format -show_streams '+d.query),function(err,data){
                                        tx({f:'ffprobe_data',data:data.toString('utf8')})
                                        delete(s.group[cn.ke].users[cn.auth].ffprobe)
                                        tx({f:'ffprobe_stop'})
                                    })
                                    //auto kill in 30 seconds
                                    setTimeout(function(){
                                        exec('kill -9 '+d.pid,{detached: true})
                                    },30000)
                                break;
                            }
                        }
                    break;
                    case'onvif':
                        d.ip=d.ip.replace(/ /g,'');
                        d.port=d.port.replace(/ /g,'');
                        if(d.ip===''){
                            var interfaces = os.networkInterfaces();
                            var addresses = [];
                            for (var k in interfaces) {
                                for (var k2 in interfaces[k]) {
                                    var address = interfaces[k][k2];
                                    if (address.family === 'IPv4' && !address.internal) {
                                        addresses.push(address.address);
                                    }
                                }
                            }
                            d.arr=[]
                            addresses.forEach(function(v){
                                if(v.indexOf('0.0.0')>-1){return false}
                                v=v.split('.');
                                delete(v[3]);
                                v=v.join('.');
                                d.arr.push(v+'1-'+v+'254')
                            })
                            d.ip=d.arr.join(',')
                        }
                        if(d.port===''){
                            d.port='80,8080,8000,7575,8081,554'
                        }
                        d.ip.split(',').forEach(function(v){
                            if(v.indexOf('-')>-1){
                                v=v.split('-');
                                d.IP_RANGE_START = v[0],
                                d.IP_RANGE_END = v[1];
                            }else{
                                d.IP_RANGE_START = v;
                                d.IP_RANGE_END = v;
                            }
                            if(!d.IP_LIST){
                                d.IP_LIST = s.ipRange(d.IP_RANGE_START,d.IP_RANGE_END);
                            }else{
                                d.IP_LIST=d.IP_LIST.concat(s.ipRange(d.IP_RANGE_START,d.IP_RANGE_END))
                            }
                            //check port
                            if(d.port.indexOf('-')>-1){
                                d.port=d.port.split('-');
                                d.PORT_RANGE_START = d.port[0];
                                d.PORT_RANGE_END = d.port[1];
                                d.PORT_LIST = s.portRange(d.PORT_RANGE_START,d.PORT_RANGE_END);
                            }else{
                                d.PORT_LIST=d.port.split(',')
                            }
                            //check user name and pass
                            d.USERNAME='';
                            if(d.user){
                                d.USERNAME = d.user
                            }
                            d.PASSWORD='';
                            if(d.pass){
                                d.PASSWORD = d.pass
                            }
                        })
                        d.cams=[]
                        d.IP_LIST.forEach(function(ip_entry,n) {
                            d.PORT_LIST.forEach(function(port_entry,nn) {
                                var device = new onvif.OnvifDevice({
                                    xaddr : 'http://' + ip_entry + ':' + port_entry + '/onvif/device_service',
                                    user : d.USERNAME,
                                    pass : d.PASSWORD
                                })
                                device.init().then((info) => {
                                    var data = {
                                        f : 'onvif',
                                        ip : ip_entry,
                                        port : port_entry,
                                        info : info
                                    }
                                    device.services.device.getSystemDateAndTime().then((date) => {
                                        data.date = date
                                        device.services.media.getStreamUri({
                                            ProfileToken : device.current_profile.token,
                                            Protocol : 'RTSP'
                                        }).then((stream) => {
                                            data.uri = stream.data.GetStreamUriResponse.MediaUri.Uri
                                            tx(data)
                                        }).catch((error) => {
    //                                        console.log(error)
                                        });
                                    }).catch((error) => {
    //                                    console.log(error)
                                    });
                                }).catch(function(error){
    //                                console.log(error)
                                })
                            });
                        });
    //                    tx({f:'onvif_end'})
                    break;
                }
            }catch(er){
                s.systemLog('ERROR CATCH 1',er)
            }
            }else{
                tx({ok:false,msg:lang.NotAuthorizedText1});
            }
        });
        // super page socket functions
        cn.on('super',function(d){
            if(!cn.init&&d.f=='init'){
                d.ok=s.superAuth({mail:d.mail,pass:d.pass},function(data){
                    cn.mail=d.mail
                    cn.join('$');
                    var tempSessionKey = s.gid(30)
                    cn.superSessionKey = tempSessionKey
                    s.superUsersApi[tempSessionKey] = data
                    if(!data.$user.tokens)data.$user.tokens = {}
                    data.$user.tokens[tempSessionKey] = {}
                    cn.ip=cn.request.connection.remoteAddress
                    s.userLog({ke:'$',mid:'$USER'},{type:lang['Websocket Connected'],msg:{for:lang['Superuser'],id:cn.mail,ip:cn.ip}})
                    cn.init='super';
                    s.tx({f:'init_success',mail:d.mail,superSessionKey:tempSessionKey},cn.id);
                })
                if(d.ok===false){
                    cn.disconnect();
                }
            }else{
                if(cn.mail&&cn.init=='super'){
                    switch(d.f){
                        case'logs':
                            switch(d.ff){
                                case'delete':
                                    //config.webPaths.superApiPrefix+':auth/logs/delete'
                                    s.sqlQuery('DELETE FROM Logs WHERE ke=?',[d.ke])
                                break;
                            }
                        break;
                        case'system':
                            switch(d.ff){
                                case'update':
                                    //config.webPaths.superApiPrefix+':auth/update'
                                    s.ffmpegKill()
                                    s.systemLog('Shinobi ordered to update',{
                                        by:cn.mail,
                                        ip:cn.ip
                                    })
                                    var updateProcess = spawn('sh',(s.mainDirectory+'/UPDATE.sh').split(' '),{detached: true})
                                    updateProcess.stderr.on('data',function(data){
                                        s.systemLog('Update Info',data.toString())
                                    })
                                    updateProcess.stdout.on('data',function(data){
                                        s.systemLog('Update Info',data.toString())
                                    })
                                break;
                                case'restart':
                                    //config.webPaths.superApiPrefix+':auth/restart/:script'
                                    d.check=function(x){return d.target.indexOf(x)>-1}
                                    if(d.check('system')){
                                        s.systemLog('Shinobi ordered to restart',{by:cn.mail,ip:cn.ip})
                                        s.ffmpegKill()
                                        exec('pm2 restart '+s.mainDirectory+'/camera.js')
                                    }
                                    if(d.check('cron')){
                                        s.systemLog('Shinobi CRON ordered to restart',{by:cn.mail,ip:cn.ip})
                                        exec('pm2 restart '+s.mainDirectory+'/cron.js')
                                    }
                                    if(d.check('logs')){
                                        s.systemLog('Flush PM2 Logs',{by:cn.mail,ip:cn.ip})
                                        exec('pm2 flush')
                                    }
                                break;
                                case'configure':
                                    s.systemLog('conf.json Modified',{by:cn.mail,ip:cn.ip,old:jsonfile.readFileSync(s.location.config)})
                                    jsonfile.writeFile(s.location.config,d.data,{spaces: 2},function(){
                                        s.tx({f:'save_configuration'},cn.id)
                                    })
                                break;
                            }
                        break;
                        case'accounts':
                            switch(d.ff){
                                case'saveSuper':
                                    var currentSuperUserList = jsonfile.readFileSync(s.location.super)
                                    var currentSuperUser = {}
                                    var currentSuperUserPosition = -1
                                    //find this user in current list
                                    currentSuperUserList.forEach(function(user,pos){
                                        if(user.mail === cn.mail){
                                            currentSuperUser = user
                                            currentSuperUserPosition = pos
                                        }
                                    })
                                    var logDetails = {
                                        by : cn.mail,
                                        ip : cn.ip
                                    }
                                    //check if pass and pass_again match, if not remove password
                                    if(d.form.pass !== '' && d.form.pass === d.form.pass_again){
                                        d.form.pass = s.createHash(d.form.pass)
                                    }else{
                                        delete(d.form.pass)
                                    }
                                    //delete pass_again from object
                                    delete(d.form.pass_again)
                                    //set new values
                                    currentSuperUser = Object.assign(currentSuperUser,d.form)
                                    //reset email and log change of email
                                    if(d.form.mail !== cn.mail){
                                        logDetails.newEmail = d.form.mail
                                        logDetails.oldEmail = cn.mail + ''
                                        cn.mail = d.form.mail
                                    }
                                    //log this change
                                    s.systemLog('super.json Modified',logDetails)
                                    //modify or add account in temporary master list
                                    if(currentSuperUserList[currentSuperUserPosition]){
                                        currentSuperUserList[currentSuperUserPosition] = currentSuperUser
                                    }else{
                                        currentSuperUserList.push(currentSuperUser)
                                    }
                                    //update master list in system
                                    jsonfile.writeFile(s.location.super,currentSuperUserList,{spaces: 2},function(){
                                        s.tx({f:'save_preferences'},cn.id)
                                    })
                                break;
                                case'register':
                                    if(d.form.mail!==''&&d.form.pass!==''){
                                        if(d.form.pass===d.form.password_again){
                                            s.sqlQuery('SELECT * FROM Users WHERE mail=?',[d.form.mail],function(err,r) {
                                                if(r&&r[0]){
                                                    //found address already exists
                                                    d.msg=lang['Email address is in use.'];
                                                    s.tx({f:'error',ff:'account_register',msg:d.msg},cn.id)
                                                }else{
                                                    //create new
                                                    //user id
                                                    d.form.uid=s.gid();
                                                    //check to see if custom key set
                                                    if(!d.form.ke||d.form.ke===''){
                                                        d.form.ke=s.gid()
                                                    }else{
                                                        d.form.ke = d.form.ke.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
                                                    }
                                                    //write user to db
                                                    s.sqlQuery('INSERT INTO Users (ke,uid,mail,pass,details) VALUES (?,?,?,?,?)',[d.form.ke,d.form.uid,d.form.mail,s.createHash(d.form.pass),d.form.details])
                                                    s.tx({f:'add_account',details:d.form.details,ke:d.form.ke,uid:d.form.uid,mail:d.form.mail},'$');
                                                    //init user
                                                    s.loadGroup(d.form)
                                                }
                                            })
                                        }else{
                                            d.msg=lang["Passwords Don't Match"];
                                        }
                                    }else{
                                        d.msg=lang['Fields cannot be empty'];
                                    }
                                    if(d.msg){
                                        s.tx({f:'error',ff:'account_register',msg:d.msg},cn.id)
                                    }
                                break;
                                case'edit':
                                    s.sqlQuery('SELECT * FROM Users WHERE mail=?',[d.account.mail],function(err,r) {
                                        if(r && r[0]){
                                            r = r[0]
                                            var details = JSON.parse(r.details)
                                            if(d.form.pass&&d.form.pass!==''){
                                               if(d.form.pass===d.form.password_again){
                                                   d.form.pass=s.createHash(d.form.pass);
                                               }else{
                                                   s.tx({f:'error',ff:'edit_account',msg:lang["Passwords Don't Match"]},cn.id)
                                                   return
                                               }
                                            }else{
                                                delete(d.form.pass);
                                            }
                                            delete(d.form.password_again);
                                            d.keys=Object.keys(d.form);
                                            d.set=[];
                                            d.values=[];
                                            d.keys.forEach(function(v,n){
                                                if(d.set==='ke'||d.set==='password_again'||!d.form[v]){return}
                                                d.set.push(v+'=?')
                                                if(v === 'details'){
                                                    d.form[v] = JSON.stringify(Object.assign(details,JSON.parse(d.form[v])))
                                                }
                                                d.values.push(d.form[v])
                                            })
                                            d.values.push(d.account.mail)
                                            s.sqlQuery('UPDATE Users SET '+d.set.join(',')+' WHERE mail=?',d.values,function(err,r) {
                                                if(err){
                                                    console.log(err)
                                                    s.tx({f:'error',ff:'edit_account',msg:lang.AccountEditText1},cn.id)
                                                    return
                                                }
                                                s.tx({f:'edit_account',form:d.form,ke:d.account.ke,uid:d.account.uid},'$');
                                                delete(s.group[d.account.ke].init);
                                                s.loadGroupApps(d.account)
                                            })
                                        }
                                    })
                                break;
                                case'delete':
                                    s.sqlQuery('DELETE FROM Users WHERE uid=? AND ke=? AND mail=?',[d.account.uid,d.account.ke,d.account.mail])
                                    s.sqlQuery('DELETE FROM API WHERE uid=? AND ke=?',[d.account.uid,d.account.ke])
                                    s.tx({f:'delete_account',ke:d.account.ke,uid:d.account.uid,mail:d.account.mail},'$');
                                break;
                            }
                        break;
                    }
                }
            }
        })
        // admin page socket functions
        cn.on('a',function(d){
            if(!cn.init&&d.f=='init'){
                s.sqlQuery('SELECT * FROM Users WHERE auth=? AND uid=?',[d.auth,d.uid],function(err,r){
                    if(r&&r[0]){
                        r=r[0];
                        if(!s.group[d.ke]){s.group[d.ke]={users:{}}}
                        if(!s.group[d.ke].users[d.auth]){s.group[d.ke].users[d.auth]={cnid:cn.id,uid:d.uid,ke:d.ke,auth:d.auth}}
                        try{s.group[d.ke].users[d.auth].details=JSON.parse(r.details)}catch(er){}
                        cn.join('ADM_'+d.ke);
                        cn.ke=d.ke;
                        cn.uid=d.uid;
                        cn.auth=d.auth;
                        cn.init='admin';
                    }else{
                        cn.disconnect();
                    }
                })
            }else{
                s.auth({auth:d.auth,ke:d.ke,id:d.id,ip:cn.request.connection.remoteAddress},function(user){
                    if(!user.details.sub){
                        switch(d.f){
                            case'accounts':
                                switch(d.ff){
                                    case'edit':
                                        d.keys=Object.keys(d.form);
                                        d.condition=[];
                                        d.value=[];
                                        d.keys.forEach(function(v){
                                            d.condition.push(v+'=?')
                                            d.value.push(d.form[v])
                                        })
                                        d.value=d.value.concat([d.ke,d.$uid])
                                        s.sqlQuery("UPDATE Users SET "+d.condition.join(',')+" WHERE ke=? AND uid=?",d.value)
                                        s.tx({f:'edit_sub_account',ke:d.ke,uid:d.$uid,mail:d.mail,form:d.form},'ADM_'+d.ke);
                                        s.sqlQuery("SELECT * FROM API WHERE ke=? AND uid=?",[d.ke,d.$uid],function(err,rows){
                                            if(rows && rows[0]){
                                                rows.forEach(function(row){
                                                    delete(s.api[row.code])
                                                })
                                            }
                                        })
                                    break;
                                    case'delete':
                                        s.sqlQuery('DELETE FROM Users WHERE uid=? AND ke=? AND mail=?',[d.$uid,d.ke,d.mail])
                                        s.sqlQuery("SELECT * FROM API WHERE ke=? AND uid=?",[d.ke,d.$uid],function(err,rows){
                                            if(rows && rows[0]){
                                                rows.forEach(function(row){
                                                    delete(s.api[row.code])
                                                })
                                                s.sqlQuery('DELETE FROM API WHERE uid=? AND ke=?',[d.$uid,d.ke])
                                            }
                                        })
                                        s.tx({f:'delete_sub_account',ke:d.ke,uid:d.$uid,mail:d.mail},'ADM_'+d.ke);
                                    break;
                                }
                            break;
                        }
                    }
                })
            }
        })
        //functions for webcam recorder
        cn.on('r',function(d){
            if(!cn.ke&&d.f==='init'){
                s.sqlQuery('SELECT ke,uid,auth,mail,details FROM Users WHERE ke=? AND auth=? AND uid=?',[d.ke,d.auth,d.uid],function(err,r) {
                    if(r&&r[0]){
                        r=r[0]
                        cn.ke=d.ke,cn.uid=d.uid,cn.auth=d.auth;
                        if(!s.group[d.ke])s.group[d.ke]={};
                        if(!s.group[d.ke].users)s.group[d.ke].users={};
                        if(!s.group[d.ke].dashcamUsers)s.group[d.ke].dashcamUsers={};
                        s.group[d.ke].users[d.auth]={
                            cnid:cn.id,
                            ke : d.ke,
                            uid:r.uid,
                            mail:r.mail,
                            details:JSON.parse(r.details),
                            logged_in_at:s.timeObject(new Date).format(),
                            login_type:'Streamer'
                        }
                        s.group[d.ke].dashcamUsers[d.auth] = s.group[d.ke].users[d.auth]
                        if(s.group[d.ke].mon){
                            Object.keys(s.group[d.ke].mon).forEach(function(monitorId){
                                var dataToClient = {
                                    f : 'disable_stream',
                                    mid : monitorId,
                                    ke : d.ke
                                }
                                var mon = s.group[d.ke].mon[monitorId]
                                if(s.group[d.ke].mon_conf[monitorId].type === 'dashcam'){
                                    if(mon.allowStdinWrite === true){
                                        dataToClient.f = 'enable_stream'
                                    }
                                    s.tx(dataToClient,cn.id)
                                }
                            })
                        }
                    }
                })
            }else{
                if(s.group[d.ke] && s.group[d.ke].mon[d.mid]){
                    if(s.group[d.ke].mon[d.mid].allowStdinWrite === true){
                        switch(d.f){
                            case'monitor_chunk':
                                if(s.group[d.ke].mon[d.mid].isStarted !== true || !s.group[d.ke].mon[d.mid].spawn || !s.group[d.ke].mon[d.mid].spawn.stdin){
                                    s.tx({error:'Not Started'},cn.id);
                                    return false
                                };
                                s.group[d.ke].mon[d.mid].spawn.stdin.write(new Buffer(d.chunk, "binary"));
                            break;
                            case'monitor_frame':
                                if(s.group[d.ke].mon[d.mid].isStarted !== true){
                                    s.tx({error:'Not Started'},cn.id);
                                    return false
                                };
                                s.group[d.ke].mon[d.mid].spawn.stdin.write(d.frame);
                            break;
                        }
                    }else{
                        s.tx({error:'Cannot Write Yet'},cn.id)
                    }
                }else{
                    s.tx({error:'Non Existant Monitor'},cn.id)
                }
            }
        })
        //embed functions
        cn.on('e', function (d) {
            tx=function(z){if(!z.ke){z.ke=cn.ke;};cn.emit('f',z);}
            switch(d.f){
                case'init':
                        if(!s.group[d.ke]||!s.group[d.ke].mon[d.id]||s.group[d.ke].mon[d.id].isStarted === false){return false}
                    s.auth({auth:d.auth,ke:d.ke,id:d.id,ip:cn.request.connection.remoteAddress},function(user){
                        cn.embedded=1;
                        cn.ke=d.ke;
                        if(!cn.mid){cn.mid={}}
                        cn.mid[d.id]={};
    //                    if(!s.group[d.ke].embed){s.group[d.ke].embed={}}
    //                    if(!s.group[d.ke].embed[d.mid]){s.group[d.ke].embed[d.mid]={}}
    //                    s.group[d.ke].embed[d.mid][cn.id]={}

                        s.camera('watch_on',d,cn,tx)
                        cn.join('MON_'+d.ke+d.id);
                        cn.join('MON_STREAM_'+d.ke+d.id);
                        cn.join('DETECTOR_'+d.ke+d.id);
                        cn.join('STR_'+d.ke);
                        if(s.group[d.ke]&&s.group[d.ke].mon[d.id]&&s.group[d.ke].mon[d.id].watch){

                            tx({f:'monitor_watch_on',id:d.id,ke:d.ke},'MON_'+d.ke+d.id)
                            s.tx({viewers:Object.keys(s.group[d.ke].mon[d.id].watch).length,ke:d.ke,id:d.id},'MON_'+d.ke+d.id)
                       }
                    });
                break;
            }
        })
         //functions for retrieving cron announcements
         cn.on('cron',function(d){
             if(d.f==='init'){
                 if(config.cron.key){
                     if(config.cron.key===d.cronKey){
                        s.cron={started:moment(),last_run:moment(),id:cn.id};
                     }else{
                         cn.disconnect()
                     }
                 }else{
                     s.cron={started:moment(),last_run:moment(),id:cn.id};
                 }
             }else{
                 if(s.cron&&cn.id===s.cron.id){
                     delete(d.cronKey)
                     switch(d.f){
                         case'filters':
                             s.filterEvents(d.ff,d);
                         break;
                         case's.tx':
                             s.tx(d.data,d.to)
                         break;
                         case's.deleteVideo':
                             s.deleteVideo(d.file)
                         break;
                         case'start':case'end':
                             d.mid='_cron';s.userLog(d,{type:'cron',msg:d.msg})
                         break;
                         default:
                             s.systemLog('CRON : ',d)
                         break;
                     }
                 }else{
                     cn.disconnect()
                 }
             }
         })
        cn.on('disconnect', function () {
            if(cn.socketVideoStream){
                cn.closeSocketVideoStream()
                return
            }
            if(cn.ke){
                if(cn.monitorsCurrentlyWatching){
                    cn.monitor_count=Object.keys(cn.monitorsCurrentlyWatching)
                    if(cn.monitor_count.length>0){
                        cn.monitor_count.forEach(function(v){
                            s.camera('watch_off',{id:v,ke:cn.monitorsCurrentlyWatching[v].ke},{id:cn.id,ke:cn.ke,uid:cn.uid})
                        })
                    }
                }else if(!cn.embedded){
                    if(s.group[cn.ke].users[cn.auth]){
                        if(s.group[cn.ke].users[cn.auth].login_type === 'Dashboard'){
                            s.tx({f:'user_status_change',ke:cn.ke,uid:cn.uid,status:0})
                        }
                        s.userLog({ke:cn.ke,mid:'$USER'},{type:lang['Websocket Disconnected'],msg:{mail:s.group[cn.ke].users[cn.auth].mail,id:cn.uid,ip:cn.ip}})
                        delete(s.group[cn.ke].users[cn.auth]);
                    }
                    if(s.group[cn.ke].dashcamUsers && s.group[cn.ke].dashcamUsers[cn.auth])delete(s.group[cn.ke].dashcamUsers[cn.auth]);
                }
            }
            if(cn.pluginEngine){
                s.connectedPlugins[cn.pluginEngine].plugged=false
                s.tx({f:'plugin_engine_unplugged',plug:cn.pluginEngine},'CPU')
                delete(s.api[cn.pluginEngine])
            }
            if(cn.cron){
                delete(s.cron);
            }
            if(cn.ocv){
                s.tx({f:'detector_unplugged',plug:s.ocv.plug},'CPU')
                delete(s.ocv);
                delete(s.api[cn.id])
            }
            if(cn.superSessionKey){
                delete(s.superUsersApi[cn.superSessionKey])
            }
            delete(s.clientSocketConnection[cn.id])
        })
    });
}
