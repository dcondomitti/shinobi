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
    //register sub-account function
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
}
