var fs = require('fs');
module.exports = function(s,config,lang,app,io){
    if(config.dropInEventServer === true){
        if(config.dropInEventDeleteFileAfterTrigger === undefined)config.dropInEventDeleteFileAfterTrigger = true
        var beforeMonitorsLoadedOnStartup = function(){
            if(!config.dropInEventsDir){
                config.dropInEventsDir = s.dir.streams + 'dropInEvents/'
            }
            s.dir.dropInEvents = s.checkCorrectPathEnding(config.dropInEventsDir)
            //dropInEvents dir
            if(!fs.existsSync(s.dir.dropInEvents)){
                fs.mkdirSync(s.dir.dropInEvents)
            }
        }
        var onMonitorInit = function(monitorConfig){
            var ke = monitorConfig.ke
            var mid = monitorConfig.mid
            var groupEventDropDir = s.dir.dropInEvents + ke

            if(!fs.existsSync(groupEventDropDir)){
                fs.mkdirSync(groupEventDropDir)
            }
            var monitorEventDropDir = groupEventDropDir + '/' + mid + '/'
            if(!fs.existsSync(monitorEventDropDir)){
                fs.mkdirSync(monitorEventDropDir)
            }
            if(s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher){
                s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher.close()
                delete(s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher)
            }
            var fileQueue = {}
            s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventFileQueue = fileQueue
            var eventTrigger = function(eventType,filename){
                var filePath = monitorEventDropDir + filename
                if(filename.indexOf('.jpg') > -1){
                    var snapPath = s.dir.streams + ke + '/' + mid + '/s.jpg'
                    fs.unlink(snapPath,function(err){
                        fs.createReadStream(filePath).pipe(fs.createWriteStream(snapPath))
                        s.triggerEvent({
                            id: mid,
                            ke: ke,
                            details: {
                                confidence: 100,
                                name: filename,
                                plug: "dropInEvent",
                                reason: "dropInEvent"
                            }
                        })
                    })
                }else{
                    s.triggerEvent({
                        id: mid,
                        ke: ke,
                        details: {
                            confidence: 100,
                            name: filename,
                            plug: "dropInEvent",
                            reason: "dropInEvent"
                        }
                    })
                }
                if(config.dropInEventDeleteFileAfterTrigger){
                    setTimeout(function(){
                        fs.unlink(filePath,function(err){

                        })
                    },1000 * 60 * 5)
                }
            }
            var directoryWatch = fs.watch(monitorEventDropDir,function(eventType,filename){
                clearTimeout(fileQueue[filename])
                fileQueue[filename] = setTimeout(function(){
                    eventTrigger(eventType,filename)
                },3000)
            })
            s.group[monitorConfig.ke].mon[monitorConfig.mid].dropInEventWatcher = directoryWatch
        }
        //add extensions
        s.beforeMonitorsLoadedOnStartup(beforeMonitorsLoadedOnStartup)
        s.onMonitorInit(onMonitorInit)
    }
}
