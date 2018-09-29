var moment = require('moment');
var crypto = require('crypto');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
console.log('NODE.JS version : '+execSync("node -v"))
module.exports = function(s,config,lang,io){
    s.processReady = function(){
        s.systemLog(lang.startUpText5)
        process.send('ready')
    }
    if(config.childNodes.mode !== 'child'){
        //add Cloud Videos table, will remove in future
        s.sqlQuery('CREATE TABLE IF NOT EXISTS `Cloud Videos` (`mid` varchar(50) NOT NULL,`ke` varchar(50) DEFAULT NULL,`href` text NOT NULL,`size` float DEFAULT NULL,`time` timestamp NULL DEFAULT NULL,`end` timestamp NULL DEFAULT NULL,`status` int(1) DEFAULT \'0\' COMMENT \'0:Complete,1:Read,2:Archive\',`details` text) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',[],function(err){
            // if(err)console.log(err)
        },true)
        //create Files table
        s.sqlQuery('CREATE TABLE IF NOT EXISTS `Files` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`name` tinytext NOT NULL,`size` float NOT NULL DEFAULT \'0\',`details` text NOT NULL,`status` int(1) NOT NULL DEFAULT \'0\') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',[],function(err){
            // if(err)console.log(err)
            //add time column to Files table
            s.sqlQuery('ALTER TABLE `Files`	ADD COLUMN `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `status`;',[],function(err){
                // if(err)console.log(err)
            },true)
        },true)
        //master node - startup functions
        setInterval(function(){
            s.cpuUsage(function(cpu){
                s.ramUsage(function(ram){
                    s.tx({f:'os',cpu:cpu,ram:ram},'CPU');
                })
            })
        },10000);
        setTimeout(function(){
            //get current disk used for each isolated account (admin user) on startup
            s.sqlQuery('SELECT * FROM Users WHERE details NOT LIKE ?',['%"sub"%'],function(err,r){
                if(r&&r[0]){
                    var count = r.length
                    var countFinished = 0
                    r.forEach(function(v,n){
                        v.size=0;
                        v.limit=JSON.parse(v.details).size
                        s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND status!=?',[v.ke,0],function(err,rr){
                            ++countFinished
                            if(r&&r[0]){
                                rr.forEach(function(b){
                                    v.size+=b.size
                                })
                            }
                            s.systemLog(v.mail+' : '+lang.startUpText0+' : '+rr.length,v.size)
                            s.loadGroup(v)
                            s.loadGroupApps(v)
                            s.systemLog(v.mail+' : '+lang.startUpText1,countFinished+'/'+count)
                            if(countFinished===count){
                                s.systemLog(lang.startUpText4)
                                //preliminary monitor start
                                s.sqlQuery('SELECT * FROM Monitors', function(err,r) {
                                    if(err){s.systemLog(err)}
                                    if(r&&r[0]){
                                        r.forEach(function(v){
                                            s.initiateMonitorObject(v);
                                            r.ar={};
                                            r.ar.id = v.mid;
                                            Object.keys(v).forEach(function(b){
                                                r.ar[b]=v[b];
                                            })
                                            v.details=JSON.parse(v.details)
                                            s.group[v.ke].mon_conf[v.mid] = v
                                            s.camera(v.mode,r.ar)
                                        });
                                    }
                                    s.processReady()
                                });
                            }
                        })
                    })
                }else{
                    s.processReady()
                }
            })
        },1500)
    }
}
