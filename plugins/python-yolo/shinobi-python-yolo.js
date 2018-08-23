//
// Shinobi - Python YOLOv3 Plugin
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
process.on('uncaughtException', function (err) {
    console.error('uncaughtException',err);
});
//main vars
var fs=require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var moment = require('moment');
var http = require('http');
var express = require('express');
var socketIoClient = require('socket.io-client');
var config = require('./conf.json');
var http = require('http'),
    app = express(),
    server = http.createServer(app);
s={
    group:{},
    dir:{},
    isWin:(process.platform==='win32'),
    s:function(json){return JSON.stringify(json,null,3)}
}
s.checkCorrectPathEnding=function(x){
    var length=x.length
    if(x.charAt(length-1)!=='/'){
        x=x+'/'
    }
    return x.replace('__DIR__',__dirname)
}
s.debugLog = function(){
    if(config.debugLog === true){
        console.log(new Date(),arguments)
        if(config.debugLogVerbose === true){
            console.log(new Error())
        }
    }
}
if(!config.port){config.port=8080}
if(!config.pythonScript){config.pythonScript=__dirname+'/pumpkin.py'}
if(!config.pythonPort){config.pythonPort=7990}
if(!config.hostPort){config.hostPort=8082}
if(config.systemLog===undefined){config.systemLog=true}
if(config.alprConfig===undefined){config.alprConfig=__dirname+'/openalpr.conf'}
//default stream folder check
if(!config.streamDir){
    if(s.isWin===false){
        config.streamDir='/dev/shm'
    }else{
        config.streamDir=config.windowsTempDir
    }
    if(!fs.existsSync(config.streamDir)){
        config.streamDir=__dirname+'/streams/'
    }else{
        config.streamDir+='/streams/'
    }
}
s.dir.streams=config.streamDir;
//streams dir
if(!fs.existsSync(s.dir.streams)){
    fs.mkdirSync(s.dir.streams);
}
s.gid=function(x){
    if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < x; i++ )
        t += p.charAt(Math.floor(Math.random() * p.length));
    return t;
};
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
s.multiplerHeight = 0.75
s.multiplerWidth = 0.96
s.detectObject=function(buffer,d,tx){
  d.tmpFile=s.gid(5)+'.jpg'
  if(!fs.existsSync(s.dir.streams)){
      fs.mkdirSync(s.dir.streams);
  }
  d.dir=s.dir.streams+d.ke+'/'
  if(!fs.existsSync(d.dir)){
      fs.mkdirSync(d.dir);
  }
  d.dir=s.dir.streams+d.ke+'/'+d.id+'/'
  if(!fs.existsSync(d.dir)){
      fs.mkdirSync(d.dir);
  }
  fs.writeFile(d.dir+d.tmpFile,buffer,function(err){
      if(err) return s.systemLog(err);
      if(s.isPythonRunning === false){
          return console.log('Python Script is not Running.')
      }
      var callbackId = s.gid(10)
      s.group[d.ke][d.id].sendToPython({path:d.dir+d.tmpFile,id:callbackId},function(data){
          if(data.length > 0){
              var mats=[]
              data.forEach(function(v){
                  mats.push({
                    x:v.points[0] * s.multiplerWidth,
                    y:v.points[1] * s.multiplerHeight,
                    width:v.points[2],
                    height:v.points[3],
                    confidence:v.confidence,
                    tag:v.tag
                  })
              })
              tx({
                  f:'trigger',
                  id:d.id,
                  ke:d.ke,
                  details:{
                      plug:config.plug,
                      name:'yolo',
                      reason:'object',
                      matrices:mats,
                      imgHeight:d.mon.detector_scale_y,
                      imgWidth:d.mon.detector_scale_x
                  }
              })
          }
          delete(s.callbacks[callbackId])
          exec('rm -rf '+d.dir+d.tmpFile,{encoding:'utf8'})
      })
  })
}
s.systemLog=function(q,w,e){
    if(w===undefined){return}
    if(!w){w=''}
    if(!e){e=''}
    if(config.systemLog===true){
       return console.log(moment().format(),q,w,e)
    }
}
s.MainEventController=function(d,cn,tx){
    switch(d.f){
        case'init_plugin_as_host':
            if(!cn){
                console.log('No CN',d)
                return
            }
            if(d.key!==config.key){
                console.log(new Date(),'Plugin Key Mismatch',cn.request.connection.remoteAddress,d)
                cn.emit('init',{ok:false})
                cn.disconnect()
            }else{
                console.log(new Date(),'Plugin Connected to Client',cn.request.connection.remoteAddress)
                cn.emit('init',{ok:true,plug:config.plug,notice:config.notice,type:config.type})
            }
        break;
        case'init_monitor':
            if(s.group[d.ke]&&s.group[d.ke][d.id]){
                delete(s.group[d.ke][d.id].buffer)
            }
        break;
        case'frame':
            try{
                if(!s.group[d.ke]){
                    s.group[d.ke]={}
                }
                if(!s.group[d.ke][d.id]){
                    s.group[d.ke][d.id]={
                        sendToPython : s.createCameraBridgeToPython(d.ke+d.id)
                    }
                }
                if(!s.group[d.ke][d.id].buffer){
                  s.group[d.ke][d.id].buffer=[d.frame];
                }else{
                  s.group[d.ke][d.id].buffer.push(d.frame)
                }
                if(d.frame[d.frame.length-2] === 0xFF && d.frame[d.frame.length-1] === 0xD9){
                    s.detectObject(Buffer.concat(s.group[d.ke][d.id].buffer),d,tx)
                    s.group[d.ke][d.id].buffer=null;
                }
            }catch(err){
                if(err){
                    s.systemLog(err)
                    delete(s.group[d.ke][d.id].buffer)
                }
            }
        break;
    }
}
server.listen(config.hostPort);
//web pages and plugin api
app.get('/', function (req, res) {
  res.end('<b>'+config.plug+'</b> for Shinobi is running')
});
//Conector to Shinobi
if(config.mode==='host'){
    //start plugin as host
    var io = require('socket.io')(server);
    io.attach(server);
    s.connectedClients={};
    io.on('connection', function (cn) {
        s.connectedClients[cn.id]={id:cn.id}
        s.connectedClients[cn.id].tx = function(data){
            data.pluginKey=config.key;data.plug=config.plug;
            return io.to(cn.id).emit('ocv',data);
        }
        cn.on('f',function(d){
            s.MainEventController(d,cn,s.connectedClients[cn.id].tx)
        });
        cn.on('disconnect',function(d){
            delete(s.connectedClients[cn.id])
        })
    });
}else{
    //start plugin as client
    if(!config.host){config.host='localhost'}
    var io = socketIoClient('ws://'+config.host+':'+config.port);//connect to master
    s.cx=function(x){x.pluginKey=config.key;x.plug=config.plug;return io.emit('ocv',x)}
    io.on('connect',function(d){
        s.cx({f:'init',plug:config.plug,notice:config.notice,type:config.type});
    })
    io.on('disconnect',function(d){
        io.connect();
    })
    io.on('f',function(d){
        s.MainEventController(d,null,s.cx)
    })
}

