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
            var uid = s.getPostData(req,'uid',false)
            var mail = s.getPostData(req,'mail',false)
            if(form){
                var keys = Object.keys(form)
                var condition = []
                var value = []
                keys.forEach(function(v){
                    condition.push(v+'=?')
                    if(form[v] instanceof Object)form[v] = JSON.stringify(form[v])
                    value.push(form[v])
                })
                value = value.concat([req.params.ke,uid])
                s.sqlQuery("UPDATE Users SET "+condition.join(',')+" WHERE ke=? AND uid=?",value)
                s.tx({
                    f: 'edit_sub_account',
                    ke: req.params.ke,
                    uid: uid,
                    mail: mail,
                    form: form
                },'ADM_'+req.params.ke)
                endData.ok = true
                s.sqlQuery("SELECT * FROM API WHERE ke=? AND uid=?",[req.params.ke,uid],function(err,rows){
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
            var uid = s.getPostData(req,'uid',false)
            var mail = s.getPostData(req,'mail',false)
            s.sqlQuery('DELETE FROM Users WHERE uid=? AND ke=? AND mail=?',[uid,req.params.ke,mail])
            s.sqlQuery("SELECT * FROM API WHERE ke=? AND uid=?",[req.params.ke,uid],function(err,rows){
                if(rows && rows[0]){
                    rows.forEach(function(row){
                        delete(s.api[row.code])
                    })
                    s.sqlQuery('DELETE FROM API WHERE uid=? AND ke=?',[uid,req.params.ke])
                }
            })
            s.tx({
                f: 'delete_sub_account',
                ke: req.params.ke,
                uid: uid,
                mail: mail
            },'ADM_'+req.params.ke)
            endData.ok = true
            closeResponse(res,endData)
        },res,req)
    })
    /**
    * API : Administrator : Add Sub-Account (Account to share cameras with)
    */
    app.post([
        config.webPaths.adminApiPrefix+':auth/accounts/:ke/register',
        //these two routes are for backwards compatibility
        config.webPaths.adminApiPrefix+':auth/register/:ke/:uid',
        config.webPaths.apiPrefix+':auth/register/:ke/:uid'
    ],function (req,res){
        endData = {
            ok : false
        }
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            if(user.details.sub){
                endData.msg = user.lang['Not an Administrator Account']
                closeResponse(res,endData)
                return
            }
            var form = s.getPostData(req)
            if(form.mail !== '' && form.pass !== ''){
                if(form.pass === form.password_again || form.pass === form.pass_again){
                    s.sqlQuery('SELECT * FROM Users WHERE mail=?',[form.mail],function(err,r) {
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
                            s.sqlQuery('INSERT INTO Users (ke,uid,mail,pass,details) VALUES (?,?,?,?,?)',[req.params.ke,newId,form.mail,s.createHash(form.pass),details])
                            s.tx({
                                f: 'add_sub_account',
                                details: details,
                                ke: req.params.ke,
                                uid: newId,
                                mail: form.mail
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
        if(endData.msg){
            res.end(s.prettyPrint(endData))
        }
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
                var form = s.getPostData(req)
                if(!form){
                    req.ret.msg = user.lang.monitorEditText1;
                    res.end(s.prettyPrint(req.ret))
                    return
                }
                if(!user.details.sub ||
                   user.details.allmonitors === '1' ||
                   hasRestrictions && user.details.monitor_edit.indexOf(form.mid) >- 1 ||
                   hasRestrictions && user.details.monitor_create === '1'){
                        if(form&&form.mid&&form.name){
                            req.set=[],req.ar=[];
                            form.mid=req.params.id.replace(/[^\w\s]/gi,'').replace(/ /g,'');
                            try{
                                JSON.parse(form.details)
                            }catch(er){
                                if(!form.details||!form.details.stream_type){
                                    req.ret.msg=user.lang.monitorEditText2;
                                    res.end(s.prettyPrint(req.ret))
                                    return
                                }else{
                                    form.details=JSON.stringify(form.details)
                                }
                            }
                            form.ke=req.params.ke
                            req.logObject={details:JSON.parse(form.details),ke:req.params.ke,mid:req.params.id}
                            s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND mid=?',[form.ke,form.mid],function(er,r){
                                req.tx={f:'monitor_edit',mid:form.mid,ke:form.ke,mon:form};
                                if(r&&r[0]){
                                    req.tx.new=false;
                                    Object.keys(form).forEach(function(v){
                                        if(form[v]&&form[v]!==''){
                                            req.set.push(v+'=?'),req.ar.push(form[v]);
                                        }
                                    })
                                    req.set=req.set.join(',');
                                    req.ar.push(form.ke),req.ar.push(form.mid);
                                    s.userLog(form,{type:'Monitor Updated',msg:'by user : '+user.uid});
                                    req.ret.msg=user.lang['Monitor Updated by user']+' : '+user.uid;
                                    s.sqlQuery('UPDATE Monitors SET '+req.set+' WHERE ke=? AND mid=?',req.ar)
                                    req.finish=1;
                                }else{
                                    if(!s.group[form.ke].init.max_camera||s.group[form.ke].init.max_camera==''||Object.keys(s.group[form.ke].mon).length <= parseInt(s.group[form.ke].init.max_camera)){
                                        req.tx.new=true;
                                        req.st=[];
                                        Object.keys(form).forEach(function(v){
                                            if(form[v]&&form[v]!==''){
                                                req.set.push(v),req.st.push('?'),req.ar.push(form[v]);
                                            }
                                        })
            //                                        req.set.push('ke'),req.st.push('?'),req.ar.push(form.ke);
                                        req.set=req.set.join(','),req.st=req.st.join(',');
                                        s.userLog(form,{type:'Monitor Added',msg:'by user : '+user.uid});
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
                                    form.details=JSON.parse(form.details)
                                    req.ret.ok=true;
                                    s.initiateMonitorObject({mid:form.mid,ke:form.ke});
                                    s.group[form.ke].mon_conf[form.mid]=s.cleanMonitorObject(form);
                                    if(form.mode==='stop'){
                                        s.camera('stop',form);
                                    }else{
                                        s.camera('stop',form);setTimeout(function(){s.camera(form.mode,form);},5000)
                                    };
                                    s.tx(req.tx,'STR_'+form.ke);
                                };
                                s.tx(req.tx,'GRP_'+form.ke);
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
        },res,req)
    })
    /**
    * API : Add API Key, binded to the user who created it
    */
    app.all([
        config.webPaths.adminApiPrefix+':auth/api/:ke/add',
        config.webPaths.apiPrefix+':auth/api/:ke/add',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var form = s.getPostData(req)
            if(form){
                var insert = {
                    ke : req.params.ke,
                    uid : user.uid,
                    code : s.gid(30),
                    ip : form.ip,
                    details : s.stringJSON(form.details)
                }
                var escapes = []
                Object.keys(insert).forEach(function(column){
                    escapes.push('?')
                });
                s.sqlQuery('INSERT INTO API ('+Object.keys(insert).join(',')+') VALUES ('+escapes.join(',')+')',Object.values(insert),function(err,r){
                    insert.time = s.formattedTime(new Date,'YYYY-DD-MM HH:mm:ss');
                    if(!err){
                        s.tx({
                            f: 'api_key_added',
                            uid: user.uid,
                            form: insert
                        },'GRP_' + req.params.ke)
                        endData.ok = true
                    }
                    closeResponse(res,endData)
                })
            }else{
                endData.msg = lang.postDataBroken
                closeResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : Delete API Key
    */
    app.all([
        config.webPaths.adminApiPrefix+':auth/api/:ke/delete',
        config.webPaths.apiPrefix+':auth/api/:ke/delete',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var form = s.getPostData(req)
            if(form){
                if(!form.code){
                    s.tx({
                        f:'form_incomplete',
                        uid: user.uid,
                        form:'APIs'
                    },'GRP_' + req.params.ke)
                    endData.msg = lang.postDataBroken
                    closeResponse(res,endData)
                    return
                }
                var row = {
                    ke : req.params.ke,
                    uid : user.uid,
                    code : form.code
                }
                var where = []
                Object.keys(row).forEach(function(column){
                    where.push(column+'=?')
                })
                s.sqlQuery('DELETE FROM API WHERE '+where.join(' AND '),Object.values(row),function(err,r){
                    if(!err){
                        s.tx({
                            f: 'api_key_deleted',
                            uid: user.uid,
                            form: row
                        },'GRP_' + req.params.ke)
                        endData.ok = true
                        delete(s.api[row.code])
                    }
                    closeResponse(res,endData)
                })
            }else{
                endData.msg = lang.postDataBroken
                closeResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : List API Keys for Authenticated user
    */
    app.get([
        config.webPaths.adminApiPrefix+':auth/api/:ke/list',
        config.webPaths.apiPrefix+':auth/api/:ke/list',
    ],function (req,res){
        var endData = {ok:false}
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            var row = {
                ke : req.params.ke,
                uid : user.uid
            }
            var where = []
            Object.keys(row).forEach(function(column){
                where.push(column+'=?')
            })
            s.sqlQuery('SELECT * FROM API WHERE '+where.join(' AND '),Object.values(row),function(err,rows){
                if(rows && rows[0]){
                    rows.forEach(function(row){
                        row.details = JSON.parse(row.details)
                    })
                    endData.ok = true
                    endData.uid = user.uid
                    endData.ke = user.ke
                    endData.keys = rows
                }
                closeResponse(res,endData)
            })
        },res,req)
    })
}
