$(document).ready(function(e){
//websocket functions
$.users = {}
$.ccio.cx=function(x,user){
    if(!user){user=$user}
    if(!x.ke){x.ke=user.ke;};
    if(!x.uid){x.uid=user.uid;};
    return user.ws.emit('f',x)
}
$.ccio.globalWebsocket=function(d,user){
    if(d.f!=='monitor_frame'&&d.f!=='os'&&d.f!=='video_delete'&&d.f!=='detector_trigger'&&d.f!=='detector_record_timeout_start'&&d.f!=='log'){$.ccio.log(d);}
    if(!user){
        user=$user
    }
    if(d.viewers){
        $('[ke="'+d.ke+'"][mid="'+d.id+'"][auth="'+user.auth_token+'"] .viewers').html(d.viewers);
    }
    switch(d.f){
        case'note':
            $.ccio.init('note',d.note,user);
        break;
        case'monitor_status':
            console.log(d)
            $('[ke="'+d.ke+'"][mid="'+d.id+'"][auth="'+user.auth_token+'"] .monitor_status').html(d.status);
        break;
        case'detector_trigger':
            d.e=$('.monitor_item[ke="'+d.ke+'"][mid="'+d.id+'"][auth="'+user.auth_token+'"]')
            if($.ccio.mon[d.ke+d.id+user.auth_token]&&d.e.length>0){
                if(d.doObjectDetection === true){
                    d.e.addClass('doObjectDetection')
                    clearTimeout($.ccio.mon[d.ke+d.id+user.auth_token].detector_trigger_doObjectDetection_timeout)
                    $.ccio.mon[d.ke+d.id+user.auth_token].detector_trigger_doObjectDetection_timeout = setTimeout(function(){
                        d.e.removeClass('doObjectDetection')
                    },3000)
                }else{
                    d.e.removeClass('doObjectDetection')
                }
                if(d.details.plates&&d.details.plates.length>0){
                    console.log('licensePlateStream',d.id,d)
                }
                if(d.details.matrices&&d.details.matrices.length>0){
                    d.monitorDetails=JSON.parse($.ccio.mon[d.ke+d.id+user.auth_token].details)
                    d.stream=d.e.find('.stream-element')
                    d.streamObjects=d.e.find('.stream-objects')
                    $.ccio.init('drawMatrices',d)
                    d.e.find('.stream-detected-count').text(d.streamObjects.find('.stream-detected-object').length)
                }else{
                    d.e.find('.stream-detected-count').text(1)
                }
                if(d.details.points&&Object.keys(d.details.points).length>0){
                    d.monitorDetails=JSON.parse($.ccio.mon[d.ke+d.id+user.auth_token].details)
                    d.stream=d.e.find('.stream-element')
                    d.streamObjects=d.e.find('.stream-objects')
                    $.ccio.init('drawPoints',d)
                    d.e.find('.stream-detected-count').text(d.streamObjects.find('.stream-detected-point').length)
                }
                if(d.details.confidence){
                    d.tt=d.details.confidence;
                    if (d.tt > 100) { d.tt = 100 }
                    d.e.find('.indifference .progress-bar').css('width',d.tt + '%').find('span').html(d.details.confidence+'% change in <b>'+d.details.name+'</b>')
                }
                d.e.addClass('detector_triggered')
                clearTimeout($.ccio.mon[d.ke+d.id+user.auth_token].detector_trigger_timeout);
                $.ccio.mon[d.ke+d.id+user.auth_token].detector_trigger_timeout=setTimeout(function(){
                    $('.monitor_item[ke="'+d.ke+'"][mid="'+d.id+'"][auth="'+user.auth_token+'"]').removeClass('detector_triggered').find('.stream-detected-object,.stream-detected-point').remove()
                },5000);
                //noise alert
                if(user.details.audio_alert && user.details.audio_alert !== '' && $.ccio.soundAlarmed !== true){
                    $.ccio.soundAlarmed = true
                    var audio = new Audio('libs/audio/'+user.details.audio_alert);
                    audio.onended = function(){
                        setTimeout(function(){
                            $.ccio.soundAlarmed = false
                        },user.details.audio_delay * 1000)
                    }
                    if($.ccio.windowFocus = true){
                        audio.play()
                    }else{
                        clearInterval($.ccio.soundAlarmInterval)
                        if(!user.details.audio_delay || user.details.audio_delay === ''){
                            user.details.audio_delay = 1
                        }else{
                            user.details.audio_delay = parseFloat(user.details.audio_delay)
                        }
                        $.ccio.soundAlarmInterval = setInterval(function(){
                            audio.play()
                        },user.details.audio_delay * 1000)
                    }
                }
                if(user.details.event_mon_pop === '1' && (!$.ccio.mon[d.ke+d.id+user.auth_token].popOut || $.ccio.mon[d.ke+d.id+user.auth_token].popOut.closed === true)){
                    d.e.find('[monitor="pop"]').click()
                }
            }
        break;
        case'init_success':
            $('#monitors_list .link-monitors-list[auth="'+user.auth_token+'"][ke="'+user.ke+'"]').empty();
            if(user===$user){
                d.chosen_set='watch_on'
            }else{
                d.chosen_set='watch_on_links'
            }
            d.o=$.ccio.op()[d.chosen_set];
            if(!d.o){d.o={}};
            $.getJSON($.ccio.init('location',user)+user.auth_token+'/monitor/'+user.ke,function(f,g){
                g=function(n,v){
                    $.ccio.mon[v.ke+v.mid+user.auth_token]=v;
                    v.user=user;
                    $.ccio.tm(1,v,null,user)
                    if(d.o[v.ke]&&d.o[v.ke][v.mid]===1){
                        $.ccio.cx({f:'monitor',ff:'watch_on',id:v.mid},user)
                    }
                }
                if(f.mid){
                    g(null,f)
                }else{
                    $.each(f,g);
                }
                if($.ccio.op().jpeg_on===true){
                    $.ccio.cx({f:'monitor',ff:'jpeg_on'},user)
                }
                $.gR.drawList();
            })
            $.ccio.pm(3,d.apis,null,user);
            $('.os_platform').html(d.os.platform)
            $('.os_cpuCount').html(d.os.cpuCount)
            $('.os_totalmem').html((d.os.totalmem/1000000).toFixed(2))
            if(d.os.cpuCount>1){
                $('.os_cpuCount_trailer').html('s')
            }
        break;
        case'get_videos':
            $.ccio.pm(0,d,null,user)
        break;
        case'log':
            var attr = '[mid="'+d.mid+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"]'
            $.ccio.tm(4,d,'#logs,'+attr+'.monitor_item .logs:visible,'+attr+'#add_monitor:visible .logs',user)
        break;
        case'camera_cpu_usage':
            var el = $('.monitor_item[auth="'+user.auth_token+'"][ke="'+d.ke+'"][mid="'+d.id+'"] .camera_cpu_usage')
            .attr('title',d.percent + '% ' + lang['CPU used by this stream'])
            el.find('.progress-bar').css('width',d.percent)
            el.find('.percent').html(d.percent + '%')
        break;
        case'os'://indicator
            //cpu
            d.cpu=parseFloat(d.cpu).toFixed(0)+'%';
            $('.cpu_load .progress-bar').css('width',d.cpu);
            $('.cpu_load .percent').html(d.cpu);
            //ram
            d.ram=(100-parseFloat(d.ram)).toFixed(0)+'%';
            $('.ram_load .progress-bar').css('width',d.ram);
            $('.ram_load .percent').html(d.ram);
        break;
        case'diskUsed':
            if(!d.limit||d.limit===''){d.limit=10000}
            d.percent=parseInt((d.size/d.limit)*100)+'%';
            d.human=parseFloat(d.size)
            if(d.human>1000){d.human=(d.human/1000).toFixed(2)+' GB'}else{d.human=d.human.toFixed(2)+' MB'}
            $('.diskUsed .value').html(d.human)
            $('.diskUsed .percent').html(d.percent)
            $('.diskUsed .progress-bar').css('width',d.percent)
        break;
        case'video_fix_success':case'video_fix_start':
            switch(d.f){
                case'video_fix_success':
                    d.addClass='fa-wrench'
                    d.removeClass='fa-pulse fa-spinner'
                break;
                case'video_fix_start':
                    d.removeClass='fa-wrench'
                    d.addClass='fa-pulse fa-spinner'
                break;
            }
            $('[mid="'+d.mid+'"][ke="'+d.ke+'"][file="'+d.filename+'"][auth="'+user.auth_token+'"] [video="fix"] i,[data-mid="'+d.mid+'"][data-ke="'+d.ke+'"][data-file="'+d.filename+'"][data-auth="'+user.auth_token+'"] [video="fix"] i').addClass(d.addClass).removeClass(d.removeClass)
        break;
        case'video_edit':case'video_archive':
            $.ccio.init('data-video',d)
            d.e=$('[file="'+d.filename+'"][mid="'+d.mid+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"],[data-file="'+d.filename+'"][data-mid="'+d.mid+'"][data-ke="'+d.ke+'"][data-auth="'+user.auth_token+'"]');
            d.e.attr('status',d.status),d.e.attr('data-status',d.status);
            console.log(d)

        break;
        case'video_delete':
//            if($('.modal[mid="'+d.mid+'"][auth="'+user.auth_token+'"]').length>0){$('#video_viewer[mid="'+d.mid+'"]').attr('file',null).attr('ke',null).attr('mid',null).attr('auth',null).modal('hide')}
            $('[file="'+d.filename+'"][mid="'+d.mid+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"]:not(.modal)').remove();
            $('[data-file="'+d.filename+'"][data-mid="'+d.mid+'"][data-ke="'+d.ke+'"][data-auth="'+user.auth_token+'"]:not(.modal)').remove();
            if($.pwrvid.currentDataObject&&$.pwrvid.currentDataObject[d.filename]){
                delete($.timelapse.currentVideos[$.pwrvid.currentDataObject[d.filename].position])
                $.pwrvid.drawTimeline(false)
            }
            if($.timelapse.currentVideos&&$.timelapse.currentVideos[d.filename]){
                delete($.timelapse.currentVideosArray.videos[$.timelapse.currentVideos[d.filename].position])
                $.timelapse.drawTimeline(false)
            }
            if($.vidview.loadedVideos && $.vidview.loadedVideos[d.filename])delete($.vidview.loadedVideos[d.filename])
        break;
        case'video_build_success':
            if(!d.mid){d.mid=d.id;};d.status=1;
            d.e='.glM'+d.mid+user.auth_token+'.videos_list ul,.glM'+d.mid+user.auth_token+'.videos_monitor_list ul';$(d.e).find('.notice.novideos').remove();
            $.ccio.tm(0,d,d.e,user)
        break;
        case'monitor_snapshot':
            setTimeout(function(){
                var snapElement = $('[mid="'+d.mid+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"] .snapshot')
                switch(d.snapshot_format){
                    case'plc':
                        snapElement.attr('src',placeholder.getData(placeholder.plcimg(d.snapshot)))
                    break;
                    case'ab':
                        d.reader = new FileReader();
                        d.reader.addEventListener("loadend",function(){snapElement.attr('src',d.reader.result)});
                        d.reader.readAsDataURL(new Blob([d.snapshot],{type:"image/jpeg"}));
                    break;
                    case'b64':
                        snapElement.attr('src','data:image/jpeg;base64,'+d.snapshot)
                    break;
                }
            },1000)
        break;
        case'monitor_delete':
            $('[mid="'+d.mid+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"]:not(.modal)').remove();
            $.ccio.init('clearTimers',d)
            delete($.ccio.mon[d.ke+d.mid+user.auth_token]);
        break;
        case'monitor_watch_off':case'monitor_stopping':
            if(user===$user){
                d.chosen_set='watch_on'
            }else{
                d.chosen_set='watch_on_links'
            }
            d.o=$.ccio.op()[d.chosen_set];
            if(!d.o[d.ke]){d.o[d.ke]={}};d.o[d.ke][d.id]=0;$.ccio.op(d.chosen_set,d.o);
            $.ccio.destroyStream(d,user,(d.f === 'monitor_watch_off'))
        break;
        case'monitor_watch_on':
            if(user===$user){
                d.chosen_set='watch_on'
            }else{
                d.chosen_set='watch_on_links'
            }
            d.o=$.ccio.op()[d.chosen_set];
            if(!d.o){d.o={}};if(!d.o[d.ke]){d.o[d.ke]={}};d.o[d.ke][d.id]=1;$.ccio.op(d.chosen_set,d.o);
            $.ccio.mon[d.ke+d.id+user.auth_token].watch=1;
            delete($.ccio.mon[d.ke+d.id+user.auth_token].image)
            delete($.ccio.mon[d.ke+d.id+user.auth_token].ctx)
            d.e=$('#monitor_live_'+d.id+user.auth_token);
            d.e.find('.stream-detected-object').remove()
            $.ccio.init('clearTimers',d)
            if(d.e.length === 1){
                $.ccio.init('closeVideo',{mid:d.id,ke:d.ke},user);
            }
            if(d.e.length === 0){
                $.ccio.tm(2,$.ccio.mon[d.ke+d.id+user.auth_token],'#monitors_live',user);
            }
            d.d=JSON.parse($.ccio.mon[d.ke+d.id+user.auth_token].details);
            $.ccio.tm('stream-element',$.ccio.mon[d.ke+d.id+user.auth_token],null,user);
            if($.ccio.op().jpeg_on===true){
                $.ccio.init('jpegMode',$.ccio.mon[d.ke+d.id+user.auth_token]);
            }else{
                var path = tool.checkCorrectPathEnding(location.pathname)+'socket.io'
                switch(d.d.stream_type){
                    case'jpeg':
                        $.ccio.init('jpegMode',$.ccio.mon[d.ke+d.id+user.auth_token]);
                    break;
                    case'b64':
                        if($.ccio.mon[d.ke+d.id+user.auth_token].Base64 && $.ccio.mon[d.ke+d.id+user.auth_token].Base64.connected){
                            $.ccio.mon[d.ke+d.id+user.auth_token].Base64.disconnect()
                        }
                        $.ccio.mon[d.ke+d.id+user.auth_token].Base64 = io(location.origin,{ path: path, transports: ['websocket'], forceNew: false})
                        var ws = $.ccio.mon[d.ke+d.id+user.auth_token].Base64
                        var buffer
                        ws.on('diconnect',function(){
                            console.log('Base64 Stream Disconnected')
                        })
                        ws.on('connect',function(){
                            ws.emit('Base64',{
                                auth: user.auth_token,
                                uid: user.uid,
                                ke: d.ke,
                                id: d.id,
//                                channel: channel
                            })
                            if(!$.ccio.mon[d.ke+d.id+user.auth_token].ctx||$.ccio.mon[d.ke+d.id+user.auth_token].ctx.length===0){
                                $.ccio.mon[d.ke+d.id+user.auth_token].ctx = $('#monitor_live_'+d.id+user.auth_token+' canvas');
                            }
                            var ctx = $.ccio.mon[d.ke+d.id+user.auth_token].ctx[0]
                            var ctx2d = ctx.getContext("2d")
                            $.ccio.mon[d.ke+d.id+user.auth_token].image = new Image()
                            var image = $.ccio.mon[d.ke+d.id+user.auth_token].image
                            image.onload = function() {
                                $.ccio.mon[d.ke+d.id+user.auth_token].imageLoading = false
                                d.x = 0
                                d.y = 0
        //                        d.ratio = Math.min(ctx.width/image.width,ctx.height/image.height)
        //                        d.height = image.height * d.ratio
        //                        d.width = image.width * d.ratio
        //                        if(d.width < ctx.width){
        //                            d.x = (ctx.width / 2) - (d.width / 2)
        //                        }
        //                        if(d.height < ctx.height){
        //                            d.y = (ctx.height / 2) - (d.height / 2)
        //                        }
        //                        ctx.getContext("2d").drawImage(image,d.x,d.y,d.width,d.height)
                                ctx.getContext("2d").drawImage(image,d.x,d.y,ctx.width,ctx.height)
                                URL.revokeObjectURL($.ccio.mon[d.ke+d.id+user.auth_token].imageUrl)
                            }
                            ws.on('data',function(imageData){
                                try{
                                    if($.ccio.mon[d.ke+d.id+user.auth_token].imageLoading === true)return console.log('drop');
//                                    var base64Frame = 'data:image/jpeg;base64,'+$.ccio.base64ArrayBuffer(imageData)
                                    $.ccio.mon[d.ke+d.id+user.auth_token].imageLoading = true
//                                    $.ccio.mon[d.ke+d.id+user.auth_token].image.src = base64Frame
                                    var arrayBufferView = new Uint8Array(imageData);
                                    var blob = new Blob( [ arrayBufferView ], { type: "image/jpeg" } );
                                    $.ccio.mon[d.ke+d.id+user.auth_token].imageUrl = URL.createObjectURL( blob );
                                    $.ccio.mon[d.ke+d.id+user.auth_token].image.src = $.ccio.mon[d.ke+d.id+user.auth_token].imageUrl
                                    $.ccio.mon[d.ke+d.id+user.auth_token].last_frame = 'data:image/jpeg;base64,'+$.ccio.base64ArrayBuffer(imageData)
                                }catch(er){
                                    console.log(er)
                                    $.ccio.log('base64 frame')
                                }
                                $.ccio.init('signal',d);
                            })
                        })
                    break;
                    case'mp4':
                        setTimeout(function(){
                            var stream = d.e.find('.stream-element');
                            var onPoseidonError = function(){
                                // setTimeout(function(){
                                    // $.ccio.cx({f:'monitor',ff:'watch_on',id:d.id},user)
                                // },5000)
                            }
                            if(!$.ccio.mon[d.ke+d.id+user.auth_token].PoseidonErrorCount)$.ccio.mon[d.ke+d.id+user.auth_token].PoseidonErrorCount = 0
                            if($.ccio.mon[d.ke+d.id+user.auth_token].PoseidonErrorCount >= 5)return
                            if(d.d.stream_flv_type==='ws'){
                                if($.ccio.mon[d.ke+d.id+user.auth_token].Poseidon){
                                    $.ccio.mon[d.ke+d.id+user.auth_token].Poseidon.stop()
                                }
                                try{
                                    $.ccio.mon[d.ke+d.id+user.auth_token].Poseidon = new Poseidon({
                                        video: stream[0],
                                        auth_token:user.auth_token,
                                        ke:d.ke,
                                        uid:user.uid,
                                        id:d.id,
                                        url: location.origin,
                                        path: path,
                                        onError : onPoseidonError
                                    })
                                    $.ccio.mon[d.ke+d.id+user.auth_token].Poseidon.start();
                                }catch(err){
                                    // onPoseidonError()
                                    console.log('onTryPoseidonError',err)
                                }
                            }else{
                                stream.attr('src',$.ccio.init('location',user)+user.auth_token+'/mp4/'+d.ke+'/'+d.id+'/s.mp4')
                                stream[0].onerror = function(err){
                                    console.error(err)
                                }
                            }
                        },2000)
                    break;
                    case'flv':
                        if (flvjs.isSupported()) {
                            if($.ccio.mon[d.ke+d.id+user.auth_token].flv){
                                $.ccio.mon[d.ke+d.id+user.auth_token].flv.destroy()
                            }
                            var options = {};
                            if(d.d.stream_flv_type==='ws'){
                                if(d.d.stream_flv_maxLatency&&d.d.stream_flv_maxLatency!==''){
                                    d.d.stream_flv_maxLatency = parseInt(d.d.stream_flv_maxLatency)
                                }else{
                                    d.d.stream_flv_maxLatency = 20000;
                                }
                                options = {
                                    type: 'flv',
                                    isLive: true,
                                    auth_token:user.auth_token,
                                    ke:d.ke,
                                    uid:user.uid,
                                    id:d.id,
                                    maxLatency:d.d.stream_flv_maxLatency,
                                    hasAudio:false,
                                    url: location.origin,
                                    path: path
                                }
                            }else{
                                options = {
                                    type: 'flv',
                                    isLive: true,
                                    url: $.ccio.init('location',user)+user.auth_token+'/flv/'+d.ke+'/'+d.id+'/s.flv'
                                }
                            }
                            $.ccio.mon[d.ke+d.id+user.auth_token].flv = flvjs.createPlayer(options);
                            $.ccio.mon[d.ke+d.id+user.auth_token].flv.attachMediaElement($('#monitor_live_'+d.id+user.auth_token+' .stream-element')[0]);
                            $.ccio.mon[d.ke+d.id+user.auth_token].flv.on('error',function(err){
                                console.log(err)
                            });
                            $.ccio.mon[d.ke+d.id+user.auth_token].flv.load();
                            $.ccio.mon[d.ke+d.id+user.auth_token].flv.play();
                        }else{
                            $.ccio.init('note',{title:'Stream cannot be started',text:'FLV.js is not supported on this browser. Try another stream type.',type:'error'});
                        }
                    break;
                    case'hls':
                        d.fn=function(){
                            clearTimeout($.ccio.mon[d.ke+d.id+user.auth_token].m3uCheck)
                            d.url=$.ccio.init('location',user)+user.auth_token+'/hls/'+d.ke+'/'+d.id+'/s.m3u8';
                            $.get(d.url,function(m3u){
                                if(m3u=='File Not Found'){
                                    $.ccio.mon[d.ke+d.id+user.auth_token].m3uCheck=setTimeout(function(){
                                        d.fn()
                                    },2000)
                                }else{
                                    var video = $('#monitor_live_'+d.id+user.auth_token+' .stream-element')[0];
                                    if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)||(navigator.userAgent.match(/(Safari)/)&&!navigator.userAgent.match('Chrome'))) {
                                        video.src=d.url;
                                        if (video.paused) {
                                            video.play();
                                        }
                                    }else{
                                        $.ccio.mon[d.ke+d.id+user.auth_token].hlsGarbageCollector=function(){
                                            if($.ccio.mon[d.ke+d.id+user.auth_token].hls){$.ccio.mon[d.ke+d.id+user.auth_token].hls.destroy();URL.revokeObjectURL(video.src)}
                                            $.ccio.mon[d.ke+d.id+user.auth_token].hls = new Hls();
                                            $.ccio.mon[d.ke+d.id+user.auth_token].hls.loadSource(d.url);
                                            $.ccio.mon[d.ke+d.id+user.auth_token].hls.attachMedia(video);
                                            $.ccio.mon[d.ke+d.id+user.auth_token].hls.on(Hls.Events.MANIFEST_PARSED,function() {
                                                if (video.paused) {
                                                    video.play();
                                                }
                                            });
                                        }
                                        $.ccio.mon[d.ke+d.id+user.auth_token].hlsGarbageCollector()
                                        $.ccio.mon[d.ke+d.id+user.auth_token].hlsGarbageCollectorTimer=setInterval($.ccio.mon[d.ke+d.id+user.auth_token].hlsGarbageCollector,1000*60*20)
                                    }
                                }
                            })
                        }
                        d.fn()
                    break;
                    case'mjpeg':
                        $('#monitor_live_'+d.id+user.auth_token+' .stream-element').attr('src',$.ccio.init('location',user)+user.auth_token+'/mjpeg/'+d.ke+'/'+d.id+'/?full=true')
                    break;
                    case'h265':
                        var player = $.ccio.mon[d.ke+d.id+user.auth_token].h265Player
                        var video = $('#monitor_live_'+d.id+user.auth_token+' .stream-element')[0]
                        if (player) {
                            player.stop()
                        }
                        $.ccio.mon[d.ke+d.id+user.auth_token].h265Player = new libde265.RawPlayer(video)
                        var player = $.ccio.mon[d.ke+d.id+user.auth_token].h265Player
                        player.set_status_callback(function(msg, fps) {
                        })
                        player.launch()
                        if($.ccio.mon[d.ke+d.id+user.auth_token].h265Socket && $.ccio.mon[d.ke+d.id+user.auth_token].h265Socket.connected){
                            $.ccio.mon[d.ke+d.id+user.auth_token].h265Socket.disconnect()
                        }
                        if($.ccio.mon[d.ke+d.id+user.auth_token].h265HttpStream && $.ccio.mon[d.ke+d.id+user.auth_token].abort){
                            $.ccio.mon[d.ke+d.id+user.auth_token].h265HttpStream.abort()
                        }
                        if(d.d.stream_flv_type==='ws'){
                          $.ccio.mon[d.ke+d.id+user.auth_token].h265Socket = io(location.origin,{ path: path, transports: ['websocket'], forceNew: false})
                          var ws = $.ccio.mon[d.ke+d.id+user.auth_token].h265Socket
                          ws.on('diconnect',function(){
                              console.log('h265Socket Stream Disconnected')
                          })
                          ws.on('connect',function(){
                              ws.emit('h265',{
                                  auth: user.auth_token,
                                  uid: user.uid,
                                  ke: d.ke,
                                  id: d.id,
  //                                channel: channel
                              })
                              ws.on('data',function(imageData){
                                  player._handle_onChunk(imageData)
                              })
                          })
                        }else{
                          var url = $.ccio.init('location',user)+user.auth_token+'/h265/'+d.ke+'/'+d.id+'/s.hevc';
                          $.ccio.mon[d.ke+d.id+user.auth_token].h265HttpStream = player.createHttpStream(url)
                        }
                    break;
                }
            }
            d.signal=parseFloat(d.d.signal_check);
            if(!d.signal||d.signal==NaN){d.signal=10;};d.signal=d.signal*1000*60;
            if(d.signal>0){
                $.ccio.mon[d.ke+d.id+user.auth_token].signal=setInterval(function(){$.ccio.init('signal-check',{id:d.id,ke:d.ke})},d.signal);
            }
            d.e=$('.monitor_item[mid="'+d.id+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"]').resize()
            if(d.e.find('.videos_monitor_list li').length===0){
                d.dr=$('#videos_viewer_daterange').data('daterangepicker');
                $.getJSON($.ccio.init('location',user)+user.auth_token+'/videos/'+d.ke+'/'+d.id+'?limit=10',function(f){
                    $.ccio.pm(0,{videos:f.videos,ke:d.ke,mid:d.id},null,user)
                })
            }
            setTimeout(function(){
                if($.ccio.mon[d.ke+d.id+user.auth_token].motionDetectionRunning===true){
                    $.ccio.init('streamMotionDetectRestart',{mid:d.id,ke:d.ke,mon:$.ccio.mon[d.ke+d.id+user.auth_token]},user);
                }
            },3000)
        break;
        case'pam_frame':
            if(!$.ccio.mon[d.ke+d.id+user.auth_token].ctx||$.ccio.mon[d.ke+d.id+user.auth_token].ctx.length===0){
                $.ccio.mon[d.ke+d.id+user.auth_token].ctx = $('#monitor_live_'+d.id+user.auth_token+' canvas');
                $.ccio.mon[d.ke+d.id+user.auth_token].ctxContext = $.ccio.mon[d.ke+d.id+user.auth_token].ctx[0].getContext('2d');
            }
            var ctx = $.ccio.mon[d.ke+d.id+user.auth_token].ctxContext;
            d.x = 0,d.y = 0;
            d.ratio = Math.min($.ccio.mon[d.ke+d.id+user.auth_token].ctx.width()/d.imageData.width,$.ccio.mon[d.ke+d.id+user.auth_token].ctx.height()/d.imageData.height);
            d.height = d.imageData.height*d.ratio;
            d.width = d.imageData.width*d.ratio;
            if( d.width < $.ccio.mon[d.ke+d.id+user.auth_token].ctx.width() )
                d.x = ($.ccio.mon[d.ke+d.id+user.auth_token].ctx.width() / 2) - (d.width / 2);
            if( d.height < $.ccio.mon[d.ke+d.id+user.auth_token].ctx.height() )
                d.y = ($.ccio.mon[d.ke+d.id+user.auth_token].ctx.height() / 2) - (d.height / 2);
            var imageData = ctx.createImageData(d.width,d.height)
            imageData.data.set(new Uint8ClampedArray(d.imageData.data))
            console.log(imageData)
            ctx.putImageData(imageData, 0, 0);
        break;
        case'monitor_frame':
            try{
                if($.ccio.mon[d.ke+d.id+user.auth_token].imageLoading === true)return
                if(!$.ccio.mon[d.ke+d.id+user.auth_token].ctx||$.ccio.mon[d.ke+d.id+user.auth_token].ctx.length===0){
                    $.ccio.mon[d.ke+d.id+user.auth_token].ctx = $('#monitor_live_'+d.id+user.auth_token+' canvas');
                }
                var ctx = $.ccio.mon[d.ke+d.id+user.auth_token].ctx[0]
                if(!$.ccio.mon[d.ke+d.id+user.auth_token].image){
                    $.ccio.mon[d.ke+d.id+user.auth_token].image = new Image()
                    var image = $.ccio.mon[d.ke+d.id+user.auth_token].image
                    image.onload = function() {
                        $.ccio.mon[d.ke+d.id+user.auth_token].imageLoading = false
                        d.x = 0
                        d.y = 0
//                        d.ratio = Math.min(ctx.width/image.width,ctx.height/image.height)
//                        d.height = image.height * d.ratio
//                        d.width = image.width * d.ratio
//                        if(d.width < ctx.width){
//                            d.x = (ctx.width / 2) - (d.width / 2)
//                        }
//                        if(d.height < ctx.height){
//                            d.y = (ctx.height / 2) - (d.height / 2)
//                        }
//                        ctx.getContext("2d").drawImage(image,d.x,d.y,d.width,d.height)
                        ctx.getContext("2d").drawImage(image,d.x,d.y,ctx.width,ctx.height)
                    }
                }
                var base64Frame = 'data:image/jpeg;base64,'+d.frame
                $.ccio.mon[d.ke+d.id+user.auth_token].imageLoading = true
                $.ccio.mon[d.ke+d.id+user.auth_token].image.src = base64Frame
                $.ccio.mon[d.ke+d.id+user.auth_token].last_frame = base64Frame
            }catch(er){
                console.log(er)
                $.ccio.log('base64 frame')
            }
            $.ccio.init('signal',d);
        break;
        case'monitor_edit':
            $.ccio.init('clearTimers',d)
            d.e=$('[mid="'+d.mon.mid+'"][ke="'+d.mon.ke+'"][auth="'+user.auth_token+'"]');
            d.e=$('#monitor_live_'+d.mid+user.auth_token);
            d.e.find('.stream-detected-object').remove()
            if(d.mon.details.control=="1"){d.e.find('[monitor="control_toggle"]').show()}else{d.e.find('.pad').remove();d.e.find('[monitor="control_toggle"]').hide()}
            if(user===$user){
                d.chosen_set='watch_on'
            }else{
                d.chosen_set='watch_on_links'
            }
            d.o=$.ccio.op()[d.chosen_set];
            if(!d.o){d.o={}}
            if(d.mon.details.cords instanceof Object){d.mon.details.cords=JSON.stringify(d.mon.details.cords);}
            d.mon.details=JSON.stringify(d.mon.details);
            if(!$.ccio.mon[d.ke+d.mid+user.auth_token]){$.ccio.mon[d.ke+d.mid+user.auth_token]={}}
            $.ccio.init('jpegModeStop',d);
            $.ccio.mon[d.ke+d.mid+user.auth_token].previousStreamType=d.mon.details.stream_type
            $.each(d.mon,function(n,v){
                $.ccio.mon[d.ke+d.mid+user.auth_token][n]=v;
            });
            $.ccio.mon[d.ke+d.mid+user.auth_token].user=user
            if(d.new===true){$.ccio.tm(1,d.mon,null,user)}
            switch(d.mon.mode){
                case'start':case'record':
                    if(d.o[d.ke]&&d.o[d.ke][d.mid]===1){
                        $.ccio.cx({f:'monitor',ff:'watch_on',id:d.mid},user)
                    }
                break;
            }
            $.ccio.init('monitorInfo',d)
            $.gR.drawList();
            if(!d.silenceNote){
                $.ccio.init('note',{title:'Monitor Saved',text:'<b>'+d.mon.name+'</b> <small>'+d.mon.mid+'</small> has been saved.',type:'success'});
            }
        break;
        case'monitor_starting':
//            switch(d.mode){case'start':d.mode='Watch';break;case'record':d.mode='Record';break;}
//            $.ccio.init('note',{title:'Monitor Starting',text:'Monitor <b>'+d.mid+'</b> is now running in mode <b>'+d.mode+'</b>',type:'success'});
            d.e=$('#monitor_live_'+d.mid+user.auth_token)
            if(d.e.length>0){$.ccio.cx({f:'monitor',ff:'watch_on',id:d.mid},user)}
        break;
        case'mode_jpeg_off':
            $.ccio.op('jpeg_on',"0");
            $.each($.ccio.mon,function(n,v,x){
                $.ccio.init('jpegModeStop',v);
                if(v.watch===1){
                    $.ccio.cx({f:'monitor',ff:'watch_on',id:v.mid},user)
                }
            });
            $('body').removeClass('jpegMode')
        break;
        case'mode_jpeg_on':
            $.ccio.op('jpeg_on',true);
            $.ccio.init('jpegModeAll');
            $('body').addClass('jpegMode')
        break;
        case'drawPowerVideoMainTimeLine':
            var videos = d.videos;
            var events = d.events;
//            $.pwrvid.currentlyLoading = false
            $.pwrvid.currentVideos=videos
            $.pwrvid.currentEvents=events
            $.pwrvid.e.find('.loading').hide()
            $.pwrvid.e.find('.nodata').hide()
            //$.pwrvid.drawTimeLine
            if($.pwrvid.t&&$.pwrvid.t.destroy){$.pwrvid.t.destroy()}
            data={};
            $.each(videos.videos,function(n,v){
                if(!v||!v.mid){return}
                v.mon=$.ccio.mon[v.ke+v.mid+$user.auth_token];
//                v.filename=$.ccio.init('tf',v.time)+'.'+v.ext;
                if(v.status>0){
        //                    data.push({src:v,x:v.time,y:$.ccio.timeObject(v.time).diff($.ccio.timeObject(v.end),'minutes')/-1})
                    data[v.filename]={
                        filename:v.filename,
                        time:v.time,
                        timeFormatted:$.ccio.timeObject(v.time).format('MM/DD/YYYY HH:mm'),
                        endTime:v.end,
                        close:$.ccio.timeObject(v.time).diff($.ccio.timeObject(v.end),'minutes')/-1,
                        motion:[],
                        row:v,
                        position:n
                    }
                }
            });

            var eventsToCheck = Object.assign({},events)
            $.each(data,function(m,b){
                startTimeFormatted = $.ccio.timeObject(b.time).format('YYYY-MM-DD HH:mm:ss');
                startTime = $.ccio.timeObject(b.time).format();
                endTime = $.ccio.timeObject(b.endTime).format();
                var newSetOfEventsWithoutChecked = {};
                var eventTime
                $.each(eventsToCheck,function(n,v){
                    try{
                        if(v.details.videoTime.indexOf('T') > -1){
                            eventTime = v.details.videoTime.split('T');
                        }else{
                            eventTime = v.details.videoTime.split(' ');
                        }
                    }catch(err){
                        if(v.time.indexOf('T') > -1){
                            eventTime = v.time.split('T');
                        }else{
                            eventTime = v.time.split(' ');
                        }
                    }
                    eventTime[1] = eventTime[1].replace(/-/g,':'),eventTime = eventTime.join(' ');
                    if(eventTime === startTimeFormatted){
                        data[m].motion.push(v)
                    }else if ($.ccio.timeObject(v.time).isBetween(startTime,$.ccio.timeObject(b.endTime).format())) {
                        data[m].motion.push(v)
                    }else{
                        newSetOfEventsWithoutChecked[n] = v;
                    }
                })
                eventsToCheck = newSetOfEventsWithoutChecked;
            });
            $.pwrvid.currentDataObject=data;
            if($.pwrvid.chart){
                $.pwrvid.d.empty()
                delete($.pwrvid.chart)
            }
            $.pwrvid.currentData=Object.values(data);
            if($.pwrvid.currentData.length>0){
                var labels=[]
                var Dataset1=[]
                var Dataset2=[]
                $.each(data,function(n,v){
                    labels.push(v.timeFormatted)
                    Dataset1.push(v.close)
                    Dataset2.push(v.motion.length)
                })
                $.pwrvid.d.html("<canvas></canvas>")
                var timeFormat = 'MM/DD/YYYY HH:mm';
                var color = Chart.helpers.color;
                Chart.defaults.global.defaultFontColor = '#fff';
                var config = {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            type: 'line',
                            label: lang['Video and Time Span (Minutes)'],
                            backgroundColor: color(window.chartColors.blue).alpha(0.2).rgbString(),
                            borderColor: window.chartColors.blue,
                            data: Dataset1,
                        }, {
                            type: 'bar',
                            showTooltip: false,
                            label: lang['Counts of Motion'],
                            backgroundColor: color(window.chartColors.red).alpha(0.5).rgbString(),
                            borderColor: window.chartColors.red,
                            data:Dataset2,
                        }, ]
                    },
                    options: {
                         maintainAspectRatio: false,
                        title: {
                            fontColor: "white",
                            text: lang['Video Length (minutes) and Motion Count per video']
                        },
                        tooltips: {
                            callbacks: {

                            },
                        },
                        scales: {
                            xAxes: [{
                                type: "time",
                                display: true,
                                time: {
                                    format: timeFormat,
                                    // round: 'day'
                                }
                            }],
                        },
                    }
                };

                var ctx = $.pwrvid.d.find('canvas')[0].getContext("2d");
                $.pwrvid.chart = new Chart(ctx, config);
                $.pwrvid.d.find('canvas').click(function(e) {
                    var target = $.pwrvid.chart.getElementsAtEvent(e)[0];
                    if(!target){return false}
                    target = $.pwrvid.currentData[target._index];
                    $.pwrvid.e.find('.temp').html('<li class="glM'+target.row.mid+$user.auth_token+'" mid="'+target.row.mid+'" ke="'+target.row.ke+'" status="'+target.row.status+'" file="'+target.row.filename+'" auth="'+$user.auth_token+'"><a class="btn btn-sm btn-primary" preview="video" href="'+target.row.href+'"><i class="fa fa-play-circle"></i></a></li>').find('a').click()
                });
                var colorNames = Object.keys(window.chartColors);
            }else{
                $.pwrvid.e.find('.nodata').show()
            }
        break;
    }
}
$user.ws=io(location.origin,{
    path : tool.checkCorrectPathEnding(location.pathname)+'socket.io'
});
$user.ws.on('connect',function (d){
    $(document).ready(function(e){
        $.ccio.init('id',$user);
        $.ccio.cx({f:'init',ke:$user.ke,auth:$user.auth_token,uid:$user.uid})
        if($user.details&&$user.details.links){
            $.each($user.details.links,function(n,v){
                if(v.secure==='0'){
                    v.protocol='http'
                }else{
                    v.protocol='https'
                }
                if(v.host.indexOf('://')>-1){
                    v.URL=v.protocol+'://'+v.host.split('://')[1]
                }else{
                    v.URL=v.protocol+'://'+v.host
                }
                $.get(v.URL+'/'+v.api+'/userInfo/'+v.ke,function(e){
                    if(e.ok===true){
                        e.user.auth_token=v.api
                        $.users[v.api]=e.user
                        $.users[v.api].info=v
                        $.users[v.api].ws=io(v.host)
                        $.users[v.api].ws.on('ping', function(d){
                            $.users[v.api].ws.emit('pong',{beat:1});
                        });
                        $.users[v.api].ws.on('connect',function (d){
                            console.log(v.host,'connected')
                            $.ccio.cx({f:'init',ke:e.user.ke,auth:v.api,uid:e.user.uid},$.users[v.api])
                        })
                        $.users[v.api].ws.on('f',function (d){
                            $.ccio.globalWebsocket(d,$.users[v.api])
                        })
                    }
                })
            })
        }
    })
})
PNotify.prototype.options.styling = "fontawesome";
$user.ws.on('ping', function(d){
    $user.ws.emit('pong',{beat:1});
});
$user.ws.on('f',function (d){
    $.ccio.globalWebsocket(d)
    switch(d.f){
        case'api_key_deleted':
            if($user.uid === d.uid){
                $.ccio.init('note',{title:lang['API Key Deleted'],text:lang.APIKeyDeletedText,type:'notice'});
                $('[api_key="'+d.form.code+'"]').remove()
            }
        break;
        case'api_key_added':
            if($user.uid === d.uid){
                $.ccio.init('note',{title:lang['API Key Added'],text:lang.FiltersUpdatedText,type:'success'});
                $.ccio.tm(3,d.form,'#api_list')
            }
        break;
        case'filters_change':
            $.ccio.init('note',{title:lang['Filters Updated'],text:lang.FiltersUpdatedText,type:'success'});
            $user.details.filters=d.filters;
            $.ccio.init('filters');
        break;
        case'user_settings_change':
            $.ccio.init('note',{title:lang['Settings Changed'],text:lang.SettingsChangedText,type:'success'});
            $.ccio.init('id',d.form);
            d.form.details=JSON.parse(d.form.details)
            $('#custom_css').append(d.form.details.css)
            if(d.form.details){
                $user.details=d.form.details
            }
        break;
        case'users_online':
            $.ccio.pm('user-row',d.users);
        break;
        case'user_status_change':
            if(d.status===1){
                $.ccio.tm('user-row',d.user,null)
            }else{
                $('.user-row[uid="'+d.uid+'"][ke="'+d.ke+'"]').remove()
            }
        break;
        case'ffprobe_stop':
            $.pB.e.find('._loading').hide()
            $.pB.o.append('<div><b>END</b></div>');
            $.pB.e.find('.stop').hide();
            $.pB.e.find('[type="submit"]').show();
        break;
        case'ffprobe_start':
            $.pB.e.find('._loading').show()
            $.pB.o.empty();
            $.pB.e.find('.stop').show();
            $.pB.e.find('[type="submit"]').hide();
        break;
        case'ffprobe_data':
            $.pB.results=JSON.parse(d.data)
            $.pB.o.append($.ccio.init('jsontoblock',$.pB.results))
        break;
        case'detector_cascade_list':
            d.tmp=''
            $.each(d.cascades,function(n,v){
                d.tmp+='<li class="mdl-list__item">';
                d.tmp+='<span class="mdl-list__item-primary-content">';
                d.tmp+=v;
                d.tmp+='</span>';
                d.tmp+='<span class="mdl-list__item-secondary-action">';
                d.tmp+='<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">';
                d.tmp+='<input type="checkbox" value="'+v+'" detailContainer="detector_cascades" detailObject="'+v+'" class="detector_cascade_selection mdl-switch__input"/>';
                d.tmp+='</label>';
                d.tmp+='</span>';
                d.tmp+='</li>';
            })
            $('#detector_cascade_list').html(d.tmp)
            componentHandler.upgradeAllRegistered()
            //add auto select for preferences
            d.currentlyEditing=$.aM.e.attr('mid')
            if(d.currentlyEditing&&d.currentlyEditing!==''){
                d.currentlyEditing=JSON.parse(JSON.parse($.ccio.mon[d.currentlyEditing].details).detector_cascades)
                $.each(d.currentlyEditing,function(m,b){
                    d.e=$('.detector_cascade_selection[value="'+m+'"]').prop('checked',true)
                    d.p=d.e.parents('.mdl-js-switch')
                    if(d.p.length>0){
                        d.p.addClass('is-checked')
                    }
                })
            }
        break;
        case'detector_plugged':
            if(!d.notice){d.notice=''}
            $('.shinobi-detector').show()
            $('.shinobi-detector-msg').html(d.notice)
            $('.shinobi-detector_name').text(d.plug)
            $('.shinobi-detector-'+d.plug).show()
            $('.shinobi-detector-invert').hide()
            $.aM.drawList()
        break;
        case'detector_unplugged':
            $('.stream-objects .stream-detected-object').remove()
            $('.shinobi-detector').hide()
            $('.shinobi-detector-msg').empty()
            $('.shinobi-detector_name').empty()
            $('.shinobi-detector_plug').hide()
            $('.shinobi-detector-invert').show()
            $.aM.drawList()
        break;
        case'monitor_edit_failed':
            d.pnote={title:'Monitor Not Saved',text:'<b>'+d.mon.name+'</b> <small>'+d.mon.mid+'</small> has not been saved.',type:'error'}
            switch(d.ff){
                case'max_reached':
                    d.pnote.text+=' '+lang.monitorEditFailedMaxReached
                break;
            }
            $.ccio.init('note',d.pnote);
        break;
//        case'onvif_end':
//            if(Object.keys($.oB.foundMonitorsCount).length===0){
//                $.oB.e.find('._loading').hide()
//                $.oB.e.find('[type="submit"]').prop('disabled',false)
//                $.oB.o.append('<td class="text-center _notfound">Sorry, nothing was found.</td>')
//            }
//        break;
        case'onvif':
            var tempID = $.ccio.gid();
            $.oB.foundMonitors[tempID] = Object.assign({},d);
            $.oB.e.find('._loading').hide()
            $.oB.e.find('._notfound').remove()
            $.oB.e.find('[type="submit"]').prop('disabled',false)
            d.info=$.ccio.init('jsontoblock',d.info)
            if(d.uri){
                d.stream=d.uri
            }else{
                d.stream='URL not Found'
            }
            $('#onvif_probe .output_data').append('<tr onvif_row="'+tempID+'"><td><a class="btn btn-sm btn-primary copy">&nbsp;<i class="fa fa-copy"></i>&nbsp;</a></td><td class="ip">'+d.ip+'</td><td class="port">'+d.port+'</td><td>'+$.ccio.init('jsontoblock',d.info)+'</td><td class="url">'+d.stream+'</td></tr>')
        break;
    }
    delete(d);
});
})
