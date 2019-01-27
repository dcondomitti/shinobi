$.ccio.init=function(x,d,user,k){
    if(!k){k={}};k.tmp='';
    if(d&&d.user){
        user=d.user
    }
    if(!user){
        user=$user
    }
    switch(x){
        case'cleanMon':
            var acceptedFields = [
                'mid',
                'ke',
                'name',
                'shto',
                'shfr',
                'details',
                'type',
                'ext',
                'protocol',
                'host',
                'path',
                'port',
                'fps',
                'mode',
                'width',
                'height'
            ]
            var row = {};
            $.each(d,function(m,b){
                if(acceptedFields.indexOf(m)>-1){
                    row[m]=b;
                }
            })
            return row
        break;
        case'cleanMons':
            if(d==='object'){
                var arr={}
            }else{
                var arr=[]
            }
            $.each($.ccio.mon,function(n,v){
                var row = $.ccio.init('cleanMon',v)
                if(d==='object'){
                    arr[n]=row
                }else{
                    arr.push(row)
                }
            })
            return arr;
        break;
        case'location':
            var url
            if(d&&d.info&&d.info.URL){
                url=d.info.URL
                if(url.charAt(url.length-1)!=='/'){
                    url=url+'/'
                }
            }else{
                url = $.ccio.libURL
            }
            return url
        break;
        case'videoUrlBuild':
            var url
            if(d.href){
                url = d.href
            }else if(!d.href && d.hrefNoAuth){
                url = $.ccio.init('location',user)+user.auth_token+d.hrefNoAuth
            }
            if(user!==$user&&url.charAt(0)==='/'){
                url = $.ccio.init('location',user)+d.href.substring(1)
            }
            return url
        break;
        case'videoHrefToDelete':
            var urlSplit = d.split('?')
            var url = urlSplit[0]+'/delete'
            if(urlSplit[1])url += '?' + urlSplit[1]
            return url
        break;
        case'videoHrefToUnread':
            var urlSplit = d.split('?')
            var url = urlSplit[0]+'/status/1'
            if(urlSplit[1])url += '?' + urlSplit[1]
            return url
        break;
        case'videoHrefToRead':
            var urlSplit = d.split('?')
            var url = urlSplit[0]+'/status/2'
            if(urlSplit[1])url += '?' + urlSplit[1]
            return url
        break;
//            case'streamWindow':
//                return $('.monitor_item[mid="'+d.id+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"]')
//            break;
        case'streamMotionDetectRestart':
            $.ccio.init('streamMotionDetectOff',d,user)
            $.ccio.init('streamMotionDetectOn',d,user)
        break;
        case'streamMotionDetectOff':
            d.mon.motionDetectionRunning = false
            $('.monitor_item[mid="'+d.mid+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"]').find('.stream-detected-object,.zoomGlass').remove()
            clearInterval(d.mon.motionDetector)
        break;
        case'streamMotionDetectOn':
            switch(JSON.parse(d.mon.details).stream_type){
                case'hls':case'flv':case'mp4':
                    //pass
                break;
                default:
                    return $.ccio.init('note',{title:'Client-side Detector',text:'Could not be started. Only <b>FLV</b> and <b>HLS</b> can use this feature.',type:'error'});
                break;

            }
            d.mon.motionDetectorNextDraw = true
            d.mon.motionDetectionRunning = true
            $.ccio.snapshot(d,function(url){
                $('#temp').html('<img>')
                var img=$('#temp img')[0]
                img.onload=function(){
                    var frameNumber = 0,
                        mainWindow = $('.monitor_item[mid="'+d.mid+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"]'),
                        blenderCanvas = mainWindow.find(".blenderCanvas"),
                        motionVision = mainWindow.find(".motionVision"),
                        streamElement = mainWindow.find('.stream-element'),
                        streamElementTag = streamElement[0],
                        lastURL = null,
                        currentImage = null,
                        f = [],
                        drawMatrices = {
                            e:mainWindow,
                            monitorDetails:JSON.parse(d.mon.details),
                            stream:streamElement,
                            streamObjects:mainWindow.find('.stream-objects'),
                            details:{
                                name:'clientSideDetection',
                            }
                        };
                    widthRatio = streamElement.width() / img.width
                    heightRatio = streamElement.height() / img.height
                    drawMatrices.monitorDetails.detector_scale_x = img.width;
                    drawMatrices.monitorDetails.detector_scale_y = img.height;
                    function checkForMotion() {
                        blenderCanvas.width = img.width;
                        blenderCanvas.height = img.height;
                        blenderCanvasContext.drawImage(streamElementTag, 0, 0);
                        f[frameNumber] = blenderCanvasContext.getImageData(0, 0, blenderCanvas.width, blenderCanvas.height);
                        frameNumber = 0 == frameNumber ? 1 : 0;
                        currentImage = blenderCanvasContext.getImageData(0, 0, blenderCanvas.width, blenderCanvas.height);
                        foundPixels = [];
                        for (var currentImageLength = currentImage.data.length * 0.25, b = 0; b < currentImageLength;){
                            var pos = b * 4
                            currentImage.data[pos] = .5 * (255 - currentImage.data[pos]) + .5 * f[frameNumber].data[pos];
                            currentImage.data[pos + 1] = .5 * (255 - currentImage.data[pos + 1]) + .5 * f[frameNumber].data[pos + 1];
                            currentImage.data[pos + 2] = .5 * (255 - currentImage.data[pos + 2]) + .5 * f[frameNumber].data[pos + 2];
                            currentImage.data[pos + 3] = 255;
                            var score = (currentImage.data[pos] + currentImage.data[pos + 1] + currentImage.data[pos + 2]) / 3;
                            if(score>170){
                                var x = (pos / 4) % img.width;
                                var y = Math.floor((pos / 4) / img.width);
                                foundPixels.push([x,y])
                            }
                            b += 4;
                        }
                        var groupedPoints = Object.assign({},Cluster);
                        groupedPoints.iterations(25);
                        groupedPoints.data(foundPixels);
                        var groupedPoints = groupedPoints.clusters()
                        drawMatrices.details.matrices=[]
                        var mostHeight = 0;
                        var mostWidth = 0;
                        var mostWithMotion = null;
                        groupedPoints.forEach(function(v,n){
                            var matrix = {
                                topLeft:[img.width,img.height],
                                topRight:[0,img.height],
                                bottomRight:[0,0],
                                bottomLeft:[img.width,0],
                            }
                            v.points.forEach(function(b){
                                var x = b[0]
                                var y = b[1]
                                if(x<matrix.topLeft[0])matrix.topLeft[0]=x;
                                if(y<matrix.topLeft[1])matrix.topLeft[1]=y;
                                //Top Right point
                                if(x>matrix.topRight[0])matrix.topRight[0]=x;
                                if(y<matrix.topRight[1])matrix.topRight[1]=y;
                                //Bottom Right point
                                if(x>matrix.bottomRight[0])matrix.bottomRight[0]=x;
                                if(y>matrix.bottomRight[1])matrix.bottomRight[1]=y;
                                //Bottom Left point
                                if(x<matrix.bottomLeft[0])matrix.bottomLeft[0]=x;
                                if(y>matrix.bottomLeft[1])matrix.bottomLeft[1]=y;
                            })
                            matrix.x = matrix.topLeft[0];
                            matrix.y = matrix.topLeft[1];
                            matrix.width = matrix.topRight[0] - matrix.topLeft[0]
                            matrix.height = matrix.bottomLeft[1] - matrix.topLeft[1]

                            if(matrix.width>mostWidth&&matrix.height>mostHeight){
                                mostWidth = matrix.width;
                                mostHeight = matrix.height;
                                mostWithMotion = matrix;
                            }

                            drawMatrices.details.matrices.push(matrix)
                        })
                        $.ccio.magnifyStream({
                            p:mainWindow,
                            useCanvas:true,
                            zoomAmount:1,
                            auto:true,
                            animate:true,
                            pageX:((mostWithMotion.width / 2) + mostWithMotion.x) * widthRatio,
                            pageY:((mostWithMotion.height / 2) + mostWithMotion.y) * heightRatio
                        })
                        $.ccio.init('drawMatrices',drawMatrices)
                        if(d.mon.motionDetectorNextDraw===true){
                            clearTimeout(d.mon.motionDetectorNextDrawTimeout)
                            d.mon.motionDetectorNextDrawTimeout=setTimeout(function(){
                                d.mon.motionDetectorNextDraw = true;
                            },1000)
                            d.mon.motionDetectorNextDraw = false;
//                                console.log({
//                                    p:mainWindow,
//                                    pageX:((matrix.width / 2) + matrix.x) * widthRatio,
//                                    pageY:((matrix.height / 2) + matrix.y) * heightRatio
//                                })
                        }
                        return drawMatrices.details.matrices;
                    }
                    if(blenderCanvas.length === 0){
                        mainWindow.append('<div class="zoomGlass"><canvas class="blenderCanvas"></canvas></div>')
                        blenderCanvas = mainWindow.find(".blenderCanvas")
                    }
                    blenderCanvas = blenderCanvas[0];
                    var blenderCanvasContext = blenderCanvas.getContext("2d");
                    clearInterval(d.mon.motionDetector)
                    d.mon.motionDetector = setInterval(checkForMotion,2000)
                }
                img.src=url
            })
        break;
        case'streamURL':
            var streamURL
            switch(JSON.parse(d.details).stream_type){
                case'jpeg':
                    streamURL=$.ccio.init('location',user)+user.auth_token+'/jpeg/'+d.ke+'/'+d.mid+'/s.jpg'
                break;
                case'mjpeg':
                    streamURL=$.ccio.init('location',user)+user.auth_token+'/mjpeg/'+d.ke+'/'+d.mid
                break;
                case'hls':
                    streamURL=$.ccio.init('location',user)+user.auth_token+'/hls/'+d.ke+'/'+d.mid+'/s.m3u8'
                break;
                case'flv':
                    streamURL=$.ccio.init('location',user)+user.auth_token+'/flv/'+d.ke+'/'+d.mid+'/s.flv'
                break;
                case'h265':
                    streamURL=$.ccio.init('location',user)+user.auth_token+'/h265/'+d.ke+'/'+d.mid+'/s.hevc'
                break;
                case'mp4':
                    streamURL=$.ccio.init('location',user)+user.auth_token+'/mp4/'+d.ke+'/'+d.mid+'/s.mp4'
                break;
                case'b64':
                    streamURL='Websocket'
                break;
                case'pam':
                    streamURL='Websocket'
                break;
            }
            return streamURL
        break;
        case'humanReadMode':
            switch(d){
                case'idle':
                    k.mode=lang['Idle']
                break;
                case'stop':
                    k.mode=lang['Disabled']
                break;
                case'record':
                    k.mode=lang['Record']
                break;
                case'start':
                    k.mode=lang['Watch Only']
                break;
            }
            return k.mode
        break;
        case'monitorInfo':
            d.e=$('.glM'+d.mon.mid+user.auth_token);
            if(JSON.parse(d.mon.details).vcodec!=='copy'&&d.mon.mode=='record'){
                d.e.find('.monitor_not_record_copy').show()
            }else{
                d.e.find('.monitor_not_record_copy').hide()
            }
            d.e.find('.monitor_name').text(d.mon.name)
            d.e.find('.monitor_mid').text(d.mon.mid)
            d.e.find('.monitor_ext').text(d.mon.ext);
            d.mode=$.ccio.init('humanReadMode',d.mon.mode,user)
            d.e.find('.monitor_mode').text(d.mode)
            d.e.find('.monitor_status').text(d.status)
            d.e.attr('mode',d.mode)
            d.e.find('.lamp').attr('title',d.mode)
        break;
        case'fullscreen':
            if (d.requestFullscreen) {
              d.requestFullscreen();
            } else if (d.mozRequestFullScreen) {
              d.mozRequestFullScreen();
            } else if (d.webkitRequestFullscreen) {
              d.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        break;
        case'drawPoints':
            d.height=d.stream.height()
            d.width=d.stream.width()
            if(d.monitorDetails.detector_scale_x===''){d.monitorDetails.detector_scale_x=320}
            if(d.monitorDetails.detector_scale_y===''){d.monitorDetails.detector_scale_y=240}

            d.widthRatio=d.width/d.monitorDetails.detector_scale_x
            d.heightRatio=d.height/d.monitorDetails.detector_scale_y

            d.streamObjects.find('.stream-detected-point[name="'+d.details.name+'"]').remove()
            d.tmp=''
            $.each(d.details.points,function(n,v){
                d.tmp+='<div class="stream-detected-point" name="'+d.details.name+'" style="height:'+1+'px;width:'+1+'px;top:'+(d.heightRatio*v.x)+'px;left:'+(d.widthRatio*v.y)+'px;">'
                if(v.tag){d.tmp+='<span class="tag">'+v.tag+'</span>'}
                d.tmp+='</div>'
            })
            d.streamObjects.append(d.tmp)
        break;
        case'drawMatrices':
            d.height=d.stream.height()
            d.width=d.stream.width()
            if(d.monitorDetails.detector_scale_x===''){d.monitorDetails.detector_scale_x=320}
            if(d.monitorDetails.detector_scale_y===''){d.monitorDetails.detector_scale_y=240}

            d.widthRatio=d.width/d.monitorDetails.detector_scale_x
            d.heightRatio=d.height/d.monitorDetails.detector_scale_y

            d.streamObjects.find('.stream-detected-object[name="'+d.details.name+'"]').remove()
            d.tmp=''
            $.each(d.details.matrices,function(n,v){
                d.tmp+='<div class="stream-detected-object" name="'+d.details.name+'" style="height:'+(d.heightRatio*v.height)+'px;width:'+(d.widthRatio*v.width)+'px;top:'+(d.heightRatio*v.y)+'px;left:'+(d.widthRatio*v.x)+'px;">'
                if(v.tag){d.tmp+='<span class="tag">'+v.tag+'</span>'}
                d.tmp+='</div>'
            })
            d.streamObjects.append(d.tmp)
        break;
        case'clearTimers':
            if(!d.mid){d.mid=d.id}
            if($.ccio.mon[d.ke+d.mid+user.auth_token]){
                clearTimeout($.ccio.mon[d.ke+d.mid+user.auth_token]._signal);
                clearInterval($.ccio.mon[d.ke+d.mid+user.auth_token].hlsGarbageCollectorTimer)
                clearTimeout($.ccio.mon[d.ke+d.mid+user.auth_token].jpegInterval);
                clearInterval($.ccio.mon[d.ke+d.mid+user.auth_token].signal);
                clearInterval($.ccio.mon[d.ke+d.mid+user.auth_token].m3uCheck);
                if($.ccio.mon[d.ke+d.mid+user.auth_token].Base64 && $.ccio.mon[d.ke+d.mid+user.auth_token].Base64.connected){
                    $.ccio.mon[d.ke+d.mid+user.auth_token].Base64.disconnect()
                }
                if($.ccio.mon[d.ke+d.mid+user.auth_token].Poseidon){
                    $.ccio.mon[d.ke+d.mid+user.auth_token].Poseidon.stop()
                }
            }
        break;
        case'note':
            k.o=$.ccio.op().switches
            if(k.o&&k.o.notifyHide!==1){
                new PNotify(d)
                if(user.details.audio_note && user.details.audio_note !== ''){
                    var audio = new Audio('libs/audio/'+user.details.audio_note);
                    audio.play()
                }
            }
        break;
        case'monGroup':
            $.ccio.mon_groups={};
            $.each($.ccio.mon,function(n,v,x){
                if(typeof v.details==='string'){
                    k.d=JSON.parse(v.details)
                }else{
                    k.d=v.details
                }
                try{
                    k.groups=JSON.parse(k.d.groups)
                    $.each(k.groups,function(m,b){
                        if(!$.ccio.mon_groups[b])$.ccio.mon_groups[b]={}
                        $.ccio.mon_groups[b][v.mid]=v;
                    })
                }catch(er){

                }
            })
            return $.ccio.mon_groups;
        break;
        case'closeVideo':
            var el = $('#monitor_live_'+d.mid+user.auth_token)
            var video = el.find('video')
            if(video.length === 1){
                if(!video[0].paused){
                    video[0].onerror = function(){}
                    video[0].pause()
                }
                video.prop('src','');
                video.find('source').remove();
                video.remove();
            }
        break;
        case'jpegModeStop':
            clearTimeout($.ccio.mon[d.ke+d.mid+user.auth_token].jpegInterval);
            delete($.ccio.mon[d.ke+d.mid+user.auth_token].jpegInterval);
            $('#monitor_live_'+d.mid+user.auth_token+' .stream-element').unbind('load')
        break;
        case'jpegMode':
            if(d.watch===1){
                k=JSON.parse(d.details);
                k.jpegInterval=parseFloat(k.jpegInterval);
                if(!k.jpegInterval||k.jpegInterval===''||isNaN(k.jpegInterval)){k.jpegInterval=1}
                $.ccio.tm('stream-element',$.ccio.mon[d.ke+d.mid+user.auth_token]);
                k.e=$('#monitor_live_'+d.mid+user.auth_token+' .stream-element');
                $.ccio.init('jpegModeStop',d,user);
                k.run=function(){
                    k.e.attr('src',$.ccio.init('location',user)+user.auth_token+'/jpeg/'+d.ke+'/'+d.mid+'/s.jpg?time='+(new Date()).getTime())
                }
                k.e.load(function(){
                    $.ccio.mon[d.ke+d.mid+user.auth_token].jpegInterval=setTimeout(k.run,1000/k.jpegInterval);
                }).error(function(){
                    $.ccio.mon[d.ke+d.mid+user.auth_token].jpegInterval=setTimeout(k.run,1000/k.jpegInterval);
                })
                k.run()
            };
        break;
        case'jpegModeAll':
            $.each($.ccio.mon,function(n,v){
                $.ccio.init('jpegMode',v,user)
            });
        break;
        case'getLocation':
            var l = document.createElement("a");
            l.href = d;
            return l;
        break;
        case 'ls'://livestamp all
            g={e:jQuery('.livestamp')};
            g.e.each(function(){g.v=jQuery(this),g.t=g.v.attr('title');if(!g.t){return};g.v.toggleClass('livestamp livestamped').attr('title',$.ccio.init('t',g.t,user)).livestamp(g.t);})
            return g.e
        break;
        case't'://format time
            if(!d){d=new Date();}
            return $.ccio.timeObject(d).format('YYYY-MM-DD HH:mm:ss')
        break;
        case'th'://format time hy
            if(!d){d=new Date();}
            return $.ccio.timeObject(d).format('YYYY-MM-DDTHH:mm:ss')
        break;
        case'tf'://time to filename
            if(!d){d=new Date();}
            return $.ccio.timeObject(d).format('YYYY-MM-DDTHH-mm-ss')
        break;
        case'fn'://row to filename
            return $.ccio.init('tf',d.time,user)+'.'+d.ext
        break;
        case'filters':
            k.tmp='<option value="" selected>'+lang['Add New']+'</option>';
            $.each(user.details.filters,function(n,v){
                k.tmp+='<option value="'+v.id+'">'+v.name+'</option>'
            });
            $('#saved_filters').html(k.tmp)
        break;
        case'id':
            $('.usermail').html(d.mail)
            try{k.d=JSON.parse(d.details);}catch(er){k.d=d.details;}
            try{user.mon_groups=JSON.parse(k.d.mon_groups);}catch(er){}
            if(!user.mon_groups)user.mon_groups={};
            $.sM.reDrawMonGroups()
            $.each(user,function(n,v){$.sM.e.find('[name="'+n+'"]').val(v).change()})
            $.each(k.d,function(n,v){$.sM.e.find('[detail="'+n+'"]').val(v).change()})
            $.gR.drawList();
            $.ccio.pm('link-set',k.d.links,null,user)
        break;
        case'jsontoblock'://draw json as block
            if(d instanceof Object){
                $.each(d,function(n,v){
                    k.tmp+='<div>';
                    k.tmp+='<b>'+n+'</b> : '+$.ccio.init('jsontoblock',v,user);
                    k.tmp+='</div>';
                })
            }else{
                k.tmp+='<span>';
                k.tmp+=d;
                k.tmp+='</span>';
            }
        break;
        case'url':
            var porty
            if(d.port && d.port !== ''){
                porty = ':' + d.port
            }else{
                porty = ''
            }
            d.url = d.protocol + '://' + d.host + porty
            return d.url
        break;
        case'data-video':
            if(!d){
                $('[data-mid]').each(function(n,v){
                    v=$(v);v.attr('mid',v.attr('data-mid'))
                });
                $('[data-ke]').each(function(n,v){
                    v=$(v);v.attr('ke',v.attr('data-ke'))
                });
                $('[data-file]').each(function(n,v){
                    v=$(v);v.attr('file',v.attr('data-file'))
                });
                $('[data-status]').each(function(n,v){
                    v=$(v);v.attr('status',v.attr('data-status'))
                });
                $('[data-auth]').each(function(n,v){
                    v=$(v);v.attr('auth',v.attr('data-auth'))
                });
            }else{
                $('[data-ke="'+d.ke+'"][data-mid="'+d.mid+'"][data-file="'+d.filename+'"][auth="'+user.auth_token+'"]').attr('mid',d.mid).attr('ke',d.ke).attr('status',d.status).attr('file',d.filename).attr('auth',user.auth_token);
            }
        break;
        case'signal':
            d.mon=$.ccio.mon[d.ke+d.id+user.auth_token];d.e=$('#monitor_live_'+d.id+user.auth_token+' .signal').addClass('btn-success').removeClass('btn-danger');d.signal=parseFloat(JSON.parse(d.mon.details).signal_check);
            if(!d.signal||d.signal==NaN){d.signal=10;};d.signal=d.signal*1000*60;
            clearTimeout($.ccio.mon[d.ke+d.id+user.auth_token]._signal);$.ccio.mon[d.ke+d.id+user.auth_token]._signal=setTimeout(function(){d.e.addClass('btn-danger').removeClass('btn-success');},d.signal)
        break;
        case'signal-check':
            try{
            d.mon=$.ccio.mon[d.ke+d.id+user.auth_token];d.p=$('#monitor_live_'+d.id+user.auth_token);
                try{d.d=JSON.parse(d.mon.details)}catch(er){d.d=d.mon.details;}
            d.check={c:0};
            d.fn=function(){
                if(!d.speed){d.speed=1000}
                switch(d.d.stream_type){
                    case'b64':case'h265':
                        d.p.resize()
                    break;
                    case'hls':case'flv':case'mp4':
                        if(d.p.find('video')[0].paused){
                            if(d.d.signal_check_log==1){
                                d.log={type:'Stream Check',msg:lang.clientStreamFailedattemptingReconnect}
                                $.ccio.tm(4,d,'#logs,.monitor_item[mid="'+d.id+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"] .logs')
                            }
                            $.ccio.cx({f:'monitor',ff:'watch_on',id:d.id},user);
                        }else{
                            if(d.d.signal_check_log==1){
                                d.log={type:'Stream Check',msg:'Success'}
                                $.ccio.tm(4,d,'#logs,.monitor_item[mid="'+d.id+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"] .logs')
                            }
                            $.ccio.init('signal',d,user);
                        }
                    break;
                    default:
                        if($.ccio.op().jpeg_on===true){return}
                        $.ccio.snapshot(d,function(url){
                            d.check.f=url;
                            setTimeout(function(){
                                $.ccio.snapshot(d,function(url){
                                    if(d.check.f===url){
                                        if(d.check.c<3){
                                            ++d.check.c;
                                            setTimeout(function(){
                                                d.fn();
                                            },d.speed)
                                        }else{
                                            if(d.d.signal_check_log==1){
                                                d.log={type:'Stream Check',msg:'Client side ctream check failed, attempting reconnect.'}
                                                $.ccio.tm(4,d,'#logs,.monitor_item[mid="'+d.id+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"] .logs')
                                            }
                                            delete(d.check)
                                            $.ccio.cx({f:'monitor',ff:'watch_on',id:d.id},user);
                                        }
                                    }else{
                                        if(d.d.signal_check_log==1){
                                            d.log={type:'Stream Check',msg:'Success'}
                                            $.ccio.tm(4,d,'#logs,.monitor_item[mid="'+d.id+'"][ke="'+d.ke+'"][auth="'+user.auth_token+'"] .logs')
                                        }
                                        delete(d.check)
                                        $.ccio.init('signal',d,user);
                                    }
                                });
                            },d.speed)
                        });
                    break;
                }
            }
            d.fn();
            }catch(er){
                er=er.stack;
                d.in=function(x){return er.indexOf(x)>-1}
                switch(true){
                    case d.in("The HTMLImageElement provided is in the 'broken' state."):
                        delete(d.check)
                        $.ccio.cx({f:'monitor',ff:'watch_on',id:d.id},user);
                    break;
                    default:
                        $.ccio.log('signal-check',er)
                    break;
                }
                clearInterval($.ccio.mon[d.ke+d.id+user.auth_token].signal);delete($.ccio.mon[d.ke+d.id+user.auth_token].signal);
            }
        break;
    }
    return k.tmp;
}
