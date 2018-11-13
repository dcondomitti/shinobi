var fs = require('fs');
module.exports = function(s,config){
    //directories
    s.group = {}
    if(!config.windowsTempDir&&s.isWin===true){config.windowsTempDir='C:/Windows/Temp'}
    if(!config.defaultMjpeg){config.defaultMjpeg=s.mainDirectory+'/web/libs/img/bg.jpg'}
    //default stream folder check
    if(!config.streamDir){
        if(s.isWin === false){
            config.streamDir = '/dev/shm'
        }else{
            config.streamDir = config.windowsTempDir
        }
        if(!fs.existsSync(config.streamDir)){
            config.streamDir = s.mainDirectory+'/streams/'
        }else{
            config.streamDir += '/streams/'
        }
    }
    if(!config.videosDir){config.videosDir=s.mainDirectory+'/videos/'}
    if(!config.binDir){config.binDir=s.mainDirectory+'/fileBin/'}
    if(!config.addStorage){config.addStorage=[]}
    s.dir={
        videos: s.checkCorrectPathEnding(config.videosDir),
        streams: s.checkCorrectPathEnding(config.streamDir),
        fileBin: s.checkCorrectPathEnding(config.binDir),
        addStorage: config.addStorage,
        languages: s.location.languages+'/'
    };
    //streams dir
    if(!fs.existsSync(s.dir.streams)){
        fs.mkdirSync(s.dir.streams);
    }
    //videos dir
    if(!fs.existsSync(s.dir.videos)){
        fs.mkdirSync(s.dir.videos);
    }
    //fileBin dir
    if(!fs.existsSync(s.dir.fileBin)){
        fs.mkdirSync(s.dir.fileBin);
    }
    //additional storage areas
    s.dir.addStorage.forEach(function(v,n){
        v.path = s.checkCorrectPathEnding(v.path)
        if(!fs.existsSync(v.path)){
            fs.mkdirSync(v.path);
        }
    })
}
