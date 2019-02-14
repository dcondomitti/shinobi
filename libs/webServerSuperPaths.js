var fs = require('fs');
var os = require('os');
var moment = require('moment')
var request = require('request')
var jsonfile = require("jsonfile")
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang,app){
    /**
    * API : Superuser : Get Logs
    */
    app.all([config.webPaths.supersuperApiPrefix+':auth/logs'], function (req,res){
        req.ret={ok:false};
        s.superAuth(req.params,function(resp){
            req.sql='SELECT * FROM Logs WHERE ke=?';req.ar=['$'];
            if(!req.params.id){
                if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                    try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                    req.or=[];
                    user.details.monitors.forEach(function(v,n){
                        req.or.push('mid=?');req.ar.push(v)
                    })
                    req.sql+=' AND ('+req.or.join(' OR ')+')'
                }
            }else{
                if(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1||req.params.id.indexOf('$')>-1){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                }else{
                    res.end('[]');
                    return;
                }
            }
            if(req.query.start||req.query.end){
                if(!req.query.startOperator||req.query.startOperator==''){
                    req.query.startOperator='>='
                }
                if(!req.query.endOperator||req.query.endOperator==''){
                    req.query.endOperator='<='
                }
                if(req.query.start && req.query.start !== '' && req.query.end && req.query.end !== ''){
                    req.query.start = s.stringToSqlTime(req.query.start)
                    req.query.end = s.stringToSqlTime(req.query.end)
                    req.sql+=' AND `time` '+req.query.startOperator+' ? AND `time` '+req.query.endOperator+' ?';
                    req.ar.push(req.query.start)
                    req.ar.push(req.query.end)
                }else if(req.query.start && req.query.start !== ''){
                    req.query.start = s.stringToSqlTime(req.query.start)
                    req.sql+=' AND `time` '+req.query.startOperator+' ?';
                    req.ar.push(req.query.start)
                }
            }
            if(!req.query.limit||req.query.limit==''){req.query.limit=50}
            req.sql+=' ORDER BY `time` DESC LIMIT '+req.query.limit+'';
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(err){
                    err.sql=req.sql;
                    res.end(s.prettyPrint(err));
                    return
                }
                if(!r){r=[]}
                r.forEach(function(v,n){
                    r[n].info=JSON.parse(v.info)
                })
                res.end(s.prettyPrint(r))
            })
        },res,req)
    })
    /**
    * API : Superuser : Log delete.
    */
    app.all(config.webPaths.superApiPrefix+':auth/logs/delete', function (req,res){
        s.superAuth(req.params,function(resp){
            s.sqlQuery('DELETE FROM Logs WHERE ke=?',['$'],function(){
                var endData = {
                    ok : true
                }
                res.end(s.prettyPrint(endData))
            })
        },res,req)
    })
    /**
    * API : Superuser : Update Shinobi
    */
    app.all(config.webPaths.superApiPrefix+':auth/system/update', function (req,res){
        s.superAuth(req.params,function(resp){
            s.ffmpegKill()
            s.systemLog('Shinobi ordered to update',{
                by: resp.$user.mail,
                ip: resp.ip
            })
            var updateProcess = spawn('sh',(s.mainDirectory+'/UPDATE.sh').split(' '),{detached: true})
            updateProcess.stderr.on('data',function(data){
                s.systemLog('Update Info',data.toString())
            })
            updateProcess.stdout.on('data',function(data){
                s.systemLog('Update Info',data.toString())
            })
            var endData = {
                ok : true
            }
            res.end(s.prettyPrint(endData))
        },res,req)
    })
    /**
    * API : Superuser : Restart Shinobi
    */
    app.all(config.webPaths.superApiPrefix+':auth/system/restart/:script', function (req,res){
        s.superAuth(req.params,function(resp){
            var check = function(x){return req.params.script.indexOf(x)>-1}
            var endData = {
                ok : true
            }
            if(check('system')){
                s.systemLog('Shinobi ordered to restart',{by:resp.$user.mail,ip:resp.ip})
                s.ffmpegKill()
                endData.systemOuput = execSync('pm2 restart '+s.mainDirectory+'/camera.js')
            }
            if(check('cron')){
                s.systemLog('Shinobi CRON ordered to restart',{by:resp.$user.mail,ip:resp.ip})
                endData.cronOuput = execSync('pm2 restart '+s.mainDirectory+'/cron.js')
            }
            if(check('logs')){
                s.systemLog('Flush PM2 Logs',{by:resp.$user.mail,ip:resp.ip})
                endData.logsOuput = execSync('pm2 flush')
            }
            res.end(s.prettyPrint(endData))
        },res,req)
    })
    /**
    * API : Superuser : Modify Configuration (conf.json)
    */
    app.all(config.webPaths.superApiPrefix+':auth/system/configure', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            var postBody = s.getPostData(req)
            if(!postBody){
                endData.ok = false
                endData.msg = lang.postDataBroken
            }else{
                s.systemLog('conf.json Modified',{
                    by: resp.$user.mail,
                    ip: resp.ip,
                    old:jsonfile.readFileSync(s.location.config)
                })
                jsonfile.writeFile(s.location.config,postBody,{spaces: 2},function(){
                    s.tx({f:'save_configuration'},'$')
                })
            }
            res.end(s.prettyPrint(endData))
        },res,req)
    })
    /**
    * API : Superuser : Get users in system
    */
    app.all([
        config.webPaths.superApiPrefix+':auth/accounts/list',
        config.webPaths.superApiPrefix+':auth/accounts/list/:type',
    ], function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            searchQuery = 'SELECT ke,uid,auth,mail,details FROM Users'
            queryVals = []
            switch(req.params.type){
                case'admin':case'administrator':
                    searchQuery += ' WHERE details NOT LIKE ?'
                    queryVals.push('%"sub"%')
                break;
                case'sub':case'subaccount':
                    searchQuery += ' WHERE details LIKE ?'
                    queryVals.push('%"sub"%')
                break;
            }
            // ' WHERE details NOT LIKE ?'
            s.sqlQuery(searchQuery,queryVals,function(err,users) {
                endData.users = users
                res.end(s.prettyPrint(endData))
            })
        },res,req)
    })
    /**
    * API : Superuser : Save Superuser Preferences
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/saveSettings', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            var form = s.getPostData(req)
            if(form){
                var currentSuperUserList = jsonfile.readFileSync(s.location.super)
                var currentSuperUser = {}
                var currentSuperUserPosition = -1
                //find this user in current list
                currentSuperUserList.forEach(function(user,pos){
                    if(user.mail === resp.$user.mail){
                        currentSuperUser = user
                        currentSuperUserPosition = pos
                    }
                })
                var logDetails = {
                    by : resp.$user.mail,
                    ip : resp.ip
                }
                //check if pass and pass_again match, if not remove password
                if(form.pass !== '' && form.pass === form.pass_again){
                    form.pass = s.createHash(form.pass)
                }else{
                    delete(form.pass)
                }
                //delete pass_again from object
                delete(form.pass_again)
                //set new values
                currentSuperUser = Object.assign(currentSuperUser,form)
                //reset email and log change of email
                if(form.mail !== resp.$user.mail){
                    logDetails.newEmail = form.mail
                    logDetails.oldEmail = resp.$user.mail
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
                    s.tx({f:'save_preferences'},'$')
                })
            }else{
                endData.ok = false
                endData.msg = lang.postDataBroken
            }
            res.end(s.prettyPrint(endData))
        },res,req)
    })
    /**
    * API : Superuser : Create Admin account (Account to manage cameras)
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/registerAdmin', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : false
            }
            var close = function(){
                res.end(s.prettyPrint(endData))
            }
            var isCallbacking = false
            var form = s.getPostData(req)
            if(form){
                if(form.mail !== '' && form.pass !== ''){
                    if(form.pass === form.password_again || form.pass === form.pass_again){
                        isCallbacking = true
                        s.sqlQuery('SELECT * FROM Users WHERE mail=?',[form.mail],function(err,r) {
                            if(r&&r[0]){
                                //found address already exists
                                endData.msg = lang['Email address is in use.'];
                            }else{
                                endData.ok = true
                                //create new
                                //user id
                                form.uid = s.gid()
                                //check to see if custom key set
                                if(!form.ke||form.ke===''){
                                    form.ke=s.gid()
                                }else{
                                    form.ke = form.ke.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
                                }
                                //check if "details" is object
                                if(form.details instanceof Object){
                                    form.details = JSON.stringify(form.details)
                                }
                                //write user to db
                                s.sqlQuery(
                                    'INSERT INTO Users (ke,uid,mail,pass,details) VALUES (?,?,?,?,?)',
                                    [
                                        form.ke,
                                        form.uid,
                                        form.mail,
                                        s.createHash(form.pass),
                                        form.details
                                    ]
                                )
                                s.tx({f:'add_account',details:form.details,ke:form.ke,uid:form.uid,mail:form.mail},'$')
                                endData.user = Object.assign(form,{})
                                //init user
                                s.loadGroup(form)
                            }
                            close()
                        })
                    }else{
                        endData.msg = lang["Passwords Don't Match"]
                    }
                }else{
                    endData.msg = lang['Email and Password fields cannot be empty']
                }
            }else{
                endData.msg = lang.postDataBroken
            }
            if(isCallbacking === false)close()
        },res,req)
    })
    /**
    * API : Superuser : Edit Admin account (Account to manage cameras)
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/editAdmin', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : false
            }
            var close = function(){
                res.end(s.prettyPrint(endData))
            }
            var form = s.getPostData(req)
            if(form){
                var account = s.getPostData(req,'account')
                s.sqlQuery('SELECT * FROM Users WHERE mail=?',[account.mail],function(err,r) {
                    if(r && r[0]){
                        r = r[0]
                        var details = JSON.parse(r.details)
                        if(form.pass && form.pass !== ''){
                           if(form.pass === form.password_again || form.pass_again){
                               form.pass = s.createHash(form.pass);
                           }else{
                               endData.msg = lang["Passwords Don't Match"]
                               close()
                               return
                           }
                        }else{
                            delete(form.pass);
                        }
                        delete(form.password_again);
                        delete(form.pass_again);
                        var keys = Object.keys(form)
                        var set = []
                        var values = []
                        keys.forEach(function(v,n){
                            if(
                                set === 'ke' ||
                                !form[v]
                            ){
                                //skip
                                return
                            }
                            set.push(v+'=?')
                            if(v === 'details'){
                                form[v] = s.stringJSON(Object.assign(details,s.parseJSON(form[v])))
                            }
                            values.push(form[v])
                        })
                        values.push(account.mail)
                        s.sqlQuery('UPDATE Users SET '+set.join(',')+' WHERE mail=?',values,function(err,r) {
                            if(err){
                                console.log(err)
                                endData.error = err
                                endData.msg = lang.AccountEditText1
                            }else{
                                endData.ok = true
                                s.tx({f:'edit_account',form:form,ke:account.ke,uid:account.uid},'$')
                                delete(s.group[account.ke].init);
                                s.loadGroupApps(account)
                            }
                            close()
                        })
                    }else{
                        endData.msg = lang['User Not Found']
                        close()
                    }
                })
            }else{
                endData.msg = lang.postDataBroken
                close()
            }
        },res,req)
    })
    /**
    * API : Superuser : Delete Admin account (Account to manage cameras)
    */
    app.all(config.webPaths.superApiPrefix+':auth/accounts/deleteAdmin', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            var close = function(){
                res.end(s.prettyPrint(endData))
            }
            var account = s.getPostData(req,'account')
            s.sqlQuery('DELETE FROM Users WHERE uid=? AND ke=? AND mail=?',[account.uid,account.ke,account.mail])
            s.sqlQuery('DELETE FROM API WHERE uid=? AND ke=?',[account.uid,account.ke])
            if(s.getPostData(req,'deleteSubAccounts',false) === '1'){
                s.sqlQuery('DELETE FROM Users WHERE ke=?',[account.ke])
            }
            if(s.getPostData(req,'deleteMonitors',false) == '1'){
                s.sqlQuery('SELECT * FROM Monitors WHERE ke=?',[account.ke],function(err,monitors){
                    if(monitors && monitors[0]){
                        monitors.forEach(function(monitor){
                            s.camera('stop',monitor)
                        })
                        s.sqlQuery('DELETE FROM Monitors WHERE ke=?',[account.ke])
                    }
                })
            }
            if(s.getPostData(req,'deleteVideos',false) == '1'){
                s.sqlQuery('DELETE FROM Videos WHERE ke=?',[account.ke])
                fs.chmod(s.dir.videos+account.ke,0o777,function(err){
                    fs.unlink(s.dir.videos+account.ke,function(err){})
                })
            }
            if(s.getPostData(req,'deleteEvents',false) == '1'){
                s.sqlQuery('DELETE FROM Events WHERE ke=?',[account.ke])
            }
            s.tx({f:'delete_account',ke:account.ke,uid:account.uid,mail:account.mail},'$')
            close()
        },res,req)
    })
    /**
    * API : Superuser : Get Entire System
    */
    app.all(config.webPaths.superApiPrefix+':auth/export/system', function (req,res){
        s.superAuth(req.params,function(resp){
            s.systemLog('Copy of the Database Exported',{
                by: resp.$user.mail,
                ip: resp.ip
            })
            var endData = {
                ok : true
            }
            // var database = s.getPostData(req,'database')
            endData.database = {}
            var tableNames = [
                'Users',
                'Monitors',
                'API',
                'Videos',
                'Cloud Videos',
                'Logs',
                'Files',
                'Presets',
            ]
            var completedTables = 0
            var tableExportLoop = function(callback){
                var tableName = tableNames[completedTables]
                if(tableName){
                    var tableIsSelected = s.getPostData(req,tableName) == 1
                    if(tableIsSelected){
                        s.sqlQuery('SELECT * FROM `' + tableName +'`',[],function(err,dataRows){
                            endData.database[tableName] = dataRows
                            ++completedTables
                            tableExportLoop(callback)
                        })
                    }else{
                        ++completedTables
                        tableExportLoop(callback)
                    }
                }else{
                    callback()
                }
            }
            tableExportLoop(function(){
                s.closeJsonResponse(res,endData)
            })
        },res,req)
    })
    /**
    * API : Superuser : Import Entire System
    */
    app.all(config.webPaths.superApiPrefix+':auth/import/system', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : false
            }
            console.log(req.files)
            // insert data
            var data = s.getPostData(req)
            var database = s.getPostData(req,'database')
            if(data && data.database)database = data.database
            if(database){
                var rowsExistingAlready = {}
                var countOfRowsInserted = {}
                var countOfRowsExistingAlready = {}
                var insertRow = function(tableName,row,callback){
                    if(!rowsExistingAlready[tableName])rowsExistingAlready[tableName] = []
                    if(!countOfRowsExistingAlready[tableName])countOfRowsExistingAlready[tableName] = 0
                    if(!countOfRowsInserted[tableName])countOfRowsInserted[tableName] = 0
                    var fieldsToCheck = ['ke']
                    switch(tableName){
                        case'API':
                            fieldsToCheck = fieldsToCheck.concat([
                                'code',
                                'uid'
                            ])
                        break;
                        case'Cloud Videos':
                            fieldsToCheck = fieldsToCheck.concat([
                                'href',
                                'mid'
                            ])
                        break;
                        case'Videos':
                            fieldsToCheck = fieldsToCheck.concat([
                                'time',
                                'mid'
                            ])
                        break;
                        case'Users':
                            fieldsToCheck = fieldsToCheck.concat([
                                'uid',
                                'mail'
                            ])
                        break;
                        case'Presets':
                            fieldsToCheck = fieldsToCheck.concat([
                                'name',
                                'type'
                            ])
                        break;
                        case'Logs':
                            fieldsToCheck = fieldsToCheck.concat([
                                'time',
                                'info',
                                'mid'
                            ])
                        break;
                        case'Events':
                            fieldsToCheck = fieldsToCheck.concat([
                                'time',
                                'details',
                                'mid'
                            ])
                        break;
                        case'Files':
                            fieldsToCheck = fieldsToCheck.concat([
                                'details',
                                'name',
                                'mid'
                            ])
                        break;
                        case'Monitors':
                            fieldsToCheck = fieldsToCheck.concat([
                                'host',
                                'protocol',
                                'port',
                                'path',
                                'mid'
                            ])
                        break;
                    }
                    var keysToCheck = []
                    var valuesToCheck = []
                    fieldsToCheck.forEach(function(key){
                        keysToCheck.push(key + '= ?')
                        valuesToCheck.push(row[key])
                    })
                    s.sqlQuery('SELECT * FROM ' + tableName + ' WHERE ' + keysToCheck.join(' AND '),valuesToCheck,function(err,selected){
                        if(selected && selected[0]){
                            selected = selected[0]
                            rowsExistingAlready[tableName].push(selected)
                            callback()
                        }else{
                            var rowKeys = Object.keys(row)
                            var insertEscapes = []
                            var insertValues = []
                            rowKeys.forEach(function(key){
                                insertEscapes.push('?')
                                insertValues.push(row[key])
                            })
                            s.sqlQuery('INSERT INTO ' + tableName + ' (' + rowKeys.join(',') +') VALUES (' + insertEscapes.join(',') + ')',insertValues,function(){
                                if(!err){
                                    ++countOfRowsInserted[tableName]
                                }
                                callback()
                            })
                        }
                    })
                }
                var actionCount = {}
                var insertTableRows = function(tableName,rows,callback){
                    if(!actionCount[tableName])actionCount[tableName] = 0
                    var insertLoop = function(){
                        var row = rows[actionCount[tableName]]
                        if(row){
                            insertRow(tableName,row,function(){
                                ++actionCount[tableName]
                                insertLoop()
                            })
                        }else{
                            callback()
                        }
                    }
                    insertLoop()
                }
                var databaseTableKeys = Object.keys(database)
                var completedTables = 0
                var tableInsertLoop = function(callback){
                    var tableName = databaseTableKeys[completedTables]
                    var rows = database[databaseTableKeys[completedTables]]
                    if(tableName){
                        insertTableRows(tableName,rows,function(){
                            ++completedTables
                            tableInsertLoop(callback)
                        })
                    }else{
                        callback()
                    }
                }
                tableInsertLoop(function(){
                    endData.ok = true
                    endData.tablesInsertedTo = databaseTableKeys
                    endData.countOfRowsInserted = countOfRowsInserted
                    endData.rowsExistingAlready = rowsExistingAlready
                    s.closeJsonResponse(res,endData)
                })
            }else{
                endData.msg = lang['Database Not Found']
                s.closeJsonResponse(res,endData)
            }
        },res,req)
    })
    /**
    * API : Superuser : Force Check for Stale Purge Locks
    */
    app.all(config.webPaths.superApiPrefix+':auth/system/checkForStalePurgeLocks', function (req,res){
        s.superAuth(req.params,function(resp){
            var endData = {
                ok : true
            }
            s.checkForStalePurgeLocks()
            res.end(s.prettyPrint(endData))
        },res,req)
    })
}
