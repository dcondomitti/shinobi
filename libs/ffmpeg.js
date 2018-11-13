var fs = require('fs');
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
module.exports = function(s,config,onFinish){
    var ffmpeg = {}
    var downloadingFfmpeg = false;
    //check local ffmpeg
    ffmpeg.checkForWindows = function(failback){
        if (s.isWin && fs.existsSync(s.mainDirectory+'/ffmpeg/ffmpeg.exe')) {
            config.ffmpegDir = s.mainDirectory+'/ffmpeg/ffmpeg.exe'
        }else{
            failback()
        }
    }
    //check local ffmpeg
    ffmpeg.checkForUnix = function(failback){
        if(s.isWin === false){
            if (fs.existsSync('/usr/bin/ffmpeg')) {
                config.ffmpegDir = '/usr/bin/ffmpeg'
            }else{
                if (fs.existsSync('/usr/local/bin/ffmpeg')) {
                    config.ffmpegDir = '/usr/local/bin/ffmpeg'
                }else{
                    failback()
                }
            }
        }else{
            failback()
        }
    }
    //check node module : ffmpeg-static
    ffmpeg.checkForNpmStatic = function(failback){
        try{
            var staticFFmpeg = require('ffmpeg-static').path;
            if (fs.statSync(staticFFmpeg)) {
                config.ffmpegDir = staticFFmpeg
            }else{
                console.log('"ffmpeg-static" from NPM has failed to provide a compatible library or has been corrupted.')
                console.log('Run "npm uninstall ffmpeg-static" to remove it.')
                console.log('Run "npm install ffbinaries" to get a different static FFmpeg downloader.')
            }
        }catch(err){
            console.log('No "ffmpeg-static".')
            failback()
        }
    }
    //check node module : ffbinaries
    ffmpeg.checkForFfbinary = function(failback){
        try{
            ffbinaries = require('ffbinaries')
            var ffbinaryDir = s.mainDirectory + '/ffmpeg/'
            var downloadFFmpeg = function(){
                downloadingFfmpeg = true
                console.log('ffbinaries : Downloading FFmpeg. Please Wait...');
                ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], {
                    destination: ffbinaryDir,
                    version : '3.4'
                },function () {
                    config.ffmpegDir = ffbinaryDir + 'ffmpeg'
                    console.log('ffbinaries : FFmpeg Downloaded.');
                    ffmpeg.completeCheck()
                })
            }
            if (!fs.existsSync(ffbinaryDir + 'ffmpeg')) {
                downloadFFmpeg()
            }else{
                config.ffmpegDir = ffbinaryDir + 'ffmpeg'
            }
        }catch(err){
            console.log('No "ffbinaries". Continuing.')
            console.log('Run "npm install ffbinaries" to get this static FFmpeg downloader.')
            failback()
        }
    }
    //ffmpeg version
    ffmpeg.checkVersion = function(callback){
        try{
            s.ffmpegVersion = execSync(config.ffmpegDir+" -version").toString().split('Copyright')[0].replace('ffmpeg version','').trim()
            if(s.ffmpegVersion.indexOf(': 2.')>-1){
                s.systemLog('FFMPEG is too old : '+s.ffmpegVersion+', Needed : 3.2+',err)
                throw (new Error())
            }
        }catch(err){
            console.log('No FFmpeg found.')
            // process.exit()
        }
        callback()
    }
    //check available hardware acceleration methods
    ffmpeg.checkHwAccelMethods = function(callback){
        if(config.availableHWAccels === undefined){
            hwAccels = execSync(config.ffmpegDir+" -loglevel quiet -hwaccels").toString().split('\n')
            hwAccels.shift()
            availableHWAccels = []
            hwAccels.forEach(function(method){
                if(method && method !== '')availableHWAccels.push(method.trim())
            })
            config.availableHWAccels = availableHWAccels
            config.availableHWAccels = ['auto'].concat(config.availableHWAccels)
            console.log('Available Hardware Acceleration Methods : ',availableHWAccels.join(', '))
        }
        callback()
    }
    ffmpeg.completeCheck = function(){
        ffmpeg.checkVersion(function(){
            ffmpeg.checkHwAccelMethods(function(){
                onFinish(ffmpeg)
            })
        })
    }
    //ffmpeg string cleaner, splits for use with spawn()
    s.splitForFFPMEG = function (ffmpegCommandAsString) {
        //this function ignores spaces inside quotes.
        return ffmpegCommandAsString.replace(/\s+/g,' ').trim().match(/\\?.|^$/g).reduce((p, c) => {
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
    s.createInputMap = function(e,number,input){
        //`e` is the monitor object
        //`x` is an object used to contain temporary values.
        var x = {}
        x.cust_input = ''
        x.hwaccel = ''
        if(input.cust_input&&input.cust_input!==''){x.cust_input+=' '+input.cust_input}
        //input - analyze duration
        if(input.aduration&&input.aduration!==''){x.cust_input+=' -analyzeduration '+input.aduration}
        //input - probe size
        if(input.probesize&&input.probesize!==''){x.cust_input+=' -probesize '+input.probesize}
        //input - stream loop (good for static files/lists)
        if(input.stream_loop === '1'){x.cust_input+=' -stream_loop -1'}
        //input - fps
        if(x.cust_input.indexOf('-r ')===-1&&input.sfps&&input.sfps!==''){
            input.sfps=parseFloat(input.sfps);
            if(isNaN(input.sfps)){input.sfps=1}
            x.cust_input+=' -r '+input.sfps
        }
        //input - is mjpeg
        if(input.type==='mjpeg'){
            if(x.cust_input.indexOf('-f ')===-1){
                x.cust_input+=' -f mjpeg'
            }
            //input - frames per second
            x.cust_input+=' -reconnect 1'
        }else
        //input - is h264 has rtsp in address and transport method is chosen
        if((input.type==='h264'||input.type==='mp4')&&input.fulladdress.indexOf('rtsp://')>-1&&input.rtsp_transport!==''&&input.rtsp_transport!=='no'){
            x.cust_input += ' -rtsp_transport '+input.rtsp_transport
        }else
        if((input.type==='mp4'||input.type==='mjpeg')&&x.cust_input.indexOf('-re')===-1){
            x.cust_input += ' -re'
        }
        //hardware acceleration
        if(input.accelerator&&input.accelerator==='1'){
            if(input.hwaccel&&input.hwaccel!==''){
                x.hwaccel+=' -hwaccel '+input.hwaccel;
            }
            if(input.hwaccel_vcodec&&input.hwaccel_vcodec!==''&&input.hwaccel_vcodec!=='auto'&&input.hwaccel_vcodec!=='no'){
                x.hwaccel+=' -c:v '+input.hwaccel_vcodec;
            }
            if(input.hwaccel_device&&input.hwaccel_device!==''){
                switch(input.hwaccel){
                    case'vaapi':
                        x.hwaccel+=' -vaapi_device '+input.hwaccel_device+' -hwaccel_output_format vaapi';
                    break;
                    default:
                        x.hwaccel+=' -hwaccel_device '+input.hwaccel_device;
                    break;
                }
            }
        }
        //custom - input flags
        return x.hwaccel+x.cust_input+' -i "'+input.fulladdress+'"';
    }
    //create sub stream channel
    s.createStreamChannel = function(e,number,channel){
        //`e` is the monitor object
        //`x` is an object used to contain temporary values.
        var x = {
            pipe: '',
            cust_stream: ''
        }
        if(!number||number==''){
            x.channel_sdir = e.sdir;
        }else{
            x.channel_sdir = e.sdir+'channel'+number+'/';
            if (!fs.existsSync(x.channel_sdir)){
                fs.mkdirSync(x.channel_sdir);
            }
        }
        x.stream_video_filters=[]
        //stream - frames per second
        if(channel.stream_vcodec!=='copy'){
            if(!channel.stream_fps||channel.stream_fps===''){
                switch(channel.stream_type){
                    case'rtmp':
                        channel.stream_fps=30
                    break;
                    default:
    //                        channel.stream_fps=5
                    break;
                }
            }
        }
        if(channel.stream_fps&&channel.stream_fps!==''){x.stream_fps=' -r '+channel.stream_fps}else{x.stream_fps=''}

        //stream - hls vcodec
        if(channel.stream_vcodec&&channel.stream_vcodec!=='no'){
            if(channel.stream_vcodec!==''){x.stream_vcodec=' -c:v '+channel.stream_vcodec}else{x.stream_vcodec=' -c:v libx264'}
        }else{
            x.stream_vcodec='';
        }
        //stream - hls acodec
        if(channel.stream_acodec!=='no'){
        if(channel.stream_acodec&&channel.stream_acodec!==''){x.stream_acodec=' -c:a '+channel.stream_acodec}else{x.stream_acodec=''}
        }else{
            x.stream_acodec=' -an';
        }
        //stream - resolution
        if(channel.stream_scale_x&&channel.stream_scale_x!==''&&channel.stream_scale_y&&channel.stream_scale_y!==''){
            x.dimensions = channel.stream_scale_x+'x'+channel.stream_scale_y;
        }
        //stream - hls segment time
        if(channel.hls_time&&channel.hls_time!==''){x.hls_time=channel.hls_time}else{x.hls_time="2"}
        //hls list size
        if(channel.hls_list_size&&channel.hls_list_size!==''){x.hls_list_size=channel.hls_list_size}else{x.hls_list_size=2}
        //stream - custom flags
        if(channel.cust_stream&&channel.cust_stream!==''){x.cust_stream=' '+channel.cust_stream}
        //stream - preset
        if(channel.stream_type !== 'h265' && channel.preset_stream && channel.preset_stream!==''){x.preset_stream=' -preset '+channel.preset_stream;}else{x.preset_stream=''}
        //hardware acceleration
        if(e.details.accelerator&&e.details.accelerator==='1'){
            if(e.details.hwaccel === 'auto')e.details.hwaccel = ''
            if(e.details.hwaccel && e.details.hwaccel!==''){
                x.hwaccel+=' -hwaccel '+e.details.hwaccel;
            }
            if(e.details.hwaccel_vcodec&&e.details.hwaccel_vcodec!==''){
                x.hwaccel+=' -c:v '+e.details.hwaccel_vcodec;
            }
            if(e.details.hwaccel_device&&e.details.hwaccel_device!==''){
                switch(e.details.hwaccel){
                    case'vaapi':
                        x.hwaccel+=' -vaapi_device '+e.details.hwaccel_device+' -hwaccel_output_format vaapi';
                    break;
                    default:
                        x.hwaccel+=' -hwaccel_device '+e.details.hwaccel_device;
                    break;
                }
            }
    //        else{
    //            if(e.details.hwaccel==='vaapi'){
    //                x.hwaccel+=' -hwaccel_device 0';
    //            }
    //        }
        }

        if(channel.rotate_stream&&channel.rotate_stream!==""&&channel.rotate_stream!=="no"){
            x.stream_video_filters.push('transpose='+channel.rotate_stream);
        }
        //stream - video filter
        if(channel.svf&&channel.svf!==''){
            x.stream_video_filters.push(channel.svf)
        }
        if(x.stream_video_filters.length>0){
            var string = x.stream_video_filters.join(',').trim()
            if(string===''){
                x.stream_video_filters=''
            }else{
                x.stream_video_filters=' -vf '+string
            }
        }else{
            x.stream_video_filters=''
        }
        if(e.details.input_map_choices&&e.details.input_map_choices.record){
            //add input feed map
            x.pipe += s.createFFmpegMap(e,e.details.input_map_choices['stream_channel-'+(number-config.pipeAddition)])
        }
        if(channel.stream_vcodec !== 'copy' || channel.stream_type === 'mjpeg' || channel.stream_type === 'b64'){
            x.cust_stream += x.stream_fps
        }
        switch(channel.stream_type){
            case'mp4':
                x.cust_stream+=' -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream" -reset_timestamps 1'
                if(channel.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f mp4'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:'+number;
            break;
            case'rtmp':
                x.rtmp_server_url=s.checkCorrectPathEnding(channel.rtmp_server_url);
                if(channel.stream_vcodec!=='copy'){
                    if(channel.stream_vcodec==='libx264'){
                        channel.stream_vcodec = 'h264'
                    }
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    if(channel.stream_v_br&&channel.stream_v_br!==''){x.cust_stream+=' -b:v '+channel.stream_v_br}
                }
                if(channel.stream_vcodec!=='no'&&channel.stream_vcodec!==''){
                    x.cust_stream+=' -vcodec '+channel.stream_vcodec
                }
                if(channel.stream_acodec!=='copy'){
                    if(!channel.stream_acodec||channel.stream_acodec===''||channel.stream_acodec==='no'){
                        channel.stream_acodec = 'aac'
                    }
                    if(!channel.stream_a_br||channel.stream_a_br===''){channel.stream_a_br='128k'}
                    x.cust_stream+=' -ab '+channel.stream_a_br
                }
                if(channel.stream_acodec!==''){
                    x.cust_stream+=' -acodec '+channel.stream_acodec
                }
                x.pipe+=' -f flv'+x.stream_video_filters+x.cust_stream+' "'+x.rtmp_server_url+channel.rtmp_stream_key+'"';
            break;
            case'h264':
                if(channel.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f mpegts'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:'+number;
            break;
            case'flv':
                if(channel.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f flv'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:'+number;
            break;
            case'hls':
                if(channel.stream_vcodec!=='h264_vaapi'&&channel.stream_vcodec!=='copy'){
                    if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -crf '+channel.stream_quality;
                    if(x.cust_stream.indexOf('-tune')===-1){x.cust_stream+=' -tune zerolatency'}
                    if(x.cust_stream.indexOf('-g ')===-1){x.cust_stream+=' -g 1'}
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=x.preset_stream+x.stream_acodec+x.stream_vcodec+' -f hls'+x.cust_stream+' -hls_time '+x.hls_time+' -hls_list_size '+x.hls_list_size+' -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "'+x.channel_sdir+'s.m3u8"';
            break;
            case'mjpeg':
                if(channel.stream_quality && channel.stream_quality !== '')x.cust_stream+=' -q:v '+channel.stream_quality;
                if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                x.pipe+=' -c:v mjpeg -f mpjpeg -boundary_tag shinobi'+x.cust_stream+x.stream_video_filters+' pipe:'+number;
            break;
            default:
                x.pipe=''
            break;
        }
        return x.pipe
    }
    ffmpeg.buildMainInput = function(e,x){
        //e = monitor object
        //x = temporary values
        //check if CUDA is enabled
        e.isStreamer = (e.type === 'dashcam'|| e.type === 'socket')
        if(e.details.accelerator === '1' && e.details.hwaccel === 'cuvid' && e.details.hwaccel_vcodec === ('h264_cuvid' || 'hevc_cuvid' || 'mjpeg_cuvid' || 'mpeg4_cuvid')){
            e.cudaEnabled = true
        }
        //
        x.hwaccel = ''
        x.cust_input = ''
        //input - frame rate (capture rate)
        if(e.details.sfps && e.details.sfps!==''){x.input_fps=' -r '+e.details.sfps}else{x.input_fps=''}
        //input - analyze duration
        if(e.details.aduration&&e.details.aduration!==''){x.cust_input+=' -analyzeduration '+e.details.aduration};
        //input - probe size
        if(e.details.probesize&&e.details.probesize!==''){x.cust_input+=' -probesize '+e.details.probesize};
        //input - stream loop (good for static files/lists)
        if(e.details.stream_loop === '1' && (e.type === 'mp4' || e.type === 'local')){x.cust_input+=' -stream_loop -1'};
        //input
        if(e.details.cust_input.indexOf('-fflags') === -1){x.cust_input+=' -fflags +igndts'}
        switch(e.type){
            case'h264':
                switch(e.protocol){
                    case'rtsp':
                        if(e.details.rtsp_transport&&e.details.rtsp_transport!==''&&e.details.rtsp_transport!=='no'){x.cust_input+=' -rtsp_transport '+e.details.rtsp_transport;}
                    break;
                }
            break;
        }
        //hardware acceleration
        if(e.details.accelerator && e.details.accelerator==='1' && e.isStreamer === false){
            if(e.details.hwaccel&&e.details.hwaccel!==''){
                x.hwaccel+=' -hwaccel '+e.details.hwaccel;
            }
            if(e.details.hwaccel_vcodec&&e.details.hwaccel_vcodec!==''){
                x.hwaccel+=' -c:v '+e.details.hwaccel_vcodec;
            }
            if(e.details.hwaccel_device&&e.details.hwaccel_device!==''){
                switch(e.details.hwaccel){
                    case'vaapi':
                        x.hwaccel+=' -vaapi_device '+e.details.hwaccel_device;
                    break;
                    default:
                        x.hwaccel+=' -hwaccel_device '+e.details.hwaccel_device;
                    break;
                }
            }
    //        else{
    //            if(e.details.hwaccel==='vaapi'){
    //                x.hwaccel+=' -hwaccel_device 0';
    //            }
    //        }
        }
        //logging - level
        if(e.details.loglevel&&e.details.loglevel!==''){x.loglevel='-loglevel '+e.details.loglevel;}else{x.loglevel='-loglevel error'}
        //custom - input flags
        if(e.details.cust_input&&e.details.cust_input!==''){x.cust_input+=' '+e.details.cust_input;}
        //add main input
        if((e.type === 'mp4' || e.type === 'mjpeg') && x.cust_input.indexOf('-re') === -1){
            x.cust_input += ' -re'
        }
    }
    ffmpeg.buildMainStream = function(e,x){
        //e = monitor object
        //x = temporary values
        x.stream_video_filters = []
        x.pipe = ''
        x.cust_stream = ''
        //stream - timestamp
        if(e.details.stream_timestamp&&e.details.stream_timestamp=="1"&&e.details.vcodec!=='copy'){
            //font
            if(e.details.stream_timestamp_font&&e.details.stream_timestamp_font!==''){x.stream_timestamp_font=e.details.stream_timestamp_font}else{x.stream_timestamp_font='/usr/share/fonts/truetype/freefont/FreeSans.ttf'}
            //position x
            if(e.details.stream_timestamp_x&&e.details.stream_timestamp_x!==''){x.stream_timestamp_x=e.details.stream_timestamp_x}else{x.stream_timestamp_x='(w-tw)/2'}
            //position y
            if(e.details.stream_timestamp_y&&e.details.stream_timestamp_y!==''){x.stream_timestamp_y=e.details.stream_timestamp_y}else{x.stream_timestamp_y='0'}
            //text color
            if(e.details.stream_timestamp_color&&e.details.stream_timestamp_color!==''){x.stream_timestamp_color=e.details.stream_timestamp_color}else{x.stream_timestamp_color='white'}
            //box color
            if(e.details.stream_timestamp_box_color&&e.details.stream_timestamp_box_color!==''){x.stream_timestamp_box_color=e.details.stream_timestamp_box_color}else{x.stream_timestamp_box_color='0x00000000@1'}
            //text size
            if(e.details.stream_timestamp_font_size&&e.details.stream_timestamp_font_size!==''){x.stream_timestamp_font_size=e.details.stream_timestamp_font_size}else{x.stream_timestamp_font_size='10'}

            x.stream_video_filters.push('drawtext=fontfile='+x.stream_timestamp_font+':text=\'%{localtime}\':x='+x.stream_timestamp_x+':y='+x.stream_timestamp_y+':fontcolor='+x.stream_timestamp_color+':box=1:boxcolor='+x.stream_timestamp_box_color+':fontsize='+x.stream_timestamp_font_size);
        }
        //stream - watermark for -vf
        if(e.details.stream_watermark&&e.details.stream_watermark=="1"&&e.details.stream_watermark_location&&e.details.stream_watermark_location!==''){
            switch(e.details.stream_watermark_position){
                case'tl'://top left
                    x.stream_watermark_position='10:10'
                break;
                case'tr'://top right
                    x.stream_watermark_position='main_w-overlay_w-10:10'
                break;
                case'bl'://bottom left
                    x.stream_watermark_position='10:main_h-overlay_h-10'
                break;
                default://bottom right
                    x.stream_watermark_position='(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
                break;
            }
            x.stream_video_filters.push('movie='+e.details.stream_watermark_location+'[watermark],[in][watermark]overlay='+x.stream_watermark_position+'[out]');
        }
        //stream - rotation
        if(e.details.rotate_stream&&e.details.rotate_stream!==""&&e.details.rotate_stream!=="no"&&e.details.stream_vcodec!=='copy'){
            x.stream_video_filters.push('transpose='+e.details.rotate_stream);
        }
        //stream - hls vcodec
        if(e.details.stream_vcodec&&e.details.stream_vcodec!=='no'){
            if(e.details.stream_vcodec!==''){x.stream_vcodec=' -c:v '+e.details.stream_vcodec}else{x.stream_vcodec=' -c:v libx264'}
        }else{
            x.stream_vcodec='';
        }
        //stream - hls acodec
        if(e.details.stream_acodec!=='no'){
        if(e.details.stream_acodec&&e.details.stream_acodec!==''){x.stream_acodec=' -c:a '+e.details.stream_acodec}else{x.stream_acodec=''}
        }else{
            x.stream_acodec=' -an';
        }
        //stream - hls segment time
        if(e.details.hls_time&&e.details.hls_time!==''){x.hls_time=e.details.hls_time}else{x.hls_time="2"}    //hls list size
        if(e.details.hls_list_size&&e.details.hls_list_size!==''){x.hls_list_size=e.details.hls_list_size}else{x.hls_list_size=2}
        //stream - custom flags
        if(e.details.cust_stream&&e.details.cust_stream!==''){x.cust_stream=' '+e.details.cust_stream}
        //stream - preset
        if(e.details.stream_type !== 'h265' && e.details.preset_stream && e.details.preset_stream !== ''){x.preset_stream=' -preset '+e.details.preset_stream;}else{x.preset_stream=''}

        if(e.details.stream_vcodec==='h264_vaapi'){
            x.stream_video_filters=[]
            x.stream_video_filters.push('format=nv12,hwupload');
            if(e.details.stream_scale_x&&e.details.stream_scale_x!==''&&e.details.stream_scale_y&&e.details.stream_scale_y!==''){
                x.stream_video_filters.push('scale_vaapi=w='+e.details.stream_scale_x+':h='+e.details.stream_scale_y)
            }
    	}
        if(e.cudaEnabled && (e.details.stream_type === 'mjpeg' || e.details.stream_type === 'b64')){
            x.stream_video_filters.push('hwdownload,format=nv12')
        }
        //stream - video filter
        if(e.details.svf && e.details.svf !== ''){
            x.stream_video_filters.push(e.details.svf)
        }
        if(x.stream_video_filters.length>0){
            x.stream_video_filters=' -vf "'+x.stream_video_filters.join(',')+'"'
        }else{
            x.stream_video_filters=''
        }
        //stream - pipe build
        if(e.details.input_map_choices&&e.details.input_map_choices.stream){
            //add input feed map
            x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.stream)
        }
        if(x.stream_fps && (e.details.stream_vcodec !== 'copy' || e.details.stream_type === 'mjpeg' || e.details.stream_type === 'b64')){
            x.cust_stream += x.stream_fps
        }
        switch(e.details.stream_type){
            case'mp4':
                x.cust_stream+=' -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream" -reset_timestamps 1'
                if(e.details.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -crf '+e.details.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f mp4'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:1';
            break;
            case'flv':
                if(e.details.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -crf '+e.details.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f flv'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:1';
            break;
            case'hls':
                if(e.details.stream_vcodec!=='h264_vaapi'&&e.details.stream_vcodec!=='copy'){
                    if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -crf '+e.details.stream_quality;
                    if(x.cust_stream.indexOf('-tune')===-1){x.cust_stream+=' -tune zerolatency'}
                    if(x.cust_stream.indexOf('-g ')===-1){x.cust_stream+=' -g 1'}
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=x.preset_stream+x.stream_acodec+x.stream_vcodec+' -f hls'+x.cust_stream+' -hls_time '+x.hls_time+' -hls_list_size '+x.hls_list_size+' -start_number 0 -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "'+e.sdir+'s.m3u8"';
            break;
            case'mjpeg':
                    if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -q:v '+e.details.stream_quality;
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    x.pipe+=' -an -c:v mjpeg -f mpjpeg -boundary_tag shinobi'+x.cust_stream+x.stream_video_filters+' pipe:1';
            break;
            case'h265':
                x.cust_stream+=' -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Shinobi H.265 Stream" -reset_timestamps 1'
                if(e.details.stream_vcodec!=='copy'){
                    if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                    if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -crf '+e.details.stream_quality;
                    x.cust_stream+=x.preset_stream
                    x.cust_stream+=x.stream_video_filters
                }
                x.pipe+=' -f hevc'+x.stream_acodec+x.stream_vcodec+x.cust_stream+' pipe:1';
            break;
            case'b64':case'':case undefined:case null://base64
                if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -q:v '+e.details.stream_quality;
                if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                x.pipe+=' -an -c:v mjpeg -f image2pipe'+x.cust_stream+x.stream_video_filters+' pipe:1';
            break;
            default:
                x.pipe=''
            break;
        }
        if(e.details.stream_channels){
            e.details.stream_channels.forEach(function(v,n){
                x.pipe += s.createStreamChannel(e,n+config.pipeAddition,v)
            })
        }
        //api - snapshot bin/ cgi.bin (JPEG Mode)
        if(e.details.snap === '1'){
            if(e.details.input_map_choices&&e.details.input_map_choices.snap){
                //add input feed map
                x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.snap)
            }
            if(!e.details.snap_fps || e.details.snap_fps === ''){e.details.snap_fps = 1}
            if(e.details.snap_vf && e.details.snap_vf !== '' || e.cudaEnabled){
                var snapVf = e.details.snap_vf.split(',')
                if(e.details.snap_vf === '')snapVf.shift()
                if(e.cudaEnabled){
                    snapVf.push('hwdownload,format=nv12')
                }
                //-vf "thumbnail_cuda=2,hwdownload,format=nv12"
                x.snap_vf=' -vf "'+snapVf.join(',')+'"'
            }else{
                x.snap_vf=''
            }
            if(e.details.snap_scale_x && e.details.snap_scale_x !== '' && e.details.snap_scale_y && e.details.snap_scale_y !== ''){x.snap_ratio = ' -s '+e.details.snap_scale_x+'x'+e.details.snap_scale_y}else{x.snap_ratio=''}
            if(e.details.cust_snap && e.details.cust_snap !== ''){x.cust_snap = ' '+e.details.cust_snap}else{x.cust_snap=''}
            x.pipe+=' -update 1 -r '+e.details.snap_fps+x.cust_snap+x.snap_ratio+x.snap_vf+' "'+e.sdir+'s.jpg" -y';
        }
        //custom - output
        if(e.details.custom_output&&e.details.custom_output!==''){x.pipe+=' '+e.details.custom_output;}
    }
    ffmpeg.buildMainRecording = function(e,x){
        //e = monitor object
        //x = temporary values
        x.record_video_filters = []
        x.record_string = ''
        //record - resolution
        if(e.width!==''&&e.height!==''&&!isNaN(e.width)&&!isNaN(e.height)){
            x.record_dimensions=' -s '+e.width+'x'+e.height
        }else{
            x.record_dimensions=''
        }
        if(e.details.stream_scale_x&&e.details.stream_scale_x!==''&&e.details.stream_scale_y&&e.details.stream_scale_y!==''){
            x.dimensions = e.details.stream_scale_x+'x'+e.details.stream_scale_y;
        }
        //record - segmenting
        x.segment=' -f segment -segment_atclocktime 1 -reset_timestamps 1 -strftime 1 -segment_list pipe:2 -segment_time '+(60*e.cutoff)+' "'+e.dir+'%Y-%m-%dT%H-%M-%S.'+e.ext+'"';
        //record - set defaults for extension, video quality
        switch(e.ext){
            case'mp4':
                x.vcodec='libx264';x.acodec='aac';
                if(e.details.crf&&e.details.crf!==''){x.vcodec+=' -crf '+e.details.crf}
            break;
            case'webm':
                x.acodec='libvorbis',x.vcodec='libvpx';
                if(e.details.crf&&e.details.crf!==''){x.vcodec+=' -q:v '+e.details.crf}else{x.vcodec+=' -q:v 1';}
            break;
        }
        if(e.details.vcodec==='h264_vaapi'){
           x.record_video_filters.push('format=nv12,hwupload');
        }
        //record - use custom video codec
        if(e.details.vcodec&&e.details.vcodec!==''&&e.details.vcodec!=='default'){x.vcodec=e.details.vcodec}
        //record - use custom audio codec
        if(e.details.acodec&&e.details.acodec!==''&&e.details.acodec!=='default'){x.acodec=e.details.acodec}
        if(e.details.cust_record){
            if(x.acodec=='aac'&&e.details.cust_record.indexOf('-strict -2')===-1){e.details.cust_record+=' -strict -2';}
            if(e.details.cust_record.indexOf('-threads')===-1){e.details.cust_record+=' -threads 1';}
        }
    //    if(e.details.cust_input&&(e.details.cust_input.indexOf('-use_wallclock_as_timestamps 1')>-1)===false){e.details.cust_input+=' -use_wallclock_as_timestamps 1';}
        //record - ready or reset codecs
        if(x.acodec!=='no'){
            if(x.acodec.indexOf('none')>-1){x.acodec=''}else{x.acodec=' -acodec '+x.acodec}
        }else{
            x.acodec=' -an'
        }
        if(x.vcodec.indexOf('none')>-1){x.vcodec=''}else{x.vcodec=' -vcodec '+x.vcodec}
        //record - frames per second (fps)
        if(e.fps&&e.fps!==''&&e.details.vcodec!=='copy'){x.record_fps=' -r '+e.fps}else{x.record_fps=''}
        //stream - frames per second (fps)
        if(e.details.stream_fps&&e.details.stream_fps!==''){x.stream_fps=' -r '+e.details.stream_fps}else{x.stream_fps = ''}
        //record - timestamp options for -vf
        if(e.details.timestamp&&e.details.timestamp=="1"&&e.details.vcodec!=='copy'){
            //font
            if(e.details.timestamp_font&&e.details.timestamp_font!==''){x.time_font=e.details.timestamp_font}else{x.time_font='/usr/share/fonts/truetype/freefont/FreeSans.ttf'}
            //position x
            if(e.details.timestamp_x&&e.details.timestamp_x!==''){x.timex=e.details.timestamp_x}else{x.timex='(w-tw)/2'}
            //position y
            if(e.details.timestamp_y&&e.details.timestamp_y!==''){x.timey=e.details.timestamp_y}else{x.timey='0'}
            //text color
            if(e.details.timestamp_color&&e.details.timestamp_color!==''){x.time_color=e.details.timestamp_color}else{x.time_color='white'}
            //box color
            if(e.details.timestamp_box_color&&e.details.timestamp_box_color!==''){x.time_box_color=e.details.timestamp_box_color}else{x.time_box_color='0x00000000@1'}
            //text size
            if(e.details.timestamp_font_size&&e.details.timestamp_font_size!==''){x.time_font_size=e.details.timestamp_font_size}else{x.time_font_size='10'}

            x.record_video_filters.push('drawtext=fontfile='+x.time_font+':text=\'%{localtime}\':x='+x.timex+':y='+x.timey+':fontcolor='+x.time_color+':box=1:boxcolor='+x.time_box_color+':fontsize='+x.time_font_size);
        }
        //record - watermark for -vf
        if(e.details.watermark&&e.details.watermark=="1"&&e.details.watermark_location&&e.details.watermark_location!==''){
            switch(e.details.watermark_position){
                case'tl'://top left
                    x.watermark_position='10:10'
                break;
                case'tr'://top right
                    x.watermark_position='main_w-overlay_w-10:10'
                break;
                case'bl'://bottom left
                    x.watermark_position='10:main_h-overlay_h-10'
                break;
                default://bottom right
                    x.watermark_position='(main_w-overlay_w-10)/2:(main_h-overlay_h-10)/2'
                break;
            }
            x.record_video_filters.push('movie='+e.details.watermark_location+'[watermark],[in][watermark]overlay='+x.watermark_position+'[out]');
        }
        //record - rotation
        if(e.details.rotate_record&&e.details.rotate_record!==""&&e.details.rotate_record!=="no"&&e.details.stream_vcodec!=="copy"){
            x.record_video_filters.push('transpose='+e.details.rotate_record);
        }
        //check custom record filters for -vf
        if(e.details.vf&&e.details.vf!==''){
            x.record_video_filters.push(e.details.vf)
        }
        //compile filter string for -vf
        if(x.record_video_filters.length>0){
           x.record_video_filters=' -vf '+x.record_video_filters.join(',')
        }else{
            x.record_video_filters=''
        }
        //build record string.
        if(e.mode === 'record'){
            if(e.details.input_map_choices&&e.details.input_map_choices.record){
                //add input feed map
                x.record_string += s.createFFmpegMap(e,e.details.input_map_choices.record)
            }
            //if h264, hls, mp4, or local add the audio codec flag
            switch(e.type){
                case'h264':case'hls':case'mp4':case'local':
                    x.record_string+=x.acodec;
                break;
            }
            //custom flags
            if(e.details.cust_record&&e.details.cust_record!==''){x.record_string+=' '+e.details.cust_record;}
            //preset flag
            if(e.details.preset_record&&e.details.preset_record!==''){x.record_string+=' -preset '+e.details.preset_record;}
            //main string write
            x.record_string+=x.vcodec+x.record_fps+x.record_video_filters+x.record_dimensions+x.segment;
        }
    }
    ffmpeg.buildMainDetector = function(e,x){
        //e = monitor object
        //x = temporary values
        x.cust_detect = ' '
        //detector - plugins, motion
        if(e.details.detector === '1' && e.details.detector_send_frames === '1'){
            if(e.details.input_map_choices&&e.details.input_map_choices.detector){
                //add input feed map
                x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.detector)
            }
            if(!e.details.detector_fps||e.details.detector_fps===''){e.details.detector_fps=2}
            if(e.details.detector_scale_x&&e.details.detector_scale_x!==''&&e.details.detector_scale_y&&e.details.detector_scale_y!==''){x.dratio=' -s '+e.details.detector_scale_x+'x'+e.details.detector_scale_y}else{x.dratio=' -s 320x240'}
            if(e.details.cust_detect&&e.details.cust_detect!==''){x.cust_detect+=e.details.cust_detect;}
            x.detector_vf = ['fps='+e.details.detector_fps]
            if(e.cudaEnabled){
                x.detector_vf.push('hwdownload,format=nv12')
            }
            x.detector_vf = '-vf "'+x.detector_vf.join(',')+'"'
            if(e.details.detector_pam==='1'){
                if(e.cudaEnabled){
                    x.pipe += ' -vf "hwdownload,format=nv12"'
                }
                x.pipe+=' -an -c:v pam -pix_fmt gray -f image2pipe -r '+e.details.detector_fps+x.cust_detect+x.dratio+' pipe:3'
                if(e.details.detector_use_detect_object === '1'){
                    //for object detection
                    x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.detector)
                    x.pipe += ' -f singlejpeg '+x.detector_vf+x.cust_detect+x.dratio+' pipe:4';
                }
            }else{
                x.pipe+=' -f image2pipe '+x.detector_vf+x.cust_detect+x.dratio+' pipe:3';
            }
        }
        //Traditional Recording Buffer
        if(e.details.detector=='1'&&e.details.detector_trigger=='1'&&e.details.detector_record_method==='sip'){
            if(e.details.input_map_choices&&e.details.input_map_choices.detector_sip_buffer){
                //add input feed map
                x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.detector_sip_buffer)
            }
            x.detector_buffer_filters=[]
            if(!e.details.detector_buffer_vcodec||e.details.detector_buffer_vcodec===''||e.details.detector_buffer_vcodec==='auto'){
                switch(e.type){
                    case'h264':case'hls':case'mp4':
                        e.details.detector_buffer_vcodec = 'copy'
                    break;
                    default:
                        if(e.details.accelerator === '1' && e.cudaEnabled){
                                e.details.detector_buffer_vcodec = 'h264_nvenc'
                        }else{
                            e.details.detector_buffer_vcodec = 'libx264'
                        }
                    break;
                }
            }
            if(!e.details.detector_buffer_acodec||e.details.detector_buffer_acodec===''||e.details.detector_buffer_acodec==='auto'){
                switch(e.type){
                    case'mjpeg':case'jpeg':case'socket':
                        e.details.detector_buffer_acodec = 'no'
                    break;
                    case'h264':case'hls':case'mp4':
                        e.details.detector_buffer_acodec = 'copy'
                    break;
                    default:
                        e.details.detector_buffer_acodec = 'aac'
                    break;
                }
            }
            if(e.details.detector_buffer_acodec === 'no'){
                x.detector_buffer_acodec = ' -an'
            }else{
                x.detector_buffer_acodec = ' -c:a '+e.details.detector_buffer_acodec
            }
            if(!e.details.detector_buffer_tune||e.details.detector_buffer_tune===''){e.details.detector_buffer_tune='zerolatency'}
            if(!e.details.detector_buffer_g||e.details.detector_buffer_g===''){e.details.detector_buffer_g='1'}
            if(!e.details.detector_buffer_hls_time||e.details.detector_buffer_hls_time===''){e.details.detector_buffer_hls_time='2'}
            if(!e.details.detector_buffer_hls_list_size||e.details.detector_buffer_hls_list_size===''){e.details.detector_buffer_hls_list_size='4'}
            if(!e.details.detector_buffer_start_number||e.details.detector_buffer_start_number===''){e.details.detector_buffer_start_number='0'}
            if(!e.details.detector_buffer_live_start_index||e.details.detector_buffer_live_start_index===''){e.details.detector_buffer_live_start_index='-3'}

            if(e.details.detector_buffer_vcodec.indexOf('_vaapi')>-1){
                if(x.hwaccel.indexOf('-vaapi_device')>-1){
                    x.detector_buffer_filters.push('format=nv12')
                    x.detector_buffer_filters.push('hwupload')
                }else{
                    e.details.detector_buffer_vcodec='libx264'
                }
            }
            if(e.details.detector_buffer_vcodec!=='copy'){
                if(e.details.detector_buffer_fps&&e.details.detector_buffer_fps!==''){
                    x.detector_buffer_fps=' -r '+e.details.detector_buffer_fps
                }else{
                    x.detector_buffer_fps=' -r 30'
                }
            }else{
                x.detector_buffer_fps=''
            }
            if(x.detector_buffer_filters.length>0){
                x.pipe+=' -vf '+x.detector_buffer_filters.join(',')
            }
            x.pipe+=x.detector_buffer_fps+x.detector_buffer_acodec+' -c:v '+e.details.detector_buffer_vcodec+' -f hls -tune '+e.details.detector_buffer_tune+' -g '+e.details.detector_buffer_g+' -hls_time '+e.details.detector_buffer_hls_time+' -hls_list_size '+e.details.detector_buffer_hls_list_size+' -start_number '+e.details.detector_buffer_start_number+' -live_start_index '+e.details.detector_buffer_live_start_index+' -hls_allow_cache 0 -hls_flags +delete_segments+omit_endlist "'+e.sdir+'detectorStream.m3u8"'
        }
    }
    ffmpeg.assembleMainPieces = function(e,x){
        //create executeable FFMPEG command
        x.ffmpegCommandString = x.loglevel+x.input_fps;
        //progress pipe
        x.ffmpegCommandString += ' -progress pipe:5';

        switch(e.type){
            case'dashcam':
                x.ffmpegCommandString += x.cust_input+x.hwaccel+' -i -';
            break;
            case'socket':case'jpeg':case'pipe'://case'webpage':
                x.ffmpegCommandString += ' -pattern_type glob -f image2pipe'+x.record_fps+' -vcodec mjpeg'+x.cust_input+x.hwaccel+' -i -';
            break;
            case'mjpeg':
                x.ffmpegCommandString += ' -reconnect 1 -f mjpeg'+x.cust_input+x.hwaccel+' -i "'+e.url+'"';
            break;
            case'h264':case'hls':case'mp4':
                x.ffmpegCommandString += x.cust_input+x.hwaccel+' -i "'+e.url+'"';
            break;
            case'local':
                x.ffmpegCommandString += x.cust_input+x.hwaccel+' -i "'+e.path+'"';
            break;
        }
        //add extra input maps
        if(e.details.input_maps){
            e.details.input_maps.forEach(function(v,n){
                x.ffmpegCommandString += s.createInputMap(e,n+1,v)
            })
        }
        //add recording and stream outputs
        x.ffmpegCommandString += x.record_string+x.pipe
    }
    ffmpeg.createPipeArray = function(e,x){
        //create additional pipes from ffmpeg
        x.stdioPipes = [];
        var times = config.pipeAddition;
        if(e.details.stream_channels){
            times+=e.details.stream_channels.length
        }
        for(var i=0; i < times; i++){
            x.stdioPipes.push('pipe')
        }
    }
    s.ffmpeg = function(e){
        //set X for temporary values so we don't break our main monitor object.
        var x = {tmp : ''}
        //set some placeholding values to avoid "undefined" in ffmpeg string.
        ffmpeg.buildMainInput(e,x)
        ffmpeg.buildMainStream(e,x)
        ffmpeg.buildMainRecording(e,x)
        ffmpeg.buildMainDetector(e,x)
        ffmpeg.assembleMainPieces(e,x)
        ffmpeg.createPipeArray(e,x)
        //hold ffmpeg command for log stream
        s.group[e.ke].mon[e.mid].ffmpeg = x.ffmpegCommandString
        //clean the string of spatial impurities and split for spawn()
        x.ffmpegCommandString = s.splitForFFPMEG(x.ffmpegCommandString)
        //launch that bad boy
        return spawn(config.ffmpegDir,x.ffmpegCommandString,{detached: true,stdio:x.stdioPipes})
    }
    if(!config.ffmpegDir){
        ffmpeg.checkForWindows(function(){
            ffmpeg.checkForUnix(function(){
                ffmpeg.checkForFfbinary(function(){
                    ffmpeg.checkForNpmStatic(function(){
                        console.log('No FFmpeg found.')
                    })
                })
            })
        })
    }
    if(downloadingFfmpeg === false){
        //not downloading ffmpeg
        ffmpeg.completeCheck()
    }
    return ffmpeg
}
