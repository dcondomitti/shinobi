var moment = require('moment');
var crypto = require('crypto');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var events = require('events');
var http = require('http');
var https = require('https');
module.exports = function(s,config){
    //kill any ffmpeg running
    s.ffmpegKill=function(){
        var cmd=''
        if(s.isWin===true){
            cmd = "Taskkill /IM ffmpeg.exe /F"
        }else{
            cmd = "ps aux | grep -ie ffmpeg | awk '{print $2}' | xargs kill -9"
        }
        exec(cmd,{detached: true})
    };
    process.on('exit',s.ffmpegKill.bind(null,{cleanup:true}));
    process.on('SIGINT',s.ffmpegKill.bind(null, {exit:true}));
    s.checkRelativePath = function(x){
        if(x.charAt(0)!=='/'){
            x=s.mainDirectory+'/'+x
        }
        return x
    }
    s.checkDetails = function(e){
        if(!e.id && e.mid){e.id = e.mid}
        if(e.details&&(e.details instanceof Object)===false){
            try{e.details=JSON.parse(e.details)}catch(err){}
        }
    }
    s.parseJSON = function(string){
        try{
            string = JSON.parse(string)
        }catch(err){

        }
        return string
    }
    s.stringJSON = function(json){
        try{
            if(json instanceof Object){
                json = JSON.stringify(json)
            }
        }catch(err){

        }
        return json
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
        return x.replace('__DIR__',s.mainDirectory)
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
    }
    //fromLong taken from NPM package 'ip'
    s.fromLong=function(ipl) {
      return ((ipl >>> 24) + '.' +
          (ipl >> 16 & 255) + '.' +
          (ipl >> 8 & 255) + '.' +
          (ipl & 255) );
    }
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
}
