module.exports = function(s,config,lang,app,io){
    s.schedules = {}
    //Get all Schedules
    s.getAllSchedules = function(callback){
        s.schedules = {}
        s.sqlQuery('SELECT * FROM Schedules',function(err,rows){
            rows.forEach(function(schedule){
                s.updateSchedule(schedule)
            })
            if(callback)callback()
        })
    }
    //update schedule
    s.updateSchedule = function(row){
        var schedule = Object.assign(row,{})
        if(!s.schedules[schedule.ke])s.schedules[schedule.ke] = {}
        s.checkDetails(schedule)
        if(!s.schedules[schedule.ke][schedule.name]){
            s.schedules[schedule.ke][schedule.name] = schedule
        }else{
            s.schedules[schedule.ke][schedule.name] = Object.assign(s.schedules[schedule.ke][schedule.name],schedule)
        }
    }
    //check time in schedule
    s.checkTimeAgainstSchedule = function(start,end,callback){
        try{
            if(
                start
            ){
                var checkStartTime = new Date()
                var startSplit = start.split(':')
                var startHour = parseInt(startSplit[0])
                var startMin = parseInt(startSplit[1])
                checkStartTime.setHours(startHour)
                checkStartTime.setMinutes(startMin)
                if(end){
                    var checkEndTime = new Date()
                    var endSplit = end.split(':')
                    var endHour = parseInt(endSplit[0])
                    var endMin = parseInt(endSplit[1])
                    checkEndTime.setHours(endHour)
                    checkEndTime.setMinutes(endMin)
                }
                var currentDate = new Date()
                if(
                    (
                        currentDate >= checkStartTime &&
                        currentDate <= checkEndTime
                    ) ||
                    currentDate >= checkStartTime && !end
                ){
                    callback()
                }else{
                    callback({
                        currentDate : currentDate,
                        startTime : checkStartTime,
                        endTime : checkEndTime
                    })
                }
            }else{
                callback()
            }
        }catch(err){
            console.log(err)
            callback()
        }
    }
    //check all Schedules
    s.checkSchedules = function(v,callback){
        var groupKeys = Object.keys(s.schedules)
        groupKeys.forEach(function(key){
            var scheduleNames = Object.keys(s.schedules[key])
            scheduleNames.forEach(function(name){
                var schedule = s.schedules[key][name]
                if(!schedule.active && schedule.enabled === 1 && schedule.start && schedule.details.monitorStates){
                    s.checkTimeAgainstSchedule(schedule.start,schedule.end,function(err){
                        if(!err){
                            schedule.active = true
                            var monitorStates = schedule.details.monitorStates
                            monitorStates.forEach(function(stateName){
                                s.activateMonitorStates(key,stateName,{
                                    ke: key,
                                    uid: 'System',
                                    details: {},
                                    permissions: {},
                                    lang: lang
                                },function(endData){
                                    // console.log(endData)
                                })
                            })
                        }else{
                            schedule.active = false
                        }
                    })
                }
            })
        })
    }
    //
    s.findSchedule = function(groupKey,name,callback){
        //presetQueryVals = [ke, type, name]
        s.sqlQuery("SELECT * FROM Schedules WHERE ke=? AND name=? LIMIT 1",[groupKey,name],function(err,schedules){
            var schedule
            var notFound = false
            if(schedules && schedules[0]){
                schedule = schedules[0]
                s.checkDetails(schedule)
            }else{
                notFound = true
            }
            callback(notFound,schedule)
        })
    }
    //
    var onProcessReady = function(){
        s.getAllSchedules(function(){
            s.checkSchedules()
        })
        setInterval(function(){
            s.checkSchedules()
        },1000 * 60 * 5)
    }
    /**
    * WebServerPath : API : Get Schedule
    */
    app.all([
        config.webPaths.apiPrefix+':auth/schedule/:ke',
        config.webPaths.adminApiPrefix+':auth/schedule/:ke',
        config.webPaths.apiPrefix+':auth/schedule/:ke/:name',
        config.webPaths.adminApiPrefix+':auth/schedule/:ke/:name',
        config.webPaths.apiPrefix+':auth/schedules/:ke',
        config.webPaths.adminApiPrefix+':auth/schedules/:ke',
        config.webPaths.apiPrefix+':auth/schedules/:ke/:name',
        config.webPaths.adminApiPrefix+':auth/schedules/:ke/:name',
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                s.closeJsonResponse(res,endData)
                return
            }
            var theQuery = "SELECT * FROM Schedules WHERE ke=?"
            var theQueryValues = [req.params.ke]
            if(req.params.name){
                theQuery += ' AND name=?'
                theQueryValues.push(req.params.name)
            }
            s.sqlQuery(theQuery,theQueryValues,function(err,schedules){
                if(schedules && schedules[0]){
                    endData.ok = true
                    schedules.forEach(function(schedule){
                        s.checkDetails(schedule)
                    })
                    endData.schedules = schedules
                }else{
                    endData.msg = user.lang['Not Found']
                }
                s.closeJsonResponse(res,endData)
            })
        })
    })
    /**
    * WebServerPath : API : Update Schedule
    */
    app.all([
        config.webPaths.apiPrefix+':auth/schedule/:ke/:name/:action',
        config.webPaths.adminApiPrefix+':auth/schedule/:ke/:name/:action',
        config.webPaths.apiPrefix+':auth/schedules/:ke/:name/:action',
        config.webPaths.adminApiPrefix+':auth/schedules/:ke/:name/:action'
    ],function (req,res){
        s.auth(req.params,function(user){
            var endData = {
                ok : false
            }
            if(user.details.sub){
                endData.msg = user.lang['Not Permitted']
                s.closeJsonResponse(res,endData)
                return
            }
            switch(req.params.action){
                case'insert':case'edit':
                    var form = s.getPostData(req)
                    s.checkDetails(form)
                    if(!form || !form.details){
                        endData.msg = user.lang['Form Data Not Found']
                        s.closeJsonResponse(res,endData)
                        return
                    }
                    form.enabled = parseInt(form.enabled) || 1;
                    s.findSchedule(req.params.ke,req.params.name,function(notFound,preset){
                        if(notFound === true){
                            endData.msg = lang["Inserted Schedule Configuration"]
                            var insertData = {
                                ke: req.params.ke,
                                name: req.params.name,
                                details: s.stringJSON(form.details),
                                start: form.start,
                                end: form.end,
                                enabled: form.enabled
                            }
                            s.sqlQuery('INSERT INTO Schedules ('+Object.keys(insertData).join(',')+') VALUES (?,?,?,?,?,?)',Object.values(insertData))
                            s.tx({
                                f: 'add_schedule',
                                insertData: insertData,
                                ke: req.params.ke,
                                name: req.params.name
                            },'GRP_'+req.params.ke)
                        }else{
                            endData.msg = lang["Edited Schedule Configuration"]
                            var insertData = {
                                details: s.stringJSON(form.details),
                                start: form.start,
                                end: form.end,
                                enabled: form.enabled,
                                ke: req.params.ke,
                                name: req.params.name
                            }
                            s.sqlQuery('UPDATE Schedules SET details=?,start=?,end=?,enabled=? WHERE ke=? AND name=?',Object.values(insertData))
                            s.tx({
                                f: 'edit_schedule',
                                insertData: insertData,
                                ke: req.params.ke,
                                name: req.params.name
                            },'GRP_'+req.params.ke)
                        }
                        s.updateSchedule({
                            ke: req.params.ke,
                            name: req.params.name,
                            details: s.stringJSON(form.details),
                            start: form.start,
                            end: form.end,
                            enabled: form.enabled
                        })
                        endData.ok = true
                        s.closeJsonResponse(res,endData)
                    })
                break;
                case'delete':
                    s.findSchedule(req.params.ke,req.params.name,function(notFound,schedule){
                        if(notFound === true){
                            endData.msg = user.lang['Schedule Configuration Not Found']
                            s.closeJsonResponse(res,endData)
                        }else{
                            s.sqlQuery('DELETE FROM Schedules WHERE ke=? AND name=?',[req.params.ke,req.params.name],function(err){
                                if(!err){
                                    endData.msg = lang["Deleted Schedule Configuration"]
                                    endData.ok = true
                                    if(s.schedules[schedule.ke])delete(s.schedules[schedule.ke][schedule.name])
                                }
                                s.closeJsonResponse(res,endData)
                            })
                        }
                    })
                break;
            }
        })
    })
    //bind events
    s.onProcessReady(onProcessReady)
}
