var execSync = require('child_process').execSync;
module.exports = function(s,config){
    var staticFFmpeg = false;
    try{
        staticFFmpeg = require('ffmpeg-static').path;
        if (!fs.existsSync(staticFFmpeg)) {
            staticFFmpeg = false
            console.log('"ffmpeg-static" from NPM has failed to provide a compatible library or has been corrupted.')
            console.log('You may need to install FFmpeg manually or you can try running "npm uninstall ffmpeg-static && npm install ffmpeg-static".')
        }
    }catch(err){
        staticFFmpeg = false;
        console.log('No Static FFmpeg. Continuing.')
    }
    //ffmpeg location
    if(!config.ffmpegDir){
        if(staticFFmpeg !== false){
            config.ffmpegDir = staticFFmpeg
        }else{
            if(s.isWin===true){
                config.ffmpegDir = s.mainDirectory+'/ffmpeg/ffmpeg.exe'
            }else{
                config.ffmpegDir = 'ffmpeg'
            }
        }
    }
    //ffmpeg version
    s.ffmpegVersion=execSync(config.ffmpegDir+" -version").toString().split('Copyright')[0].replace('ffmpeg version','').trim()
    console.log('FFMPEG version : '+s.ffmpegVersion)
    if(s.ffmpegVersion.indexOf(': 2.')>-1){
        s.systemLog('FFMPEG is too old : '+s.ffmpegVersion+', Needed : 3.2+',err)
        throw (new Error())
    }
    s.splitForFFPMEG = function (ffmpegCommandAsString) {
        //this function ignores spaces inside quotes.
        return ffmpegCommandAsString.match(/\\?.|^$/g).reduce((p, c) => {
            if(c === '"'){
                p.quote ^= 1;
            }else if(!p.quote && c === ' '){
                p.a.push('');
            }else{
                p.a[p.a.length-1] += c.replace(/\\(.)/,"$1");
            }
            return  p;
        }, {a: ['']}).a
    };
    s.createFFmpegMap = function(e,arrayOfMaps){
        //`e` is the monitor object
        var string = '';
        if(e.details.input_maps && e.details.input_maps.length > 0){
            if(arrayOfMaps && arrayOfMaps instanceof Array && arrayOfMaps.length>0){
                arrayOfMaps.forEach(function(v){
                    if(v.map==='')v.map='0'
                    string += ' -map '+v.map
                })
            }else{
                string += ' -map 0:0'
            }
        }
        return string;
    }
}
