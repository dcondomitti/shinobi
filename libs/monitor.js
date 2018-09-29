var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var Mp4Frag = require('mp4frag');
var onvif = require('node-onvif');
var request = require('request');
var connectionTester = require('connection-tester');
module.exports = function(s,config,lang){
    s.initiateMonitorObject = function(e){
        if(!s.group[e.ke]){s.group[e.ke]={}};
        if(!s.group[e.ke].mon){s.group[e.ke].mon={}}
        if(!s.group[e.ke].mon[e.mid]){s.group[e.ke].mon[e.mid]={}}
        if(!s.group[e.ke].mon[e.mid].streamIn){s.group[e.ke].mon[e.mid].streamIn={}};
        if(!s.group[e.ke].mon[e.mid].emitterChannel){s.group[e.ke].mon[e.mid].emitterChannel={}};
        if(!s.group[e.ke].mon[e.mid].mp4frag){s.group[e.ke].mon[e.mid].mp4frag={}};
        if(!s.group[e.ke].mon[e.mid].firstStreamChunk){s.group[e.ke].mon[e.mid].firstStreamChunk={}};
        if(!s.group[e.ke].mon[e.mid].contentWriter){s.group[e.ke].mon[e.mid].contentWriter={}};
        if(!s.group[e.ke].mon[e.mid].childNodeStreamWriters){s.group[e.ke].mon[e.mid].childNodeStreamWriters={}};
        if(!s.group[e.ke].mon[e.mid].eventBasedRecording){s.group[e.ke].mon[e.mid].eventBasedRecording={}};
        if(!s.group[e.ke].mon[e.mid].watch){s.group[e.ke].mon[e.mid].watch={}};
        if(!s.group[e.ke].mon[e.mid].fixingVideos){s.group[e.ke].mon[e.mid].fixingVideos={}};
        if(!s.group[e.ke].mon[e.mid].record){s.group[e.ke].mon[e.mid].record={yes:e.record}};
        if(!s.group[e.ke].mon[e.mid].started){s.group[e.ke].mon[e.mid].started=0};
        if(s.group[e.ke].mon[e.mid].delete){clearTimeout(s.group[e.ke].mon[e.mid].delete)}
        if(!s.group[e.ke].mon_conf){s.group[e.ke].mon_conf={}}
    }
    s.sendMonitorStatus = function(e){
        s.group[e.ke].mon[e.id].monitorStatus = e.status
        s.tx(Object.assign(e,{f:'monitor_status'}),'GRP_'+e.ke)
    }
    s.buildMonitorUrl = function(e,noPath){
        var authd = ''
        var url
        if(e.details.muser&&e.details.muser!==''&&e.host.indexOf('@')===-1) {
            e.username = e.details.muser
            e.password = e.details.mpass
            authd = e.details.muser+':'+e.details.mpass+'@'
        }
        if(e.port==80&&e.details.port_force!=='1'){e.porty=''}else{e.porty=':'+e.port}
        url = e.protocol+'://'+authd+e.host+e.porty
        if(noPath !== true)url += e.path
        return url
    }
    s.cleanMonitorObject = function(e){
        x={keys:Object.keys(e),ar:{}};
        x.keys.forEach(function(v){
            if(v!=='last_frame'&&v!=='record'&&v!=='spawn'&&v!=='running'&&(v!=='time'&&typeof e[v]!=='function')){x.ar[v]=e[v];}
        });
        return x.ar;
    }
    s.getRawSnapshotFromMonitor = function(monitor,options,callback){
        if(!callback){
            callback = options
            var options = ''
        }else{
            options = ' '+options
        }
        var url
        var runExtraction = function(){
            var snapBuffer = []
            var snapProcess = spawn(config.ffmpegDir,('-loglevel quiet -re -i '+url+options+' -frames:v 1 -f singlejpeg pipe:1').split(' '),{detached: true})
            snapProcess.stdout.on('data',function(data){
                snapBuffer.push(data)
            });
            snapProcess.on('close',function(data){
                snapBuffer = Buffer.concat(snapBuffer)
                callback(snapBuffer)
            })
        }
        var checkExists = function(localStream,callback){
            fs.stat(localStream,function(err){
                if(err){
                    callback(false)
                }else{
                    callback(true)
                }
            })
        }
        var localStream = s.dir.streams+monitor.ke+'/'+monitor.mid+'/'
        checkExists(localStream+'s.jpg',function(success){
            if(success === false){
                checkExists(localStream+'detectorStream.m3u8',function(success){
                    if(success === false){
                        checkExists(localStream+'s.m3u8',function(success){
                            if(success === false){
                                url = s.buildMonitorUrl(monitor)
                            }else{
                                url = localStream+'s.m3u8'
                            }
                            runExtraction()
                        })
                    }else{
                        url = localStream+'detectorStream.m3u8'
                        runExtraction()
                    }
                })
            }else{
                fs.readFile(localStream+'s.jpg',function(err,snapBuffer){
                    callback(snapBuffer)
                })
            }
        })
    }
    s.mergeDetectorBufferChunks = function(monitor,callback){
        var pathDir = s.dir.streams+monitor.ke+'/'+monitor.id+'/'
        var mergedFile = s.formattedTime()+'.mp4'
        var mergedFilepath = pathDir+mergedFile
        var streamDirItems = fs.readdirSync(pathDir)
        var items = []
        var copiedItems = []
        var createMerged = function(copiedItems){
            var allts = pathDir+items.join('_')
            fs.stat(allts,function(err,stats){
                if(err){
                    //not exist
                    var cat = 'cat '+copiedItems.join(' ')+' > '+allts
                    exec(cat,function(){
                        var merger = spawn(config.ffmpegDir,s.splitForFFPMEG(('-re -i '+allts+' -acodec copy -vcodec copy '+pathDir+mergedFile)))
                        merger.stderr.on('data',function(data){
                            s.log(monitor,{type:"Buffer Merge",msg:data.toString()})
                        })
                        merger.on('close',function(){
                            s.file('delete',allts)
                            copiedItems.forEach(function(copiedItem){
                                s.file('delete',copiedItem)
                            })
                            setTimeout(function(){
                                s.file('delete',mergedFilepath)
                            },1000 * 60 * 3)
                            delete(merger)
                            callback(mergedFilepath,mergedFile)
                        })
                    })
                }else{
                    //file exist
                    callback(mergedFilepath,mergedFile)
                }
            })
        }
        streamDirItems.forEach(function(filename){
            if(filename.indexOf('detectorStream') > -1 && filename.indexOf('.m3u8') === -1){
                items.push(filename)
            }
        })
        items.sort()
        items = items.slice(items.length - 5,items.length)
        items.forEach(function(filename){
            try{
                var tempFilename = filename.split('.')
                tempFilename[0] = tempFilename[0] + 'm'
                tempFilename = tempFilename.join('.')
                var tempWriteStream = fs.createWriteStream(pathDir+tempFilename)
                tempWriteStream.on('finish', function(){
                    copiedItems.push(pathDir+tempFilename)
                    if(copiedItems.length === items.length){
                        createMerged(copiedItems.sort())
                    }
                })
                fs.createReadStream(pathDir+filename).pipe(tempWriteStream)
            }catch(err){

            }
        })
        return items
    }

    s.kill = function(x,e,p){
        if(s.group[e.ke]&&s.group[e.ke].mon[e.id]&&s.group[e.ke].mon[e.id].spawn !== undefined){
            if(s.group[e.ke].mon[e.id].spawn){
                s.group[e.ke].mon[e.id].allowStdinWrite = false
                s.txToDashcamUsers({
                    f : 'disable_stream',
                    ke : e.ke,
                    mid : e.id
                },e.ke)
                s.group[e.ke].mon[e.id].spawn.stdio[3].unpipe();
    //            if(s.group[e.ke].mon[e.id].p2pStream){s.group[e.ke].mon[e.id].p2pStream.unpipe();}
                if(s.group[e.ke].mon[e.id].p2p){s.group[e.ke].mon[e.id].p2p.unpipe();}
                delete(s.group[e.ke].mon[e.id].p2pStream)
                delete(s.group[e.ke].mon[e.id].p2p)
                delete(s.group[e.ke].mon[e.id].pamDiff)
                try{
                    s.group[e.ke].mon[e.id].spawn.removeListener('end',s.group[e.ke].mon[e.id].spawn_exit);
                    s.group[e.ke].mon[e.id].spawn.removeListener('exit',s.group[e.ke].mon[e.id].spawn_exit);
                    delete(s.group[e.ke].mon[e.id].spawn_exit);
                }catch(er){}
            }
            s.group[e.ke].mon[e.id].firstStreamChunk = {}
            clearTimeout(s.group[e.ke].mon[e.id].checker);
            delete(s.group[e.ke].mon[e.id].checker);
            clearTimeout(s.group[e.ke].mon[e.id].checkStream);
            delete(s.group[e.ke].mon[e.id].checkStream);
            clearTimeout(s.group[e.ke].mon[e.id].checkSnap);
            delete(s.group[e.ke].mon[e.id].checkSnap);
            clearTimeout(s.group[e.ke].mon[e.id].watchdog_stop);
            delete(s.group[e.ke].mon[e.id].watchdog_stop);
            delete(s.group[e.ke].mon[e.id].lastJpegDetectorFrame);
            if(e&&s.group[e.ke].mon[e.id].record){
                clearTimeout(s.group[e.ke].mon[e.id].record.capturing);
    //            if(s.group[e.ke].mon[e.id].record.request){s.group[e.ke].mon[e.id].record.request.abort();delete(s.group[e.ke].mon[e.id].record.request);}
            };
            // if(s.group[e.ke].mon[e.id].casper){
            //     s.group[e.ke].mon[e.id].casper.done()
            //     delete(s.group[e.ke].mon[e.id].casper)
            //     clearInterval(s.group[e.ke].mon[e.id].casperCapture)
            // }
            if(s.group[e.ke].mon[e.id].childNode){
                s.cx({f:'kill',d:s.cleanMonitorObject(e)},s.group[e.ke].mon[e.id].childNodeId)
            }else{
                if(!x||x===1){return};
                p=x.pid;
                if(s.group[e.ke].mon_conf[e.id].type===('dashcam'||'socket'||'jpeg'||'pipe')){
                    x.stdin.pause();setTimeout(function(){x.kill('SIGTERM');},500)
                }else{
                    try{
                        x.stdin.setEncoding('utf8');x.stdin.write('q');
                    }catch(er){}
                }
                setTimeout(function(){exec('kill -9 '+p,{detached: true})},1000)
            }
        }
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
            pipe:''
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
        if(channel.cust_stream&&channel.cust_stream!==''){x.cust_stream=' '+channel.cust_stream}else{x.cust_stream=''}
        //stream - preset
        if(channel.stream_type !== 'h265' && channel.preset_stream && channel.preset_stream!==''){x.preset_stream=' -preset '+channel.preset_stream;}else{x.preset_stream=''}
        //hardware acceleration
        if(e.details.accelerator&&e.details.accelerator==='1'){
            if(e.details.hwaccel&&e.details.hwaccel!==''){
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

    s.ffmpeg = function(e){
        e.isStreamer = (e.type === 'dashcam'|| e.type === 'socket')
        if(e.details.accelerator === '1' && e.details.hwaccel === 'cuvid' && e.details.hwaccel_vcodec === ('h264_cuvid' || 'hevc_cuvid' || 'mjpeg_cuvid' || 'mpeg4_cuvid')){
            e.cudaEnabled = true
        }
        //set X for temporary values so we don't break our main monitor object.
        var x={tmp:''};
        //set some placeholding values to avoid "undefined" in ffmpeg string.
        x.record_string=''
        x.cust_input=''
        x.cust_detect=' '
        x.record_video_filters=[]
        x.stream_video_filters=[]
        x.hwaccel=''
        x.pipe=''
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
        if(e.details.stream_fps&&e.details.stream_fps!==''){x.stream_fps=' -r '+e.details.stream_fps}else{x.stream_fps=''}
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
        if(e.details.cust_stream&&e.details.cust_stream!==''){x.cust_stream=' '+e.details.cust_stream}else{x.cust_stream=''}
        //stream - preset
        if(e.details.stream_type !== 'h265' && e.details.preset_stream && e.details.preset_stream !== ''){x.preset_stream=' -preset '+e.details.preset_stream;}else{x.preset_stream=''}
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
        if(e.details.stream_vcodec !== 'copy' || e.details.stream_type === 'mjpeg' || e.details.stream_type === 'b64'){
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
                x.pipe+=' -f singlejpeg '+x.detector_vf+x.cust_detect+x.dratio+' pipe:3';
            }
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
        //custom - output
        if(e.details.custom_output&&e.details.custom_output!==''){x.pipe+=' '+e.details.custom_output;}
        //custom - input flags
        if(e.details.cust_input&&e.details.cust_input!==''){x.cust_input+=' '+e.details.cust_input;}
        //logging - level
        if(e.details.loglevel&&e.details.loglevel!==''){x.loglevel='-loglevel '+e.details.loglevel;}else{x.loglevel='-loglevel error'}
        //build record string.
        if(e.mode==='record'){
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
        //create executeable FFMPEG command
        x.ffmpegCommandString = x.loglevel+x.input_fps;
        //progress pipe
        x.ffmpegCommandString += ' -progress pipe:5';
        //add main input
        if((e.type === 'mp4' || e.type === 'mjpeg') && x.cust_input.indexOf('-re') === -1){
            x.cust_input += ' -re'
        }
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
        //hold ffmpeg command for log stream
        s.group[e.ke].mon[e.mid].ffmpeg = x.ffmpegCommandString;
        //create additional pipes from ffmpeg
        x.stdioPipes = [];
        var times = config.pipeAddition;
        if(e.details.stream_channels){
            times+=e.details.stream_channels.length
        }
        for(var i=0; i < times; i++){
            x.stdioPipes.push('pipe')
        }
        x.ffmpegCommandString = s.splitForFFPMEG(x.ffmpegCommandString.replace(/\s+/g,' ').trim())
        return spawn(config.ffmpegDir,x.ffmpegCommandString,{detached: true,stdio:x.stdioPipes});
    }
    s.camera=function(x,e,cn,tx){
        if(x!=='motion'){
            var ee=s.cleanMonitorObject(e);
            if(!e){e={}};if(cn&&cn.ke&&!e.ke){e.ke=cn.ke};
            if(!e.mode){e.mode=x;}
            if(!e.id&&e.mid){e.id=e.mid}
        }
        if(e.details&&(e.details instanceof Object)===false){
            try{e.details=JSON.parse(e.details)}catch(err){}
        }
        //parse Objects
        (['detector_cascades','cords','detector_filters','input_map_choices']).forEach(function(v){
            if(e.details&&e.details[v]&&(e.details[v] instanceof Object)===false){
                try{
                    if(e.details[v] === '') e.details[v] = '{}'
                    e.details[v]=JSON.parse(e.details[v]);
                    if(!e.details[v])e.details[v]={};
                    s.group[e.ke].mon[e.id].details = e.details;
                }catch(err){

                }
            }
        });
        //parse Arrays
        (['stream_channels','input_maps']).forEach(function(v){
            if(e.details&&e.details[v]&&(e.details[v] instanceof Array)===false){
                try{
                    e.details[v]=JSON.parse(e.details[v]);
                    if(!e.details[v])e.details[v]=[];
                }catch(err){
                    e.details[v]=[];
                }
            }
        });
        s.initiateMonitorObject({ke:e.ke,mid:e.id})
        switch(x){
            case'buildOptionsFromUrl':
                var monitorConfig = cn
                URLobject=URL.parse(e)
                if(monitorConfig.details.control_url_method === 'ONVIF' && monitorConfig.details.control_base_url === ''){
                    if(monitorConfig.details.onvif_port === ''){
                        monitorConfig.details.onvif_port = 8000
                    }
                    URLobject.port = monitorConfig.details.onvif_port
                }else if(!URLobject.port){
                    URLobject.port = 80
                }
                options = {
                    host: URLobject.hostname,
                    port: URLobject.port,
                    method: monitorConfig.details.control_url_method,
                    path: URLobject.pathname,
                };
                if(URLobject.query){
                    options.path=options.path+'?'+URLobject.query
                }
                if(URLobject.username&&URLobject.password){
                    options.username = URLobject.username
                    options.password = URLobject.password
                    options.auth=URLobject.username+':'+URLobject.password
                }else if(URLobject.auth){
                    var auth = URLobject.auth.split(':')
                    options.auth=URLobject.auth
                    options.username = auth[0]
                    options.password = auth[1]
                }
                return options
            break;
            case'control':
                if(!s.group[e.ke]||!s.group[e.ke].mon[e.id]){return}
                var monitorConfig = s.group[e.ke].mon_conf[e.id];
                if(monitorConfig.details.control!=="1"){s.log(e,{type:lang['Control Error'],msg:lang.ControlErrorText1});return}
                if(!monitorConfig.details.control_base_url||monitorConfig.details.control_base_url===''){
                    e.base = s.buildMonitorUrl(monitorConfig, true);
                }else{
                    e.base = monitorConfig.details.control_base_url;
                }
                if(!monitorConfig.details.control_url_stop_timeout || monitorConfig.details.control_url_stop_timeout === ''){
                    monitorConfig.details.control_url_stop_timeout = 1000
                }
                if(!monitorConfig.details.control_url_method||monitorConfig.details.control_url_method===''){monitorConfig.details.control_url_method="GET"}
                var controlURL = e.base+monitorConfig.details['control_url_'+e.direction]
                var controlURLOptions = s.camera('buildOptionsFromUrl',controlURL,monitorConfig)
                if(monitorConfig.details.control_url_stop_timeout === '0' && monitorConfig.details.control_stop === '1' && s.group[e.ke].mon[e.id].ptzMoving === true){
                    e.direction = 'stopMove'
                    s.group[e.ke].mon[e.id].ptzMoving = false
                }else{
                    s.group[e.ke].mon[e.id].ptzMoving = true
                }
                if(monitorConfig.details.control_url_method === 'ONVIF'){
                    try{
                        var move = function(device){
                            var stopOptions = {ProfileToken : device.current_profile.token,'PanTilt': true,'Zoom': true}
                            switch(e.direction){
                                case'center':
    //                                device.services.ptz.gotoHomePosition()
                                    msg = {type:'Center button inactive'}
                                    s.log(e,msg)
                                    cn(msg)
                                break;
                                case'stopMove':
                                    msg = {type:'Control Trigger Ended'}
                                    s.log(e,msg)
                                    cn(msg)
                                    device.services.ptz.stop(stopOptions).then((result) => {
    //                                    console.log(JSON.stringify(result['data'], null, '  '));
                                    }).catch((error) => {
    //                                    console.error(error);
                                    });
                                break;
                                default:
                                    var controlOptions = {
                                        ProfileToken : device.current_profile.token,
                                        Velocity : {}
                                    }
                                    var onvifDirections = {
                                        "left" : [-1.0,'x'],
                                        "right" : [1.0,'x'],
                                        "down" : [-1.0,'y'],
                                        "up" : [1.0,'y'],
                                        "zoom_in" : [1.0,'zoom'],
                                        "zoom_out" : [-1.0,'zoom']
                                    }
                                    var direction = onvifDirections[e.direction]
                                    controlOptions.Velocity[direction[1]] = direction[0];
                                    (['x','y','z']).forEach(function(axis){
                                        if(!controlOptions.Velocity[axis])
                                            controlOptions.Velocity[axis] = 0
                                    })
                                    if(monitorConfig.details.control_stop=='1'){
                                        device.services.ptz.continuousMove(controlOptions).then(function(err){
                                            s.log(e,{type:'Control Trigger Started'});
                                            if(monitorConfig.details.control_url_stop_timeout !== '0'){
                                                setTimeout(function(){
                                                    msg = {type:'Control Trigger Ended'}
                                                    s.log(e,msg)
                                                    cn(msg)
                                                    device.services.ptz.stop(stopOptions).then((result) => {
    //                                                    console.log(JSON.stringify(result['data'], null, '  '));
                                                    }).catch((error) => {
                                                        console.log(error);
                                                    });
                                                },monitorConfig.details.control_url_stop_timeout)
                                            }
                                        }).catch(function(err){
                                            console.log(err)
                                        });
                                    }else{
                                        device.services.ptz.absoluteMove(controlOptions).then(function(err){
                                            msg = {type:'Control Triggered'}
                                            s.log(e,msg);
                                            cn(msg)
                                        }).catch(function(err){
                                            console.log(err)
                                        });
                                    }
                                break;
                            }
                        }
                        //create onvif connection
                        if(!s.group[e.ke].mon[e.id].onvifConnection){
                            s.group[e.ke].mon[e.id].onvifConnection = new onvif.OnvifDevice({
                                xaddr : 'http://' + controlURLOptions.host + ':' + controlURLOptions.port + '/onvif/device_service',
                                user : controlURLOptions.username,
                                pass : controlURLOptions.password
                            })
                            s.group[e.ke].mon[e.id].onvifConnection.init().then((info) => {
                                move(s.group[e.ke].mon[e.id].onvifConnection)
                            }).catch(function(error){
                                console.log(error)
                                s.log(e,{type:lang['Control Error'],msg:error})
                            })
                        }else{
                            move(s.group[e.ke].mon[e.id].onvifConnection)
                        }
                    }catch(err){
                        console.log(err)
                        msg = {type:lang['Control Error'],msg:{msg:lang.ControlErrorText2,error:err,options:controlURLOptions,direction:e.direction}}
                        s.log(e,msg)
                        cn(msg)
                    }
                }else{
                    var stopCamera = function(){
                        var stopURL = e.base+monitorConfig.details['control_url_'+e.direction+'_stop']
                        var options = s.camera('buildOptionsFromUrl',stopURL,monitorConfig)
                        var requestOptions = {
                            url : stopURL,
                            method : options.method,
                            auth : {
                                user : options.username,
                                pass : options.password
                            }
                        }
                        if(monitorConfig.details.control_digest_auth === '1'){
                            requestOptions.sendImmediately = true
                        }
                        request(requestOptions,function(err,data){
                            if(err){
                                msg = {ok:false,type:'Control Error',msg:err}
                            }else{
                                msg = {ok:true,type:'Control Trigger Ended'}
                            }
                            cn(msg)
                            s.log(e,msg);
                        })
                    }
                    if(e.direction === 'stopMove'){
                        stopCamera()
                    }else{
                        var requestOptions = {
                            url : controlURL,
                            method : controlURLOptions.method,
                            auth : {
                                user : controlURLOptions.username,
                                pass : controlURLOptions.password
                            }
                        }
                        if(monitorConfig.details.control_digest_auth === '1'){
                            requestOptions.sendImmediately = true
                        }
                        request(requestOptions,function(err,data){
                            if(err){
                                msg = {ok:false,type:'Control Error',msg:err};
                                cn(msg)
                                s.log(e,msg);
                                return
                            }
                            if(monitorConfig.details.control_stop=='1'&&e.direction!=='center'){
                                s.log(e,{type:'Control Triggered Started'});
                                if(monitorConfig.details.control_url_stop_timeout > 0){
                                    setTimeout(function(){
                                        stopCamera()
                                    },monitorConfig.details.control_url_stop_timeout)
                                }
                            }else{
                                msg = {ok:true,type:'Control Triggered'};
                                cn(msg)
                                s.log(e,msg);
                            }
                        })
                    }
                }
            break;
            case'snapshot'://get snapshot from monitor URL
                if(config.doSnapshot===true){
                    if(e.mon.mode!=='stop'){
                        var pathDir = s.dir.streams+e.ke+'/'+e.mid+'/'
                        if(e.mon.details.snap==='1'){
                            fs.readFile(pathDir+'s.jpg',function(err,data){
                                if(err){s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke);return};
                                s.tx({f:'monitor_snapshot',snapshot:data,snapshot_format:'ab',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                            })
                        }else{
                            e.url=s.buildMonitorUrl(e.mon);
                            switch(e.mon.type){
                                case'mjpeg':case'h264':case'local':
                                    if(e.mon.type==='local'){e.url=e.mon.path;}
                                     s.getRawSnapshotFromMonitor(e.mon,'-s 400x400',function(data){
                                         if((data[data.length-2] === 0xFF && data[data.length-1] === 0xD9)){
                                             s.tx({
                                                 f:'monitor_snapshot',
                                                 snapshot:data.toString('base64'),
                                                 snapshot_format:'b64',
                                                 mid:e.mid,
                                                 ke:e.ke
                                             },'GRP_'+e.ke)
                                         }else{
                                             s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                                        }
                                     })
                                break;
                                case'jpeg':
                                    request({url:e.url,method:'GET',encoding:null},function(err,data){
                                        if(err){s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke);return};
                                        s.tx({f:'monitor_snapshot',snapshot:data.body,snapshot_format:'ab',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                                    })
                                break;
                                default:
                                    s.tx({f:'monitor_snapshot',snapshot:'...',snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                                break;
                            }
                        }
                    }else{
                        s.tx({f:'monitor_snapshot',snapshot:'Disabled',snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                    }
                }else{
                    s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                }
            break;
            case'record_off'://stop recording and start
                if(!s.group[e.ke].mon[e.id].record){s.group[e.ke].mon[e.id].record={}}
                s.group[e.ke].mon[e.id].record.yes=0;
                s.camera('start',e);
            break;
            case'watch_on'://live streamers - join
    //            if(s.group[e.ke].mon[e.id].watch[cn.id]){s.camera('watch_off',e,cn,tx);return}
               if(!cn.monitor_watching){cn.monitor_watching={}}
               if(!cn.monitor_watching[e.id]){cn.monitor_watching[e.id]={ke:e.ke}}
               s.group[e.ke].mon[e.id].watch[cn.id]={};
    //            if(Object.keys(s.group[e.ke].mon[e.id].watch).length>0){
    //                s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND mid=?',[e.ke,e.id],function(err,r) {
    //                    if(r&&r[0]){
    //                        r=r[0];
    //                        r.url=s.buildMonitorUrl(r);
    //                        s.group[e.ke].mon.type=r.type;
    //                    }
    //                })
    //            }
            break;
            case'watch_off'://live streamers - leave
               if(cn.monitor_watching){delete(cn.monitor_watching[e.id])}
                if(s.group[e.ke].mon[e.id]&&s.group[e.ke].mon[e.id].watch){
                    delete(s.group[e.ke].mon[e.id].watch[cn.id]),e.ob=Object.keys(s.group[e.ke].mon[e.id].watch).length
                    if(e.ob===0){
                       delete(s.group[e.ke].mon[e.id].watch)
                    }
                }else{
                    e.ob=0;
                }
                if(tx){tx({f:'monitor_watch_off',ke:e.ke,id:e.id,cnid:cn.id})};
                s.tx({viewers:e.ob,ke:e.ke,id:e.id},'MON_'+e.id);
            break;
            case'restart'://restart monitor
                s.sendMonitorStatus({id:e.id,ke:e.ke,status:'Restarting'});
                s.camera('stop',e)
                setTimeout(function(){
                    s.camera(e.mode,e)
                },1300)
            break;
            case'idle':case'stop'://stop monitor
                if(!s.group[e.ke]||!s.group[e.ke].mon[e.id]){return}
                if(config.childNodes.enabled === true && config.childNodes.mode === 'master' && s.group[e.ke].mon[e.id].childNode && s.childNodes[s.group[e.ke].mon[e.id].childNode].activeCameras[e.ke+e.id]){
                    s.group[e.ke].mon[e.id].started = 0
                    s.cx({
                        //function
                        f : 'cameraStop',
                        //data, options
                        d : s.group[e.ke].mon_conf[e.id]
                    },s.group[e.ke].mon[e.id].childNodeId)
                    s.cx({f:'sync',sync:s.group[e.ke].mon_conf[e.id],ke:e.ke,mid:e.id},s.group[e.ke].mon[e.id].childNodeId);
                }else{
                    if(s.group[e.ke].mon[e.id].eventBasedRecording.process){
                        clearTimeout(s.group[e.ke].mon[e.id].eventBasedRecording.timeout)
                        s.group[e.ke].mon[e.id].eventBasedRecording.allowEnd=true;
                        s.group[e.ke].mon[e.id].eventBasedRecording.process.kill('SIGTERM');
                    }
                    if(s.group[e.ke].mon[e.id].fswatch){s.group[e.ke].mon[e.id].fswatch.close();delete(s.group[e.ke].mon[e.id].fswatch)}
                    if(s.group[e.ke].mon[e.id].fswatchStream){s.group[e.ke].mon[e.id].fswatchStream.close();delete(s.group[e.ke].mon[e.id].fswatchStream)}
                    if(s.group[e.ke].mon[e.id].last_frame){delete(s.group[e.ke].mon[e.id].last_frame)}
                    if(s.group[e.ke].mon[e.id].started!==1){return}
                    s.kill(s.group[e.ke].mon[e.id].spawn,e);
                    if(e.neglectTriggerTimer===1){
                        delete(e.neglectTriggerTimer);
                    }else{
                        clearTimeout(s.group[e.ke].mon[e.id].trigger_timer)
                        delete(s.group[e.ke].mon[e.id].trigger_timer)
                    }
                    clearInterval(s.group[e.ke].mon[e.id].running);
                    clearInterval(s.group[e.ke].mon[e.id].detector_notrigger_timeout)
                    clearTimeout(s.group[e.ke].mon[e.id].err_fatal_timeout);
                    s.group[e.ke].mon[e.id].started=0;
                    if(s.group[e.ke].mon[e.id].record){s.group[e.ke].mon[e.id].record.yes=0}
                    s.tx({f:'monitor_stopping',mid:e.id,ke:e.ke,time:s.formattedTime()},'GRP_'+e.ke);
                    s.camera('snapshot',{mid:e.id,ke:e.ke,mon:e})
                    if(x==='stop'){
                        s.log(e,{type:lang['Monitor Stopped'],msg:lang.MonitorStoppedText});
                        clearTimeout(s.group[e.ke].mon[e.id].delete)
                        if(e.delete===1){
                            s.group[e.ke].mon[e.id].delete=setTimeout(function(){
                                delete(s.group[e.ke].mon[e.id]);
                                delete(s.group[e.ke].mon_conf[e.id]);
                            },1000*60);
                        }
                    }else{
                        s.tx({f:'monitor_idle',mid:e.id,ke:e.ke,time:s.formattedTime()},'GRP_'+e.ke);
                        s.log(e,{type:lang['Monitor Idling'],msg:lang.MonitorIdlingText});
                    }
                }
                var wantedStatus = lang.Stopped
                if(x==='idle'){
                    var wantedStatus = lang.Idle
                }
                s.sendMonitorStatus({id:e.id,ke:e.ke,status:wantedStatus});
            break;
            case'start':case'record'://watch or record monitor url
                s.initiateMonitorObject({ke:e.ke,mid:e.id})
                if(!s.group[e.ke].mon_conf[e.id]){s.group[e.ke].mon_conf[e.id]=s.cleanMonitorObject(e);}
                e.url = s.buildMonitorUrl(e);
                if(s.group[e.ke].mon[e.id].started===1){
                    //stop action, monitor already started or recording
                    return
                }
                //lock this function
                s.sendMonitorStatus({id:e.id,ke:e.ke,status:lang.Starting});
                s.group[e.ke].mon[e.id].started = 1;
                //create host string without username and password
                e.hosty = e.host.split('@');
                if(e.hosty[1]){
                    //username and password found
                    e.hosty = e.hosty[1]
                }else{
                    //no username or password in `host` string
                    e.hosty = e.hosty[0]
                }
                //set recording status
                var wantedStatus = lang.Watching
                if(x==='record'){
                    var wantedStatus = lang.Recording
                    s.group[e.ke].mon[e.id].record.yes=1;
                }else{
                    s.group[e.ke].mon[e.mid].record.yes=0;
                }
                //set the recording directory
                if(e.details && e.details.dir && e.details.dir !== '' && config.childNodes.mode !== 'child'){
                    //addStorage choice
                    e.dir=s.checkCorrectPathEnding(e.details.dir)+e.ke+'/';
                    if (!fs.existsSync(e.dir)){
                        fs.mkdirSync(e.dir);
                    }
                    e.dir=e.dir+e.id+'/';
                    if (!fs.existsSync(e.dir)){
                        fs.mkdirSync(e.dir);
                    }
                }else{
                    //MAIN videos dir
                    e.dir=s.dir.videos+e.ke+'/';
                    if (!fs.existsSync(e.dir)){
                        fs.mkdirSync(e.dir);
                    }
                    e.dir=s.dir.videos+e.ke+'/'+e.id+'/';
                    if (!fs.existsSync(e.dir)){
                        fs.mkdirSync(e.dir);
                    }
                }
                //set the temporary files directory
                var setStreamDir = function(){
                    //stream dir
                    e.sdir=s.dir.streams+e.ke+'/';
                    if (!fs.existsSync(e.sdir)){
                        fs.mkdirSync(e.sdir);
                    }
                    e.sdir=s.dir.streams+e.ke+'/'+e.id+'/';
                    if (!fs.existsSync(e.sdir)){
                        fs.mkdirSync(e.sdir);
                    }else{
                        s.file('deleteFolder',e.sdir+'*')
                    }
                }
                setStreamDir()
                //try to create HawkEye Onvif Object
                // if(e.details.is_onvif === '1'){
                //     console.log('onvifHawk',e.hosty, e.porty.replace(':',''), e.username, e.password)
                //     var doOnvifHawk = true
                //     var errorCount = 0
                //     var hawkFail = function(msg,callback){
                //         ++errorCount
                //         if(errorCount > 2){
                //             callback()
                //             s.log(e,msg);
                //         }
                //     }
                //     var createHawkOnvif = function(){
                //         if(doOnvifHawk === false){
                //             return false
                //         }
                //         if(!e.details.onvif_port || e.details.onvif_port === ''){
                //             e.details.onvif_port = 8000
                //         }
                //         onvifHawk.connect(e.hosty, e.details.onvif_port, e.username, e.password).then(function(results){
                //             var camera = results
                //             // if the camera supports events, the module will already be loaded.
                //             if (camera.events) {
                //                 camera.events.soap.username = e.username
                //                 camera.events.soap.password = e.password
                //                 camera.events.on('messages', messages => {
                //                     console.log(messages.data.PullMessagesResponse.NotificationMessage.Message.Message.Data)
                //                 })
                //                 camera.events.on('messages:error', error => {
                //                     if(error.body.indexOf('anonymous') > -1){
                //                         hawkFail({type:lang.ONVIFEventsNotAvailable,msg:{msg:lang.ONVIFnotCompliantProfileT}},function(){
                //                             camera.events.stopPull()
                //                         })
                //                     }
                //                 })
                //                 // start a pull event loop
                //                 setTimeout(function(){
                //                     camera.events.startPull()
                //                 },3000)
                //                 // call stopPull() to end the event loop
                //                 // camera.events.stopPull()
                //                 s.group[e.ke].mon[e.id].HawkEyeOnvifConnection = camera
                //             }
                //             if(s.group[e.ke].mon[e.id].HawkEyeOnvifConnection){
                //                 console.log('Found')
                //             }else{
                //                 console.log('Not Found')
                //             }
                //         }).catch(function(err){
                //             console.log('Error Connecting')
                //             console.log(err.code)
                //             hawkFail({type:lang.ONVIFEventsNotAvailable,msg:{msg:lang.ONVIFnotCompliantProfileT}},function(){
                //                 doOnvifHawk = false
                //             })
                //             // setTimeout(function(){
                //             //     createHawkOnvif()
                //             // },3000)
                //         })
                //     }
                //     createHawkOnvif()
                // }
                //set up fatal error handler
                if(e.details.fatal_max===''){
                    e.details.fatal_max = 10
                }else{
                    e.details.fatal_max = parseFloat(e.details.fatal_max)
                }
                var errorFatal = function(errorMessage){
                    s.debugLog(errorMessage)
                    clearTimeout(s.group[e.ke].mon[e.id].err_fatal_timeout);
                    ++errorFatalCount;
                    if(s.group[e.ke].mon[e.id].started===1){
                        s.group[e.ke].mon[e.id].err_fatal_timeout=setTimeout(function(){
                            if(e.details.fatal_max!==0&&errorFatalCount>e.details.fatal_max){
                                s.camera('stop',{id:e.id,ke:e.ke})
                            }else{
                                launchMonitorProcesses()
                            };
                        },5000);
                    }else{
                        s.kill(s.group[e.ke].mon[e.id].spawn,e);
                    }
                    s.sendMonitorStatus({id:e.id,ke:e.ke,status:lang.Died});
                }
                var errorFatalCount = 0;
                //cutoff time and recording check interval
                if(!e.details.cutoff||e.details.cutoff===''){e.cutoff=15}else{e.cutoff=parseFloat(e.details.cutoff)};
                if(isNaN(e.cutoff)===true){e.cutoff=15}
                //set master based process launcher
                var launchMonitorProcesses = function(){
                    s.group[e.ke].mon[e.id].allowStdinWrite = false
                    s.txToDashcamUsers({
                        f : 'disable_stream',
                        ke : e.ke,
                        mid : e.id
                    },e.ke)
                    if(e.details.detector_trigger=='1'){
                        s.group[e.ke].mon[e.id].motion_lock=setTimeout(function(){
                            clearTimeout(s.group[e.ke].mon[e.id].motion_lock);
                            delete(s.group[e.ke].mon[e.id].motion_lock);
                        },15000)
                    }
                    //start "no motion" checker
                    if(e.details.detector=='1'&&e.details.detector_notrigger=='1'){
                        if(!e.details.detector_notrigger_timeout||e.details.detector_notrigger_timeout===''){
                            e.details.detector_notrigger_timeout=10
                        }
                        e.detector_notrigger_timeout=parseFloat(e.details.detector_notrigger_timeout)*1000*60;
                        s.sqlQuery('SELECT mail FROM Users WHERE ke=? AND details NOT LIKE ?',[e.ke,'%"sub"%'],function(err,r){
                            r=r[0];
                            s.group[e.ke].mon[e.id].detector_notrigger_timeout_function=function(){
                                if(config.mail&&e.details.detector_notrigger_mail=='1'){
                                    e.mailOptions = {
                                        from: config.mail.from, // sender address
                                        to: r.mail, // list of receivers
                                        subject: lang.NoMotionEmailText1+' '+e.name+' ('+e.id+')', // Subject line
                                        html: '<i>'+lang.NoMotionEmailText2+' '+e.details.detector_notrigger_timeout+' '+lang.minutes+'.</i>',
                                    };
                                    e.mailOptions.html+='<div><b>'+lang['Monitor Name']+' </b> : '+e.name+'</div>'
                                    e.mailOptions.html+='<div><b>'+lang['Monitor ID']+' </b> : '+e.id+'</div>'
                                    s.nodemailer.sendMail(e.mailOptions, (error, info) => {
                                        if (error) {
                                           s.systemLog('detector:notrigger:sendMail',error)
                                            s.tx({f:'error',ff:'detector_notrigger_mail',id:e.id,ke:e.ke,error:error},'GRP_'+e.ke);
                                            return ;
                                        }
                                        s.tx({f:'detector_notrigger_mail',id:e.id,ke:e.ke,info:info},'GRP_'+e.ke);
                                    });
                                }
                            }
                            clearInterval(s.group[e.ke].mon[e.id].detector_notrigger_timeout)
                            s.group[e.ke].mon[e.id].detector_notrigger_timeout=setInterval(s.group[e.ke].mon[e.id].detector_notrigger_timeout_function,s.group[e.ke].mon[e.id].detector_notrigger_timeout)
                        })
                    }
                    var resetRecordingCheck = function(){
                        clearTimeout(s.group[e.ke].mon[e.id].checker)
                        var cutoff = e.cutoff + 0
                        if(e.type === 'dashcam'){
                            cutoff *= 100
                        }
                        s.group[e.ke].mon[e.id].checker=setTimeout(function(){
                            if(s.group[e.ke].mon[e.id].started === 1 && s.group[e.ke].mon_conf[e.id].mode === 'record'){
                                launchMonitorProcesses();
                                s.sendMonitorStatus({id:e.id,ke:e.ke,status:lang.Restarting});
                                s.log(e,{type:lang['Camera is not recording'],msg:{msg:lang['Restarting Process']}});
                            }
                        },60000 * cutoff * 1.1);
                    }
                    var resetStreamCheck=function(){
                        clearTimeout(s.group[e.ke].mon[e.id].checkStream)
                        s.group[e.ke].mon[e.id].checkStream = setTimeout(function(){
                            if(s.group[e.ke].mon[e.id].started===1){
                                launchMonitorProcesses();
                                s.log(e,{type:lang['Camera is not streaming'],msg:{msg:lang['Restarting Process']}});
                            }
                        },60000*1);
                    }
                    if(e.details.snap === '1'){
                        var resetSnapCheck = function(){
                            clearTimeout(s.group[e.ke].mon[e.id].checkSnap)
                            s.group[e.ke].mon[e.id].checkSnap = setTimeout(function(){
                                if(s.group[e.ke].mon[e.id].started === 1){
                                    fs.stat(e.sdir+'s.jpg',function(err,snap){
                                        var notStreaming = function(){
                                            launchMonitorProcesses()
                                            s.log(e,{type:lang['Camera is not streaming'],msg:{msg:lang['Restarting Process']}});
                                        }
                                        if(err){
                                            notStreaming()
                                        }else{
                                            if(!e.checkSnapTime)e.checkSnapTime = snap.mtime
                                            if(err || e.checkSnapTime === snap.mtime){
                                                e.checkSnapTime = snap.mtime
                                                notStreaming()
                                            }else{
                                                resetSnapCheck()
                                            }
                                        }
                                    })
                                }
                            },60000*1);
                        }
                        resetSnapCheck()
                    }
                    if(config.childNodes.mode !== 'child' && s.platform!=='darwin' && (x==='record' || (x==='start'&&e.details.detector_record_method==='sip'))){
                        //check if ffmpeg is recording
                        s.group[e.ke].mon[e.id].fswatch = fs.watch(e.dir, {encoding : 'utf8'}, (event, filename) => {
                            switch(event){
                                case'rename':
                                    s.group[e.ke].mon[e.id].open = filename.split('.')[0]
                                break;
                                case'change':
                                    resetRecordingCheck()
                                break;
                            }
                        });
                    }
                    if(
                        //is MacOS
                        s.platform !== 'darwin' &&
                        //is Watch-Only or Record
                        (x === 'start' || x === 'record') &&
                        //if JPEG API enabled or Stream Type is HLS
                        (e.details.stream_type === 'jpeg' || e.details.stream_type === 'hls' || e.details.snap === '1')
                    ){
                        s.group[e.ke].mon[e.id].fswatchStream = fs.watch(e.sdir, {encoding : 'utf8'}, () => {
                            resetStreamCheck()
                        })
                    }
                    s.camera('snapshot',{mid:e.id,ke:e.ke,mon:e})
                    //check host to see if has password and user in it
                    setStreamDir()
                    clearTimeout(s.group[e.ke].mon[e.id].checker)
                    if(s.group[e.ke].mon[e.id].started===1){
                    e.error_count=0;
                    s.group[e.ke].mon[e.id].error_socket_timeout_count=0;
                    s.kill(s.group[e.ke].mon[e.id].spawn,e);
                    startVideoProcessor=function(err,o){
                        if(o.success===true){
                            e.frames=0;
                            if(!s.group[e.ke].mon[e.id].record){s.group[e.ke].mon[e.id].record={yes:1}};
                            //launch ffmpeg (main)
                            s.group[e.ke].mon[e.id].spawn = s.ffmpeg(e)
                            s.group[e.ke].mon[e.id].spawn.stdio[5].on('data',function(data){
                                resetStreamCheck()
                                // var progress = {}
                                // data.toString().split('\n').forEach(function(v){
                                //     var split = v.split('=')
                                //     var val = split[1]
                                //     if(val)progress[split[0]] = val
                                // })
                            })
                            if(e.type === 'dashcam'){
                                setTimeout(function(){
                                    s.group[e.ke].mon[e.id].allowStdinWrite = true
                                    s.txToDashcamUsers({
                                        f : 'enable_stream',
                                        ke : e.ke,
                                        mid : e.id
                                    },e.ke)
                                },30000)
                            }
                            s.sendMonitorStatus({id:e.id,ke:e.ke,status:wantedStatus});
                            //on unexpected exit restart
                            s.group[e.ke].mon[e.id].spawn_exit=function(){
                                if(s.group[e.ke].mon[e.id].started===1){
                                    if(e.details.loglevel!=='quiet'){
                                        s.log(e,{type:lang['Process Unexpected Exit'],msg:{msg:lang['Process Crashed for Monitor'],cmd:s.group[e.ke].mon[e.id].ffmpeg}});
                                    }
                                    errorFatal('Process Unexpected Exit');
                                }
                            }
                            s.group[e.ke].mon[e.id].spawn.on('end',s.group[e.ke].mon[e.id].spawn_exit)
                            s.group[e.ke].mon[e.id].spawn.on('exit',s.group[e.ke].mon[e.id].spawn_exit)

                            //emitter for mjpeg
                            if(!e.details.stream_mjpeg_clients||e.details.stream_mjpeg_clients===''||isNaN(e.details.stream_mjpeg_clients)===false){e.details.stream_mjpeg_clients=20;}else{e.details.stream_mjpeg_clients=parseInt(e.details.stream_mjpeg_clients)}
                            s.group[e.ke].mon[e.id].emitter = new events.EventEmitter().setMaxListeners(e.details.stream_mjpeg_clients);
                            s.log(e,{type:lang['Process Started'],msg:{cmd:s.group[e.ke].mon[e.id].ffmpeg}});
                            s.tx({f:'monitor_starting',mode:x,mid:e.id,time:s.formattedTime()},'GRP_'+e.ke);
                            //start workers
                            if(e.type==='jpeg'){
                                if(!e.details.sfps||e.details.sfps===''){
                                    e.details.sfps = 1
                                }
                                var capture_fps = parseFloat(e.details.sfps);
                                if(isNaN(capture_fps)){capture_fps = 1}
                                if(s.group[e.ke].mon[e.id].spawn){
                                    s.group[e.ke].mon[e.id].spawn.stdin.on('error',function(err){
                                        if(err&&e.details.loglevel!=='quiet'){
                                            s.log(e,{type:'STDIN ERROR',msg:err});
                                        }
                                    })
                                }else{
                                    if(x==='record'){
                                        s.log(e,{type:lang.FFmpegCantStart,msg:lang.FFmpegCantStartText});
                                        return
                                    }
                                }
                                e.captureOne=function(f){
                                    s.group[e.ke].mon[e.id].record.request=request({url:e.url,method:'GET',encoding: null,timeout:15000},function(err,data){
                                        if(err){
                                            return;
                                        }
                                    }).on('data',function(d){
                                          if(!e.buffer0){
                                              e.buffer0=[d]
                                          }else{
                                              e.buffer0.push(d);
                                          }
                                          if((d[d.length-2] === 0xFF && d[d.length-1] === 0xD9)){
                                              e.buffer0=Buffer.concat(e.buffer0);
                                              ++e.frames;
                                              if(s.group[e.ke].mon[e.id].spawn&&s.group[e.ke].mon[e.id].spawn.stdin){
                                                s.group[e.ke].mon[e.id].spawn.stdin.write(e.buffer0);
                                            }
                                            if(s.group[e.ke].mon[e.id].started===1){
                                                s.group[e.ke].mon[e.id].record.capturing=setTimeout(function(){
                                                   e.captureOne()
                                                },1000/capture_fps);
                                            }
                                              e.buffer0=null;
                                        }
                                        if(!e.timeOut){
                                            e.timeOut=setTimeout(function(){e.error_count=0;delete(e.timeOut);},3000);
                                        }

                                    }).on('error', function(err){
                                        ++e.error_count;
                                        clearTimeout(e.timeOut);delete(e.timeOut);
                                        if(e.details.loglevel!=='quiet'){
                                            s.log(e,{type:lang['JPEG Error'],msg:{msg:lang.JPEGErrorText,info:err}});
                                            switch(err.code){
                                                case'ESOCKETTIMEDOUT':
                                                case'ETIMEDOUT':
                                                    ++s.group[e.ke].mon[e.id].error_socket_timeout_count
                                                    if(e.details.fatal_max!==0&&s.group[e.ke].mon[e.id].error_socket_timeout_count>e.details.fatal_max){
                                                        s.log(e,{type:lang['Fatal Maximum Reached'],msg:{code:'ESOCKETTIMEDOUT',msg:lang.FatalMaximumReachedText}});
                                                        s.camera('stop',e)
                                                    }else{
                                                        s.log(e,{type:lang['Restarting Process'],msg:{code:'ESOCKETTIMEDOUT',msg:lang.FatalMaximumReachedText}});
                                                        s.camera('restart',e)
                                                    }
                                                    return;
                                                break;
                                            }
                                        }
                                        if(e.details.fatal_max!==0&&e.error_count>e.details.fatal_max){
                                            clearTimeout(s.group[e.ke].mon[e.id].record.capturing);
                                            launchMonitorProcesses();
                                        }
                                    });
                              }
                              e.captureOne()
                          }
                          // else if(e.type === 'webpage'){
                          //     var capture_fps = parseFloat(e.details.sfps);
                          //     if(isNaN(capture_fps)){capture_fps = 1}
                          //   var browser = casper.create()
                          //   page.goto(e.url)
                          //     s.group[e.ke].mon[e.id].casper = browser
                          //     s.group[e.ke].mon[e.id].casperCapture = setInterval(function(){
                          //         var buffer = page.screenshot()
                          //         console.log(buffer)
                          //         // s.group[e.ke].mon[e.id].spawn.stdin.write(buffer);
                          //     },1000/capture_fps)
                          // }
                            if(!s.group[e.ke]||!s.group[e.ke].mon[e.id]){s.initiateMonitorObject(e)}
                            s.group[e.ke].mon[e.id].spawn.on('error',function(er){
                                s.log(e,{type:'Spawn Error',msg:er});errorFatal('Spawn Error')
                            });
                            if(e.details.detector==='1'){
                                s.ocvTx({f:'init_monitor',id:e.id,ke:e.ke})
                                //frames from motion detect
                                if(e.details.detector_pam==='1'){
                                   s.createPamDiffEngine(e)
                                   s.group[e.ke].mon[e.id].spawn.stdio[3].pipe(s.group[e.ke].mon[e.id].p2p).pipe(s.group[e.ke].mon[e.id].pamDiff)
                                    if(e.details.detector_use_detect_object === '1'){
                                        s.group[e.ke].mon[e.id].spawn.stdio[4].on('data',function(d){
                                            s.group[e.ke].mon[e.id].lastJpegDetectorFrame = d
                                        })
                                    }
                                }else{
                                    s.group[e.ke].mon[e.id].spawn.stdio[3].on('data',function(d){
                                        s.ocvTx({f:'frame',mon:s.group[e.ke].mon_conf[e.id].details,ke:e.ke,id:e.id,time:s.formattedTime(),frame:d});
                                    })
                                }
                            }
                            //frames to stream
                           switch(e.details.stream_type){
                               case'mp4':
                                   s.group[e.ke].mon[e.id].mp4frag['MAIN'] = new Mp4Frag();
                                   s.group[e.ke].mon[e.id].mp4frag['MAIN'].on('error',function(error){
                                       s.log(e,{type:lang['Mp4Frag'],msg:{error:error}})
                                   })
                                   s.group[e.ke].mon[e.id].spawn.stdio[1].pipe(s.group[e.ke].mon[e.id].mp4frag['MAIN'])
                               break;
                               case'flv':
                                   e.frame_to_stream=function(d){
                                       if(!s.group[e.ke].mon[e.id].firstStreamChunk['MAIN'])s.group[e.ke].mon[e.id].firstStreamChunk['MAIN'] = d;
                                       e.frame_to_stream=function(d){
                                           resetStreamCheck()
                                           s.group[e.ke].mon[e.id].emitter.emit('data',d);
                                       }
                                       e.frame_to_stream(d)
                                   }
                               break;
                               case'mjpeg':
                                   e.frame_to_stream=function(d){
                                       resetStreamCheck()
                                       s.group[e.ke].mon[e.id].emitter.emit('data',d);
                                   }
                               break;
                               case'h265':
                                   e.frame_to_stream=function(d){
                                       resetStreamCheck()
                                       s.group[e.ke].mon[e.id].emitter.emit('data',d);
                                   }
                               break;
                               case'b64':case undefined:case null:case'':
                                   var buffer
                                   e.frame_to_stream=function(d){
                                      resetStreamCheck()
                                      if(!buffer){
                                          buffer=[d]
                                      }else{
                                          buffer.push(d);
                                      }
                                      if((d[d.length-2] === 0xFF && d[d.length-1] === 0xD9)){
                                          s.group[e.ke].mon[e.id].emitter.emit('data',Buffer.concat(buffer));
                                          buffer=null;
                                      }
                                   }
                               break;
                           }
                            if(e.frame_to_stream){
                                s.group[e.ke].mon[e.id].spawn.stdout.on('data',e.frame_to_stream)
                            }
                            if(e.details.stream_channels&&e.details.stream_channels!==''){
                                var createStreamEmitter = function(channel,number){
                                    var pipeNumber = number+config.pipeAddition;
                                    if(!s.group[e.ke].mon[e.id].emitterChannel[pipeNumber]){
                                        s.group[e.ke].mon[e.id].emitterChannel[pipeNumber] = new events.EventEmitter().setMaxListeners(0);
                                    }
                                   var frame_to_stream
                                   switch(channel.stream_type){
                                       case'mp4':
                                           s.group[e.ke].mon[e.id].mp4frag[pipeNumber] = new Mp4Frag();
                                           s.group[e.ke].mon[e.id].spawn.stdio[pipeNumber].pipe(s.group[e.ke].mon[e.id].mp4frag[pipeNumber])
                                       break;
                                       case'mjpeg':
                                           frame_to_stream=function(d){
                                               s.group[e.ke].mon[e.id].emitterChannel[pipeNumber].emit('data',d);
                                           }
                                       break;
                                       case'flv':
                                           frame_to_stream=function(d){
                                               if(!s.group[e.ke].mon[e.id].firstStreamChunk[pipeNumber])s.group[e.ke].mon[e.id].firstStreamChunk[pipeNumber] = d;
                                               frame_to_stream=function(d){
                                                   s.group[e.ke].mon[e.id].emitterChannel[pipeNumber].emit('data',d);
                                               }
                                               frame_to_stream(d)
                                           }
                                       break;
                                       case'h264':
                                           frame_to_stream=function(d){
                                               s.group[e.ke].mon[e.id].emitterChannel[pipeNumber].emit('data',d);
                                           }
                                       break;
                                   }
                                    if(frame_to_stream){
                                        s.group[e.ke].mon[e.id].spawn.stdio[pipeNumber].on('data',frame_to_stream);
                                    }
                                }
                                e.details.stream_channels.forEach(createStreamEmitter)
                            }
                            if(x==='record'||e.type==='mjpeg'||e.type==='h264'||e.type==='local'){
                                var checkLog = function(d,x){return d.indexOf(x)>-1;}
                                s.group[e.ke].mon[e.id].spawn.stderr.on('data',function(d){
                                    d=d.toString();
                                    switch(true){
                                        case checkLog(d,'[hls @'):
                                        case checkLog(d,'Past duration'):
                                        case checkLog(d,'Last message repeated'):
                                        case checkLog(d,'pkt->duration = 0'):
                                        case checkLog(d,'Non-monotonous DTS'):
                                        case checkLog(d,'NULL @'):
                                        case checkLog(d,'RTP: missed'):
                                        case checkLog(d,'deprecated pixel format used'):
                                            return
                                        break;
                                            //mp4 output with webm encoder chosen
                                        case checkLog(d,'Could not find tag for vp8'):
                                        case checkLog(d,'Only VP8 or VP9 Video'):
                                        case checkLog(d,'Could not write header'):
    //                                            switch(e.ext){
    //                                                case'mp4':
    //                                                    e.details.vcodec='libx264'
    //                                                    e.details.acodec='none'
    //                                                break;
    //                                                case'webm':
    //                                                    e.details.vcodec='libvpx'
    //                                                    e.details.acodec='none'
    //                                                break;
    //                                            }
    //                                            if(e.details.stream_type==='hls'){
    //                                                e.details.stream_vcodec='libx264'
    //                                                e.details.stream_acodec='no'
    //                                            }
    //                                            s.camera('restart',e)
                                            return s.log(e,{type:lang['Incorrect Settings Chosen'],msg:{msg:d}})
                                        break;
    //                                                case checkLog(d,'av_interleaved_write_frame'):
                                        case checkLog(d,'Connection refused'):
                                        case checkLog(d,'Connection timed out'):
                                            //restart
                                            setTimeout(function(){
                                                s.log(e,{type:lang['Connection timed out'],msg:lang['Retrying...']});
                                                errorFatal('Connection timed out');
                                            },1000)
                                        break;
    //                                        case checkLog(d,'No such file or directory'):
    //                                        case checkLog(d,'Unable to open RTSP for listening'):
    //                                        case checkLog(d,'timed out'):
    //                                        case checkLog(d,'Invalid data found when processing input'):
    //                                        case checkLog(d,'reset by peer'):
    //                                           if(e.frames===0&&x==='record'){s.video('delete',e)};
    //                                            setTimeout(function(){
    //                                                if(!s.group[e.ke].mon[e.id].spawn){launchMonitorProcesses()}
    //                                            },2000)
    //                                        break;
                                        case checkLog(d,'Immediate exit requested'):
                                         case checkLog(d,'mjpeg_decode_dc'):
                                        case checkLog(d,'bad vlc'):
                                        case checkLog(d,'error dc'):
                                            launchMonitorProcesses()
                                        break;
                                        case /T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]./.test(d):
                                            var filename = d.split('.')[0]+'.'+e.ext
                                            s.video('insertCompleted',e,{
                                                file : filename
                                            })
                                            s.log(e,{type:lang['Video Finished'],msg:{filename:d}})
                                            if(
                                                e.details.detector==='1'&&
                                                s.group[e.ke].mon[e.id].started===1&&
                                                e.details&&
                                                e.details.detector_record_method==='del'&&
                                                e.details.detector_delete_motionless_videos==='1'&&
                                                s.group[e.ke].mon[e.id].detector_motion_count===0
                                            ){
                                                if(e.details.loglevel!=='quiet'){
                                                    s.log(e,{type:lang['Delete Motionless Video'],msg:filename});
                                                }
                                                s.video('delete',{
                                                    filename : filename,
                                                    ke : e.ke,
                                                    id : e.id
                                                })
                                            }
                                            s.group[e.ke].mon[e.id].detector_motion_count = 0
                                            resetRecordingCheck()
                                            return;
                                        break;
                                    }
                                    s.log(e,{type:"FFMPEG STDERR",msg:d})
                                });
                            }
                          }else{
                              s.log(e,{type:lang["Ping Failed"],msg:lang.skipPingText1});
                              errorFatal("Ping Failed");return;
                        }
                    }
                    if(e.type!=='socket'&&e.type!=='dashcam'&&e.protocol!=='udp'&&e.type!=='local' && e.details.skip_ping !== '1'){
                        connectionTester.test(e.hosty,e.port,2000,startVideoProcessor);
                    }else{
                        startVideoProcessor(null,{success:true})
                    }
                }else{
                    s.kill(s.group[e.ke].mon[e.id].spawn,e);
                }
                }
                //start drawing files
                delete(s.group[e.ke].mon[e.id].childNode)
                if(config.childNodes.enabled === true && config.childNodes.mode === 'master'){
                    var childNodeList = Object.keys(s.childNodes)
                    if(childNodeList.length>0){
                        e.ch_stop = 0;
                        launchMonitorProcesses = function(){
                            startVideoProcessor = function(){
                                s.cx({
                                    //function
                                    f : 'cameraStart',
                                    //mode
                                    mode : x,
                                    //data, options
                                    d : s.group[e.ke].mon_conf[e.id]
                                },s.group[e.ke].mon[e.id].childNodeId)
                            }
                            if(e.type!=='socket'&&e.type!=='dashcam'&&e.protocol!=='udp'&&e.type!=='local' && e.details.skip_ping !== '1'){
                                console.log(e.hosty,e.port)
                                connectionTester.test(e.hosty,e.port,2000,function(err,o){
                                    if(o.success===true){
                                        startVideoProcessor()
                                    }else{
                                        s.log(e,{type:lang["Ping Failed"],msg:lang.skipPingText1});
                                        errorFatal("Ping Failed");return;
                                    }
                                })
                            }else{
                                startVideoProcessor()
                            }
                        }
                        childNodeList.forEach(function(ip){
                            if(e.ch_stop===0&&s.childNodes[ip].cpu<80){
                                e.ch_stop=1;
                                s.childNodes[ip].activeCameras[e.ke+e.id] = s.cleanMonitorObject(s.group[e.ke].mon_conf[e.id]);
                                s.group[e.ke].mon[e.id].childNode = ip;
                                s.group[e.ke].mon[e.id].childNodeId = s.childNodes[ip].cnid;
                                s.cx({f:'sync',sync:s.group[e.ke].mon_conf[e.id],ke:e.ke,mid:e.id},s.group[e.ke].mon[e.id].childNodeId);
                                launchMonitorProcesses();
                            }
                        })
                    }else{
                        launchMonitorProcesses();
                    }
                }else{
                    launchMonitorProcesses();
                }
            break;
        }
        if(typeof cn==='function'){setTimeout(function(){cn()},1000);}
    }
}
