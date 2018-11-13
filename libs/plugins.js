var socketIOclient = require('socket.io-client');
module.exports = function(s,config,lang){
    //function for receiving detector data
    s.pluginEventController=function(d){
        switch(d.f){
            case'trigger':
                s.triggerEvent(d)
            break;
            case's.tx':
                s.tx(d.data,d.to)
            break;
            case's.sqlQuery':
                s.sqlQuery(d.query,d.values)
            break;
            case'log':
                s.systemLog('PLUGIN : '+d.plug+' : ',d)
            break;
        }
    }
    //multi plugin connections
    s.connectedPlugins={}
    s.pluginInitiatorSuccess=function(mode,d,cn){
        s.systemLog('pluginInitiatorSuccess',d)
        if(mode==='client'){
            //is in client mode (camera.js is client)
            cn.pluginEngine=d.plug
            if(!s.connectedPlugins[d.plug]){
                s.connectedPlugins[d.plug]={plug:d.plug}
            }
            s.systemLog('Connected to plugin : Detector - '+d.plug+' - '+d.type)
            switch(d.type){
                default:case'detector':
                    s.ocv = {
                        started: s.timeObject(),
                        id: cn.id,
                        plug: d.plug,
                        notice: d.notice,
                        isClientPlugin: true,
                        connectionType: d.connectionType
                    };
                    cn.ocv = 1;
                    s.tx({f:'detector_plugged',plug:d.plug,notice:d.notice},'CPU')
                break;
            }
        }else{
            //is in host mode (camera.js is client)
            switch(d.type){
                default:case'detector':
                    s.ocv = {
                        started:s.timeObject(),
                        id:"host",
                        plug:d.plug,
                        notice:d.notice,
                        isHostPlugin:true,
                        connectionType: d.connectionType
                    };
                break;
            }
        }
        s.connectedPlugins[d.plug].plugged=true
        s.tx({f:'readPlugins',ke:d.ke},'CPU')
        s.ocvTx({f:'api_key',key:d.plug})
        s.api[d.plug]={pluginEngine:d.plug,permissions:{},details:{},ip:'0.0.0.0'};
    }
    s.pluginInitiatorFail=function(mode,d,cn){
        if(s.connectedPlugins[d.plug])s.connectedPlugins[d.plug].plugged=false
        if(mode==='client'){
            //is in client mode (camera.js is client)
            cn.disconnect()
        }else{
            //is in host mode (camera.js is client)
        }
    }
    if(config.plugins&&config.plugins.length>0){
        config.plugins.forEach(function(v){
            s.connectedPlugins[v.id]={plug:v.id}
            if(v.enabled===false){return}
            if(v.mode==='host'){
                //is in host mode (camera.js is client)
                if(v.https===true){
                    v.https='https://'
                }else{
                    v.https='http://'
                }
                if(!v.port){
                    v.port=80
                }
                var socket = socketIOclient(v.https+v.host+':'+v.port)
                s.connectedPlugins[v.id].tx = function(x){return socket.emit('f',x)}
                socket.on('connect', function(cn){
                    s.systemLog('Connected to plugin (host) : '+v.id)
                    s.connectedPlugins[v.id].tx({f:'init_plugin_as_host',key:v.key})
                });
                socket.on('init',function(d){
                    s.systemLog('Initialize Plugin : Host',d)
                    if(d.ok===true){
                        s.pluginInitiatorSuccess("host",d)
                    }else{
                        s.pluginInitiatorFail("host",d)
                    }
                });
                socket.on('ocv',s.pluginEventController);
                socket.on('disconnect', function(){
                    s.connectedPlugins[v.id].plugged=false
                    delete(s.api[v.id])
                    s.systemLog('Plugin Disconnected : '+v.id)
                    s.connectedPlugins[v.id].reconnector = setInterval(function(){
                        if(socket.connected===true){
                            clearInterval(s.connectedPlugins[v.id].reconnector)
                        }else{
                            socket.connect()
                        }
                    },1000*2)
                });
                s.connectedPlugins[v.id].ws = socket;
            }
        })
    }
}
