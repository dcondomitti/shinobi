var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
module.exports = function(s,config,lang,io){
    //check disk space every 20 minutes
    if(config.autoDropCache===true){
        setInterval(function(){
            exec('echo 3 > /proc/sys/vm/drop_caches',{detached: true})
        },60000*20);
    }
    s.sendDiskUsedAmountToClients = function(e){
        //send the amount used disk space to connected users
        if(s.group[e.ke]&&s.group[e.ke].init){
            s.tx({f:'diskUsed',size:s.group[e.ke].usedSpace,limit:s.group[e.ke].sizeLimit},'GRP_'+e.ke);
        }
    }
    s.beat=function(){
        setTimeout(s.beat, 8000);
        io.sockets.emit('ping',{beat:1});
    }
    s.beat();
    s.processReady = function(){
        s.systemLog(lang.startUpText5)
        process.send('ready')
    }
    s.cpuUsage=function(e){
        k={}
        switch(s.platform){
            case'win32':
                k.cmd="@for /f \"skip=1\" %p in ('wmic cpu get loadpercentage') do @echo %p%"
            break;
            case'darwin':
                k.cmd="ps -A -o %cpu | awk '{s+=$1} END {print s}'";
            break;
            case'linux':
                k.cmd='LANG=C top -b -n 2 | grep "^'+config.cpuUsageMarker+'" | awk \'{print $2}\' | tail -n1';
            break;
        }
        if(config.customCpuCommand){
          exec(config.customCpuCommand,{encoding:'utf8',detached: true},function(err,d){
              if(s.isWin===true) {
                  d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
              }
              e(d)
          });
        } else if(k.cmd){
             exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                 if(s.isWin===true){
                     d=d.replace(/(\r\n|\n|\r)/gm,"").replace(/%/g,"")
                 }
                 e(d)
             });
        } else{
            e(0)
        }
    }
    s.ramUsage=function(e){
        k={}
        switch(s.platform){
            case'win32':
                k.cmd = "wmic OS get FreePhysicalMemory /Value"
            break;
            case'darwin':
                k.cmd = "vm_stat | awk '/^Pages free: /{f=substr($3,1,length($3)-1)} /^Pages active: /{a=substr($3,1,length($3-1))} /^Pages inactive: /{i=substr($3,1,length($3-1))} /^Pages speculative: /{s=substr($3,1,length($3-1))} /^Pages wired down: /{w=substr($4,1,length($4-1))} /^Pages occupied by compressor: /{c=substr($5,1,length($5-1)); print ((a+w)/(f+a+i+w+s+c))*100;}'"
            break;
            default:
                k.cmd = "LANG=C free | grep Mem | awk '{print $4/$2 * 100.0}'";
            break;
        }
        if(k.cmd){
             exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                 if(s.isWin===true){
                     d=(parseInt(d.split('=')[1])/(s.totalmem/1000))*100
                 }
                 e(d)
             });
        }else{
            e(0)
        }
    }
}
