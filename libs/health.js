var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
module.exports = function(s,config,lang,io){
    s.sendDiskUsedAmountToClients = function(e){
        //send the amount used disk space to connected users
        if(s.group[e.ke]&&s.group[e.ke].init){
            s.tx({f:'diskUsed',size:s.group[e.ke].usedSpace,limit:s.group[e.ke].sizeLimit},'GRP_'+e.ke);
        }
    }
    s.heartBeat = function(){
        setTimeout(s.heartBeat, 8000);
        io.sockets.emit('ping',{beat:1});
    }
    s.heartBeat()
    s.cpuUsage = function(callback){
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
            case'freebsd':
                k.cmd='vmstat 1 2 | tail -1 | awk \'{print $17}\''
            break;
        }
        if(config.customCpuCommand){
          exec(config.customCpuCommand,{encoding:'utf8',detached: true},function(err,d){
              if(s.isWin===true) {
                  d = d.replace(/(\r\n|\n|\r)/gm, "").replace(/%/g, "")
              }
              callback(d)
          });
        } else if(k.cmd){
             exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                 if(s.isWin===true){
                     d=d.replace(/(\r\n|\n|\r)/gm,"").replace(/%/g,"")
                 }
                 callback(d)
             });
        } else {
            callback(0)
        }
    }
    s.ramUsage = function(callback){
        k={}
        switch(s.platform){
            case'win32':
                k.cmd = "wmic OS get FreePhysicalMemory /Value"
            break;
            case'darwin':
                k.cmd = "vm_stat | awk '/^Pages free: /{f=substr($3,1,length($3)-1)} /^Pages active: /{a=substr($3,1,length($3-1))} /^Pages inactive: /{i=substr($3,1,length($3-1))} /^Pages speculative: /{s=substr($3,1,length($3-1))} /^Pages wired down: /{w=substr($4,1,length($4-1))} /^Pages occupied by compressor: /{c=substr($5,1,length($5-1)); print ((a+w)/(f+a+i+w+s+c))*100;}'"
            break;
            case'freebsd':
        	    k.cmd = "echo \"scale=4; $(vmstat -H | tail -1 | awk '{print $5}')*1024*100/$(sysctl hw.physmem | awk '{print $2}')\" | bc"
            break;
            default:
                k.cmd = "LANG=C free | grep Mem | awk '{print $7/$2 * 100.0}'";
            break;
        }
        if(k.cmd){
             exec(k.cmd,{encoding:'utf8',detached: true},function(err,d){
                 if(s.isWin===true){
                     d=(parseInt(d.split('=')[1])/(s.totalmem/1000))*100
                 }
                 callback(d)
             });
        }else{
            callback(0)
        }
    }
}
