var fs = require('fs');
var os = require('os');
var moment = require('moment')
var request = require('request')
var jsonfile = require("jsonfile")
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,app){
    var closeResponse = function(res,endData){
        res.setHeader('Content-Type', 'application/json')
        res.end(s.prettyPrint(endData))
    }
    /**
    * API : Administrator : Edit Sub-Account (Account to share cameras with)
    */
    app.all(config.webPaths.adminApiPrefix+':auth/accounts/:ke/edit', function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                closeResponse(res,endData)
                return
            }
            var form = s.getPostData(req)
            if(form){
                var keys = Object.keys(form)
                var condition = []
                var value = []
                keys.forEach(function(v){
                    condition.push(v+'=?')
                    value.push(form[v])
                })
                value = value.concat([req.params.ke,req.body.uid])
                s.sqlQuery("UPDATE Users SET "+condition.join(',')+" WHERE ke=? AND uid=?",value)
                s.tx({
                    f: 'edit_sub_account',
                    ke: req.params.ke,
                    uid: req.body.uid,
                    mail: req.body.mail,
                    form: form
                },'ADM_'+req.params.ke)
                endData.ok = true
                s.sqlQuery("SELECT * FROM API WHERE ke=? AND uid=?",[req.params.ke,req.body.uid],function(err,rows){
                    if(rows && rows[0]){
                        rows.forEach(function(row){
                            delete(s.api[row.code])
                        })
                    }
                })
            }else{
                endData.msg = lang.postDataBroken
            }
            closeResponse(res,endData)
        },res,req)
    })
    /**
    * API : Administrator : Delete Sub-Account (Account to share cameras with)
    */
    app.all(config.webPaths.adminApiPrefix+':auth/accounts/:ke/delete', function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                closeResponse(res,endData)
                return
            }
            s.sqlQuery('DELETE FROM Users WHERE uid=? AND ke=? AND mail=?',[req.body.uid,req.params.ke,req.body.mail])
            s.sqlQuery("SELECT * FROM API WHERE ke=? AND uid=?",[req.params.ke,req.body.uid],function(err,rows){
                if(rows && rows[0]){
                    rows.forEach(function(row){
                        delete(s.api[row.code])
                    })
                    s.sqlQuery('DELETE FROM API WHERE uid=? AND ke=?',[req.body.uid,req.params.ke])
                }
            })
            s.tx({
                f: 'delete_sub_account',
                ke: req.params.ke,
                uid: req.body.uid,
                mail: req.body.mail
            },'ADM_'+req.params.ke)
            endData.ok = true
            closeResponse(res,endData)
        },res,req)
    })
    /**
    * API : Administrator : Add Sub-Account (Account to share cameras with)
    */
    app.post([
        config.webPaths.adminApiPrefix+':auth/register/:ke/:uid',
        config.webPaths.apiPrefix+':auth/register/:ke/:uid'
    ],function (req,res){
        endData = {
            ok : false
        }
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                closeResponse(res,endData)
                return
            }
            s.sqlQuery('SELECT * FROM Users WHERE uid=? AND ke=? AND details NOT LIKE ? LIMIT 1',[req.params.uid,req.params.ke,'%"sub"%'],function(err,u) {
                if(u && u[0]){
                    if(req.body.mail !== '' && req.body.pass !== ''){
                        if(req.body.pass === req.body.password_again){
                            s.sqlQuery('SELECT * FROM Users WHERE mail=?',[req.body.mail],function(err,r) {
                                if(r&&r[0]){
                                    //found one exist
                                    endData.msg = 'Email address is in use.'
                                }else{
                                    //create new
                                    endData.msg = 'New Account Created'
                                    endData.ok = true
                                    var newId = s.gid()
                                    var details = s.s({
                                        sub: "1",
                                        allmonitors: "1"
                                    })
                                    s.sqlQuery('INSERT INTO Users (ke,uid,mail,pass,details) VALUES (?,?,?,?,?)',[req.params.ke,newId,req.body.mail,s.createHash(req.body.pass),details])
                                    s.tx({
                                        f: 'add_sub_account',
                                        details: details,
                                        ke: req.params.ke,
                                        uid: newId,
                                        mail: req.body.mail
                                    },'ADM_'+req.params.ke)
                                }
                                res.end(s.prettyPrint(endData))
                            })
                        }else{
                            endData.msg = user.lang["Passwords Don't Match"]
                        }
                    }else{
                        endData.msg = user.lang['Fields cannot be empty']
                    }
                }else{
                    endData.msg = user.lang['Not an Administrator Account']
                }
                if(endData.msg){
                    res.end(s.prettyPrint(endData))
                }
            })
        },res,req)
    })
    /**
    * API : Administrator : Monitor : Add, Edit, and Delete
    */
    app.all([
        config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id',
        config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id/:f',
        config.webPaths.adminApiPrefix+':auth/configureMonitor/:ke/:id',
        config.webPaths.adminApiPrefix+':auth/configureMonitor/:ke/:id/:f'
    ], function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            var hasRestrictions = user.details.sub && user.details.allmonitors !== '1'
            if(req.params.f !== 'delete'){
                if(!req.body.data&&!req.query.data){
                    req.ret.msg='No Monitor Data found.'
                    res.end(s.prettyPrint(req.ret))
                    return
                }
                try{
                    if(req.query.data){
                        req.monitor=JSON.parse(req.query.data)
                    }else{
                        req.monitor=JSON.parse(req.body.data)
                    }
                }catch(er){
                    if(!req.monitor){
                        req.ret.msg=user.lang.monitorEditText1;
                        res.end(s.prettyPrint(req.ret))
                    }
                    return
                }
                if(!user.details.sub ||
                   user.details.allmonitors === '1' ||
                   hasRestrictions && user.details.monitor_edit.indexOf(req.monitor.mid) >- 1 ||
                   hasRestrictions && user.details.monitor_create === '1'){
                        if(req.monitor&&req.monitor.mid&&req.monitor.name){
                            req.set=[],req.ar=[];
                            req.monitor.mid=req.params.id.replace(/[^\w\s]/gi,'').replace(/ /g,'');
                            try{
                                JSON.parse(req.monitor.details)
                            }catch(er){
                                if(!req.monitor.details||!req.monitor.details.stream_type){
                                    req.ret.msg=user.lang.monitorEditText2;
                                    res.end(s.prettyPrint(req.ret))
                                    return
                                }else{
                                    req.monitor.details=JSON.stringify(req.monitor.details)
                                }
                            }
                            req.monitor.ke=req.params.ke
                            req.logObject={details:JSON.parse(req.monitor.details),ke:req.params.ke,mid:req.params.id}
                            s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND mid=?',[req.monitor.ke,req.monitor.mid],function(er,r){
                                req.tx={f:'monitor_edit',mid:req.monitor.mid,ke:req.monitor.ke,mon:req.monitor};
                                if(r&&r[0]){
                                    req.tx.new=false;
                                    Object.keys(req.monitor).forEach(function(v){
                                        if(req.monitor[v]&&req.monitor[v]!==''){
                                            req.set.push(v+'=?'),req.ar.push(req.monitor[v]);
                                        }
                                    })
                                    req.set=req.set.join(',');
                                    req.ar.push(req.monitor.ke),req.ar.push(req.monitor.mid);
                                    s.userLog(req.monitor,{type:'Monitor Updated',msg:'by user : '+user.uid});
                                    req.ret.msg=user.lang['Monitor Updated by user']+' : '+user.uid;
                                    s.sqlQuery('UPDATE Monitors SET '+req.set+' WHERE ke=? AND mid=?',req.ar)
                                    req.finish=1;
                                }else{
                                    if(!s.group[req.monitor.ke].init.max_camera||s.group[req.monitor.ke].init.max_camera==''||Object.keys(s.group[req.monitor.ke].mon).length <= parseInt(s.group[req.monitor.ke].init.max_camera)){
                                        req.tx.new=true;
                                        req.st=[];
                                        Object.keys(req.monitor).forEach(function(v){
                                            if(req.monitor[v]&&req.monitor[v]!==''){
                                                req.set.push(v),req.st.push('?'),req.ar.push(req.monitor[v]);
                                            }
                                        })
            //                                        req.set.push('ke'),req.st.push('?'),req.ar.push(req.monitor.ke);
                                        req.set=req.set.join(','),req.st=req.st.join(',');
                                        s.userLog(req.monitor,{type:'Monitor Added',msg:'by user : '+user.uid});
                                        req.ret.msg=user.lang['Monitor Added by user']+' : '+user.uid;
                                        s.sqlQuery('INSERT INTO Monitors ('+req.set+') VALUES ('+req.st+')',req.ar)
                                        req.finish=1;
                                    }else{
                                        req.tx.f='monitor_edit_failed';
                                        req.tx.ff='max_reached';
                                        req.ret.msg=user.lang.monitorEditFailedMaxReached;
                                    }
                                }
                                if(req.finish===1){
                                    req.monitor.details=JSON.parse(req.monitor.details)
                                    req.ret.ok=true;
                                    s.initiateMonitorObject({mid:req.monitor.mid,ke:req.monitor.ke});
                                    s.group[req.monitor.ke].mon_conf[req.monitor.mid]=s.cleanMonitorObject(req.monitor);
                                    if(req.monitor.mode==='stop'){
                                        s.camera('stop',req.monitor);
                                    }else{
                                        s.camera('stop',req.monitor);setTimeout(function(){s.camera(req.monitor.mode,req.monitor);},5000)
                                    };
                                    s.tx(req.tx,'STR_'+req.monitor.ke);
                                };
                                s.tx(req.tx,'GRP_'+req.monitor.ke);
                                res.end(s.prettyPrint(req.ret))
                            })
                        }else{
                            req.ret.msg=user.lang.monitorEditText1;
                            res.end(s.prettyPrint(req.ret))
                        }
                }else{
                        req.ret.msg=user.lang['Not Permitted'];
                        res.end(s.prettyPrint(req.ret))
                }
            }else{
                if(!user.details.sub || user.details.allmonitors === '1' || user.details.monitor_edit.indexOf(req.params.id) > -1 || hasRestrictions && user.details.monitor_create === '1'){
                    s.userLog(s.group[req.params.ke].mon_conf[req.params.id],{type:'Monitor Deleted',msg:'by user : '+user.uid});
                    req.params.delete=1;s.camera('stop',req.params);
                    s.tx({f:'monitor_delete',uid:user.uid,mid:req.params.id,ke:req.params.ke},'GRP_'+req.params.ke);
                    s.sqlQuery('DELETE FROM Monitors WHERE ke=? AND mid=?',[req.params.ke,req.params.id])
    //                s.sqlQuery('DELETE FROM Files WHERE ke=? AND mid=?',[req.params.ke,req.params.id])
                    if(req.query.deleteFiles === 'true'){
                        //videos
                        s.dir.addStorage.forEach(function(v,n){
                            var videosDir = v.path+req.params.ke+'/'+req.params.id+'/'
                            fs.stat(videosDir,function(err,stat){
                                if(!err){
                                    s.file('deleteFolder',videosDir)
                                }
                            })
                        })
                        var videosDir = s.dir.videos+req.params.ke+'/'+req.params.id+'/'
                        fs.stat(videosDir,function(err,stat){
                            if(!err){
                                s.file('deleteFolder',videosDir)
                            }
                        })
                        //fileBin
                        var binDir = s.dir.fileBin+req.params.ke+'/'+req.params.id+'/'
                        fs.stat(binDir,function(err,stat){
                            if(!err){
                                s.file('deleteFolder',binDir)
                            }
                        })
                    }
                    req.ret.ok=true;
                    req.ret.msg='Monitor Deleted by user : '+user.uid
                    res.end(s.prettyPrint(req.ret))
                }else{
                    req.ret.msg=user.lang['Not Permitted'];
                    res.end(s.prettyPrint(req.ret))
                }
            }
        })
    })
}
