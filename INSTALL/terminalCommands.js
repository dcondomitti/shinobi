var fs = require('fs');
var moment = require('moment');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
s = {
    isWin: (process.platform === 'win32' || process.platform === 'win64'),
    mainDirectory: __dirname.split('/INSTALL')[0]
}
var createTerminalCommands = function(callback){
    var next = function(){
        if(callback)callback()
    }
    if(!s.isWin){
        var etcPath = '/etc/shinobisystems/'
        console.log('Creating "' + etcPath + '"...')
        var createPathFile = function(){
            var pathTxt = etcPath + 'cctv.txt'
            console.log('Creating "' + pathTxt + '"...')
            fs.writeFile(pathTxt,s.mainDirectory,function(err){
                if(err)console.log(err)
                fs.chmod(pathTxt,0o777,function(err){
                    if(err)console.log(err)
                    console.log('Linking "' + s.mainDirectory + '/INSTALL/shinobi" to "/usr/bin/shinobi"...')
                    fs.symlink(s.mainDirectory + '/INSTALL/shinobi', '/usr/bin/shinobi', next)
                    console.log('You can now use `shinobi` in terminal.')
                })
            })
        }
        fs.stat(etcPath,function(err,stat){
            if(!err && stat){
                createPathFile()
            }else{
                fs.mkdir(etcPath,createPathFile)
            }
        })
    }else{
        //no commands for windows yet
        next()
    }
}
createTerminalCommands()