//Start Python Controller
s.callbacks = {}
s.createCameraBridgeToPython = function(uniqueId){
    var pythonIo = socketIoClient('ws://localhost:'+config.pythonPort,{transports : ['websocket']});
    var sendToPython = function(data,callback){
        s.callbacks[data.id] = callback
        pythonIo.emit('f',data)
    }
    pythonIo.on('connect',function(d){
        s.debugLog(uniqueId+' is Connected from Python')
    })
    pythonIo.on('disconnect',function(d){
        s.debugLog(uniqueId+' is Disconnected from Python')
        setTimeout(function(){
            pythonIo.connect();
            s.debugLog(uniqueId+' is Attempting to Reconect to Python')
        },3000)
    })
    pythonIo.on('f',function(d){
        if(s.callbacks[d.id]){
            s.callbacks[d.id](d.data)
            delete(s.callbacks[d.id])
        }
    })
    return sendToPython
}


//Start Python Daemon
process.env.PYTHONUNBUFFERED = 1;
s.createPythonProcess = function(){
    s.isPythonRunning = false
    s.pythonScript = spawn('sh',[__dirname+'/bootPy.sh',config.pythonScript,__dirname]);
    var onStdErr = function (data) {
        s.debugLog('Python ERR')
        data = data.toString()
        s.debugLog(data)
        if(data.indexOf('Done!') > -1){
            console.log('PYTHON READY')
            s.isPythonRunning = true
            onStdErr = function(data){
                s.debugLog(data.toString())
            }
        }
    }
    s.pythonScript.stderr.on('data',onStdErr);

    s.pythonScript.stdout.on('data', function (data) {
        s.debugLog('Python OUT')
        s.debugLog(data.toString())
    });

    s.pythonScript.on('close', function () {
        s.debugLog('Python CLOSED')
    });
}
s.createPythonProcess()
