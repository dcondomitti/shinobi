var spawn = require('child_process').spawn;
module.exports = function(s,config,lang,ffmpeg){
    ffmpeg.buildCoProcessorInput = function(e,x){
        if(e.details.userLoglevel&&e.details.userLoglevel!==''){x.loglevel='-loglevel '+e.details.userLoglevel;}else{x.loglevel='-loglevel error'}
        x.input = x.loglevel+' -re -i '+e.sdir+'coProcessor.m3u8'
    }
    ffmpeg.buildCoProcessorStream = function(e,x){
        x.stream_video_filters = []
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
        if(e.details.svf&&e.details.svf!==''){
            x.stream_video_filters.push(e.details.svf)
        }
        if(x.stream_video_filters.length>0){
            x.stream_video_filters=' -vf '+x.stream_video_filters.join(',')
        }else{
            x.stream_video_filters=''
        }
        if(e.details.cust_stream&&e.details.cust_stream!==''){x.cust_stream=' '+e.details.cust_stream}else{x.cust_stream=''}
        if(e.details.stream_fps&&e.details.stream_fps!==''){x.stream_fps=' -r '+e.details.stream_fps}else{x.stream_fps=''}
        if(e.details.stream_vcodec !== 'copy' || e.details.stream_type === 'mjpeg' || e.details.stream_type === 'b64'){
            x.cust_stream += x.stream_fps
        }
        switch(e.details.stream_type){
            case'mjpeg':
                if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -q:v '+e.details.stream_quality;
                if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                x.pipe += ' -an -c:v mjpeg -f mpjpeg -boundary_tag shinobi'+x.cust_stream+x.stream_video_filters+' pipe:1';
            break;
            case'b64':case'':case undefined:case null://base64
                if(e.details.stream_quality && e.details.stream_quality !== '')x.cust_stream+=' -q:v '+e.details.stream_quality;
                if(x.dimensions && x.cust_stream.indexOf('-s ')===-1){x.cust_stream+=' -s '+x.dimensions}
                x.pipe += ' -an -c:v mjpeg -f image2pipe'+x.cust_stream+x.stream_video_filters+' pipe:1';
            break;
        }
    }
    ffmpeg.buildCoProcessorDetector = function(e,x){
        //detector frames
        x.cust_detect=' '
        if(e.details.detector === '1'){
            if(e.details.detector_fps && e.details.detector_fps !== ''){
                x.detector_fps = e.details.detector_fps
            }else{
                x.detector_fps = '2'
            }
            if(e.details.detector_scale_x && e.details.detector_scale_x !== '' && e.details.detector_scale_y && e.details.detector_scale_y !== ''){
                x.dratio=' -s '+e.details.detector_scale_x+'x'+e.details.detector_scale_y
            }else{
                x.dratio=' -s 320x240'
            }

            if(e.details.cust_detect&&e.details.cust_detect!==''){x.cust_detect+=e.details.cust_detect;}
            if(e.details.detector_pam==='1'){
                x.pipe += ' -an -c:v pam -pix_fmt gray -f image2pipe -r '+x.detector_fps+x.cust_detect+x.dratio+' pipe:3'
                if(e.details.detector_use_detect_object === '1'){
                    if(e.details.detector_use_motion === '1'){
                        if(e.details.detector_scale_x_object && e.details.detector_scale_x_object !== '' && e.details.detector_scale_y_object && e.details.detector_scale_y_object !== ''){
                            x.dratio=' -s '+e.details.detector_scale_x_object+'x'+e.details.detector_scale_y_object
                        }
                        if(e.details.detector_fps_object && e.details.detector_fps_object !== ''){
                            x.detector_fps = e.details.detector_fps_object
                        }
                    }
                    //for object detection
                    x.pipe += s.createFFmpegMap(e,e.details.input_map_choices.detector)
                    x.pipe += ' -f singlejpeg -vf fps='+x.detector_fps+x.cust_detect+x.dratio+' pipe:4';
                }
            }else{
                x.pipe+=' -f singlejpeg -vf fps='+x.detector_fps+x.cust_detect+x.dratio+' pipe:3';
            }
        }
    }
    ffmpeg.buildCoProcessorJpegApi = function(e,x){
        //snapshot frames
        if(e.details.snap === '1'){
            if(!e.details.snap_fps || e.details.snap_fps === ''){e.details.snap_fps = 1}
            if(e.details.snap_vf && e.details.snap_vf !== ''){x.snap_vf=' -vf '+e.details.snap_vf}else{x.snap_vf=''}
            if(e.details.snap_scale_x && e.details.snap_scale_x !== '' && e.details.snap_scale_y && e.details.snap_scale_y !== ''){x.snap_ratio = ' -s '+e.details.snap_scale_x+'x'+e.details.snap_scale_y}else{x.snap_ratio=''}
            if(e.details.cust_snap && e.details.cust_snap !== ''){x.cust_snap = ' '+e.details.cust_snap}else{x.cust_snap=''}
            x.pipe += ' -update 1 -r '+e.details.snap_fps+x.cust_snap+x.snap_ratio+x.snap_vf+' "'+e.sdir+'s.jpg" -y';
        }
    }
    ffmpeg.buildCoProcessorPipeArray = function(e,x){
        x.stdioPipes = [];
        var times = config.pipeAddition;
        if(e.details.stream_channels){
            times+=e.details.stream_channels.length
        }
        for(var i=0; i < times; i++){
            x.stdioPipes.push('pipe')
        }
    }
    s.ffmpegCoProcessor = function(e){
        if(e.coProcessor === false)return;
        var x = {}
        x.pipe = ''
        ffmpeg.buildCoProcessorInput(e,x)
        ffmpeg.buildCoProcessorStream(e,x)
        ffmpeg.buildCoProcessorDetector(e,x)
        ffmpeg.buildCoProcessorJpegApi(e,x)
        ffmpeg.buildCoProcessorPipeArray(e,x)
        var commandString = x.input + x.pipe
        if(commandString === x.input){
            return false
        }
        s.group[e.ke].mon[e.mid].coProcessorCmd = commandString
        return spawn(config.ffmpegDir,s.splitForFFPMEG((commandString).replace(/\s+/g,' ').trim()),{detached: true,stdio:x.stdioPipes})
    }
    s.coSpawnLauncher = function(e){
        if(s.group[e.ke].mon[e.id].isStarted === true && e.coProcessor === true){
            s.coSpawnClose(e)
            s.group[e.ke].mon[e.id].coSpawnProcessor = s.ffmpegCoProcessor(e)
            if(s.group[e.ke].mon[e.id].coSpawnProcessor === false){
                return
            }
            s.userLog(e,{type:lang['coProcessor Started'],msg:{msg:lang.coProcessorTextStarted,cmd:s.group[e.ke].mon[e.id].coProcessorCmd}});
            s.group[e.ke].mon[e.id].coSpawnProcessorExit = function(){
                s.userLog(e,{type:lang['coProcess Unexpected Exit'],msg:{msg:lang['coProcess Crashed for Monitor']+' : '+e.id,cmd:s.group[e.ke].mon[e.id].coProcessorCmd}});
                setTimeout(function(){
                    s.coSpawnLauncher(e)
                },2000)
            }
            s.group[e.ke].mon[e.id].coSpawnProcessor.on('end',s.group[e.ke].mon[e.id].coSpawnProcessorExit)
            s.group[e.ke].mon[e.id].coSpawnProcessor.on('exit',s.group[e.ke].mon[e.id].coSpawnProcessorExit)
            var checkLog = function(d,x){return d.indexOf(x)>-1;}
            s.group[e.ke].mon[e.id].coSpawnProcessor.stderr.on('data',function(d){
                d=d.toString();
                switch(true){
                    case checkLog(d,'deprecated pixel format used'):
                    case checkLog(d,'[hls @'):
                    case checkLog(d,'Past duration'):
                    case checkLog(d,'Last message repeated'):
                    case checkLog(d,'pkt->duration = 0'):
                    case checkLog(d,'Non-monotonous DTS'):
                    case checkLog(d,'NULL @'):
                        return
                    break;
                }
                s.userLog(e,{type:lang.coProcessor,msg:d});
            })
            if(e.frame_to_stream){
                s.group[e.ke].mon[e.id].coSpawnProcessor.stdout.on('data',e.frame_to_stream)
            }
            if(e.details.detector === '1'){
                s.ocvTx({f:'init_monitor',id:e.id,ke:e.ke})
                //frames from motion detect
                if(e.details.detector_pam === '1'){
                   s.createPamDiffEngine(e)
                   s.group[e.ke].mon[e.id].coSpawnProcessor.stdio[3].pipe(s.group[e.ke].mon[e.id].p2p).pipe(s.group[e.ke].mon[e.id].pamDiff)
                    if(e.details.detector_use_detect_object === '1'){
                        s.group[e.ke].mon[e.id].coSpawnProcessor.stdio[4].on('data',function(d){
                            s.group[e.ke].mon[e.id].lastJpegDetectorFrame = d
                        })
                    }
                }else if(s.isAtleatOneDetectorPluginConnected){
                    s.group[e.ke].mon[e.id].coSpawnProcessor.stdio[3].on('data',function(d){
                        s.ocvTx({f:'frame',mon:s.group[e.ke].mon_conf[e.id].details,ke:e.ke,id:e.id,time:s.formattedTime(),frame:d});
                    })
                }
            }
        }
    }
    s.coSpawnClose = function(e){
        if(s.group[e.ke].mon[e.id].coSpawnProcessor){
            s.group[e.ke].mon[e.id].coSpawnProcessor.removeListener('end',s.group[e.ke].mon[e.id].coSpawnProcessorExit);
            s.group[e.ke].mon[e.id].coSpawnProcessor.removeListener('exit',s.group[e.ke].mon[e.id].coSpawnProcessorExit);
            s.group[e.ke].mon[e.id].coSpawnProcessor.stdin.pause()
            s.group[e.ke].mon[e.id].coSpawnProcessor.kill()
            delete(s.group[e.ke].mon[e.id].coSpawnProcessor)
            s.userLog(e,{type:lang['coProcessor Stopped'],msg:{msg:lang.coProcessorTextStopped+' : '+e.id}});
        }
    }
}
