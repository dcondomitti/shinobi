var fs = require('fs');
var execSync = require('child_process').execSync;
module.exports = function(s,config,lang){
    var onFFmpegLoaded = function(ffmpeg){
        if(process.argv[2] && process.argv[2].indexOf('test') > -1){
            config.testMode = true
        }
        if(config.testMode === true){
            config.videosDir = s.mainDirectory + '/videosTest/'
            config.port = 9999
            if(config.childNodes && config.childNodes.enabled === true && config.childNodes.mode === 'master'){
                config.childNodes.port = 9998
            }
            s.ffmpegFunctions = ffmpeg
        }
    }
    var onBeforeDatabaseLoad = function(ffmpeg){
        if(config.testMode === true){
            try{
                execSync('rm ' + s.mainDirectory + '/shinobi-test.sqlite')
            }catch(err){

            }
            try{
                require('sqlite3')
            }catch(err){
                execSync('npm install sqlite3 --unsafe-perm')
            }
            execSync('cp ' + s.mainDirectory + '/sql/shinobi.sample.sqlite ' + s.mainDirectory + '/shinobi-test.sqlite')
            config.databaseType = 'sqlite3'
            config.db = {
                filename: s.mainDirectory + "/shinobi-test.sqlite"
            }
        }
    }
    var onProcessReady = function(){
        if(config.testMode === true){
            s.location.super =  s.mainDirectory + '/super-test.json'
            fs.writeFileSync(s.location.super,s.s([
                {
                    "mail":"admin@shinobi.video",
                    "pass":"21232f297a57a5a743894a0e4a801fc3",
                    "tokens":[
                        "111"
                    ]
                }
            ],null,3))
            setTimeout(function(){
                require(s.mainDirectory + '/test/run.js')(s,config,lang,io)
            },500)
        }
    }
    var onProcessExit = function(){
        if(config.testMode === true){
            execSync('rm ' + s.mainDirectory + '/shinobi-test.sqlite')
            execSync('rm ' + s.location.super)
            execSync('rm -rf ' + config.videosDir)
            console.log('---- Temporary Files Cleaned Up')
            process.exit()
        }
    }
    //attach event handlers
    s.onFFmpegLoaded(onFFmpegLoaded)
    s.onBeforeDatabaseLoad(onBeforeDatabaseLoad)
    s.onProcessReady(onProcessReady)
    s.onProcessExit(onProcessExit)
}
