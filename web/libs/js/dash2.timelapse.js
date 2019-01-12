$(document).ready(function(e){
    //Timelapse Window
    $.timelapse={e:$('#timelapse')}
    $.timelapse.f=$.timelapse.e.find('form'),
    $.timelapse.meter=$.timelapse.e.find('.motion-meter'),
    $.timelapse.line=$('#timelapse_video_line'),
    $.timelapse.display=$('#timelapse_video_display'),
    $.timelapse.seekBar=$('#timelapse_seekBar'),
    $.timelapse.seekBarProgress=$.timelapse.seekBar.find('.progress-bar'),
    $.timelapse.dr=$('#timelapse_daterange'),
    $.timelapse.mL=$.timelapse.e.find('.motion_list'),
    $.timelapse.monitors=$.timelapse.e.find('.monitors_list');
    $.timelapse.playDirection='videoAfter'
    $.timelapse.playRate=15
    $.timelapse.placeholder=placeholder.getData(placeholder.plcimg({bgcolor:'#b57d00',text:'...'}))
    $.timelapse.dr.daterangepicker({
        startDate:$.ccio.timeObject().subtract(moment.duration("24:00:00")),
        endDate:$.ccio.timeObject().add(moment.duration("24:00:00")),
        timePicker: true,
        timePicker24Hour: true,
        timePickerSeconds: true,
        timePickerIncrement: 30,
        locale: {
            format: 'MM/DD/YYYY h:mm A'
        }
    },function(start, end, label){
        $.timelapse.drawTimeline()
        $.timelapse.dr.focus()
    });
    $.timelapse.f.find('input,select').change(function(){
        $.timelapse.f.submit()
    })
    $.timelapse.f.submit(function(e){
        e.preventDefault();
        $.timelapse.drawTimeline()
        return false;
    })
    $.timelapse.drawTimeline=function(getData){
        var e={};
        if(getData===undefined){getData=true}
        var mid = $.timelapse.monitors.val()
        e.dateRange=$.timelapse.dr.data('daterangepicker');
        e.dateRange={startDate:e.dateRange.startDate,endDate:e.dateRange.endDate}
        e.videoURL=$.ccio.init('location',$user)+$user.auth_token+'/videos/'+$user.ke+'/'+mid;
        e.videoURL+='?limit=100&start='+$.ccio.init('th',e.dateRange.startDate)+'&end='+$.ccio.init('th',e.dateRange.endDate);
        e.next=function(videos){
            $.timelapse.currentVideos={}
            e.tmp=''
            $.each(videos.videos,function(n,v){
                if(!v||!v.time){return}
    //            v.filename=$.ccio.init('tf',v.time)+'.'+v.ext;
                v.videoBefore=videos.videos[n-1];
                v.videoAfter=videos.videos[n+1];
    //            if(v.href.charAt(0)==='/'){
    //                v.href=$.ccio.init('location',user)+(v.href.substring(1))
    //                v.videoURL=$.ccio.init('location',user)+(v.videoURL.substring(1))
    //            }
                v.position=n;
                $.timelapse.currentVideos[v.filename]=v;
                e.tmp+='<li class="glM'+v.mid+$user.auth_token+' list-group-item timelapse_video flex-block" timelapse="video" file="'+v.filename+'" href="'+v.href+'" mid="'+v.mid+'" ke="'+v.ke+'" auth="'+$user.auth_token+'">'
                e.tmp+='<div class="flex-block">'
                e.tmp+='<div class="flex-unit-3"><div class="frame" style="background-image:url('+$.timelapse.placeholder+')"></div></div>'
                e.tmp+='<div class="flex-unit-3"><div><span title="'+v.time+'" class="livestamp"></span></div><div>'+v.filename+'</div></div>'
                e.tmp+='<div class="flex-unit-3 text-right"><a class="btn btn-default" download="'+v.mid+'-'+v.filename+'" href="'+v.href+'">&nbsp;<i class="fa fa-download"></i>&nbsp;</a> <a class="btn btn-danger" video="delete" href="'+$.ccio.init('videoHrefToDelete',v.href)+'">&nbsp;<i class="fa fa-trash-o"></i>&nbsp;</a></div>'
                e.tmp+='</div>'
                e.tmp+='<div class="flex-block">'
                e.tmp+='<div class="flex-unit-3"><div class="progress"><div class="progress-bar progress-bar-primary" role="progressbar" style="width:0%"></div></div></div>'
                e.tmp+='</div>'
                e.tmp+='</li>'
            })
            $.timelapse.line.html(e.tmp)
            $.ccio.init('ls')
            if(getData===true){
                e.timeout=50
            }else{
                e.timeout=2000
            }
            setTimeout(function(){
                if($.timelapse.e.find('.timelapse_video.active').length===0){
                    $.timelapse.e.find('[timelapse="video"]').first().click()
                }
            },e.timeout)
        }
        if(getData===true){
            $.getJSON(e.videoURL,function(videos){
                videos.videos=videos.videos.reverse()
                $.timelapse.currentVideosArray=videos
                e.next(videos)
            })
        }else{
            e.next($.timelapse.currentVideosArray)
        }
    }
    $.timelapse.playButtonIcon = $.timelapse.e.find('[timelapse="play"]').find('i')
    $.timelapse.timelapseSpeedUseBasicSwitch = $('#timelapseSpeedUseBasic')
    $.timelapse.timelapseSpeedUseBasicSwitch.on('change',function(){
        var el = $.timelapse.e.find('.timelapseSpeedUseBasicSwitch')
        if($(this).is(':checked')){
            el.hide()
        }else{
            el.show()
        }
        $.timelapse.play()
    })
    $.timelapse.getUseBasicStatus = function(){return $.timelapse.timelapseSpeedUseBasicSwitch.prop('checked')}
    $.timelapse.onPlayPause = function(toggleGui,secondWind){
        if($.timelapse.paused === true){
            $.timelapse.paused = false
            if(toggleGui === true)$.timelapse.play();
        }else{
            $.timelapse.paused = true
            if(toggleGui === true)$.timelapse.pause(secondWind);
        }
    }
    $.timelapse.pause = function(secondWind){
        //secondWind is used because sometimes pause can be pressed just as a video ends and the pause command does not register on the next video.
        var videoNow = $.timelapse.display.find('video.videoNow')[0]
        var pause = function(){
            if(videoNow.paused == false)videoNow.pause()
            clearInterval($.timelapse.interval)
            $.timelapse.playButtonIcon.removeClass('fa-pause').addClass('fa-play')
        }
        pause()
        if(secondWind === true)setTimeout(pause,250);
    }
    $.timelapse.play = function(x){
        var videoNow = $.timelapse.display.find('video.videoNow')[0]
        $.timelapse.pause()
        clearInterval($.timelapse.interval)
        if($.timelapse.getUseBasicStatus()){
            videoNow.playbackRate = $.timelapse.playRate
            if(videoNow.paused)videoNow.play()
        }else{
            videoNow.playbackRate = 1.0
            $.timelapse.interval = setInterval(function(){
               if(videoNow.currentTime >= videoNow.duration - .2){
                   clearInterval($.timelapse.interval)
                   videoNow.currentTime = videoNow.duration
               }else{
                   videoNow.currentTime += .5
               }
            },500 / $.timelapse.playRate)
        }
        $.timelapse.playButtonIcon.removeClass('fa-play').addClass('fa-pause')
    }
    $.timelapse.rewind = function(e){
        var videoNow = $.timelapse.display.find('video.videoNow')[0]
        $.timelapse.pause()
        videoNow.playbackRate = 1.0
        clearInterval($.timelapse.interval)
        $.timelapse.interval = setInterval(function(){
           if(videoNow.currentTime <= 0.2){
               clearInterval($.timelapse.interval)
               videoNow.currentTime = 0
               $('[timelapse][href="'+e.videoCurrentBefore.attr('video')+'"]').click()
               var videoNowNew = $.timelapse.display.find('video.videoNow')[0]
               videoNowNew.pause()
               videoNowNew.currentTime = videoNowNew.duration - 0.1
               $.timelapse.e.find('[timelapse="stepBackBack"]').click()
           }else{
               videoNow.currentTime += -.5
           }
        },500 / $.timelapse.playRate)
        $.timelapse.playButtonIcon.removeClass('fa-play').addClass('fa-pause')
    }
    $.timelapse.e.on('click','[timelapse]',function(){
        var e={}
        e.e=$(this)
        e.videoCurrentNow=$.timelapse.display.find('.videoNow')
        e.videoCurrentAfter=$.timelapse.display.find('.videoAfter')
        e.videoCurrentBefore=$.timelapse.display.find('.videoBefore')
        if($.timelapse.videoInterval){
            clearInterval($.timelapse.videoInterval);
        }
        switch(e.e.attr('timelapse')){
            case'download':
                $.timelapse.line.find('.active [download]').click()
            break;
            case'mute':
                e.videoCurrentNow[0].muted = !e.videoCurrentNow[0].muted
                $.timelapse.videoNowIsMuted = e.videoCurrentNow[0].muted
                e.e.find('i').toggleClass('fa-volume-off fa-volume-up')
                e.e.toggleClass('btn-danger')
            break;
            case'play':
                e.videoCurrentNow[0].playbackRate = $.timelapse.playRate;
                $.timelapse.onPlayPause(true,true)
            break;
            case'setPlayBackRate':
                $.timelapse.pause()
                $.timelapse.playRate = parseFloat(e.e.attr('playRate'))
                $.timelapse.play()
            break;
            case'stepFrontFront':
                e.add=e.e.attr('add')
                e.stepFrontFront=parseInt(e.e.attr('stepFrontFront'))
                if(!e.stepFrontFront||isNaN(e.stepFrontFront)){e.stepFrontFront = 5}
                if(e.add==="0"){
                    $.timelapse.playRate = e.stepFrontFront
                }else{
                    $.timelapse.playRate += e.stepFrontFront
                }
                e.videoCurrentNow[0].playbackRate = $.timelapse.playRate;
                e.videoCurrentNow[0].play()
            break;
            case'stepFront':
                e.videoCurrentNow[0].currentTime += 5;
                e.videoCurrentNow[0].pause()
            break;
            case'stepBackBack':
    //            e.videoCurrentNow=$.timelapse.display.find('.videoNow')
    //            e.videoCurrentAfter=$.timelapse.display.find('.videoAfter')
    //            e.videoCurrentBefore=$.timelapse.display.find('.videoBefore')
               $.timelapse.rewind(e)
            break;
            case'stepBack':
                e.videoCurrentNow[0].currentTime += -5;
                e.videoCurrentNow[0].pause()
            break;
            case'video':
                $.timelapse.e.find('video').each(function(n,v){
                    v.pause()
                })
                e.drawVideoHTML=function(position){
                    var video
                    var exisitingElement=$.timelapse.display.find('.'+position)
                    if(position){
                        video=e.video[position]
                    }else{
                        position='videoNow'
                        video=e.video
                    }
                    if(video){
                       $.timelapse.display.append('<video class="video_video '+position+'" video="'+video.href+'" preload><source src="'+video.href+'" type="video/'+video.ext+'"></video>')
                    }
                }
                e.filename=e.e.attr('file')
                e.video=$.timelapse.currentVideos[e.filename]
                e.videoIsSame=(e.video.href==e.videoCurrentNow.attr('video'))
                e.videoIsAfter=(e.video.href==e.videoCurrentAfter.attr('video'))
                e.videoIsBefore=(e.video.href==e.videoCurrentBefore.attr('video'))
                if(e.videoIsSame||e.videoIsAfter||e.videoIsBefore){
                    switch(true){
                        case e.videoIsSame:
                            $.ccio.log('$.timelapse','videoIsSame')
                            e.videoNow=$.timelapse.display.find('video.videoNow')
                            if(e.videoNow[0].paused===true){
                                e.videoNow[0].play()
                            }else{
                                e.videoNow[0].pause()
                            }
                            return
                        break;
                        case e.videoIsAfter:
                            $.ccio.log('$.timelapse','videoIsAfter')
                            e.videoCurrentBefore.remove()
                            e.videoCurrentAfter.removeClass('videoAfter').addClass('videoNow')
                            e.videoCurrentNow.removeClass('videoNow').addClass('videoBefore')
                            e.drawVideoHTML('videoAfter')
                        break;
                        case e.videoIsBefore:
                            $.ccio.log('$.timelapse','videoIsBefore')
                            e.videoCurrentAfter.remove()
                            e.videoCurrentBefore.removeClass('videoBefore').addClass('videoNow')
                            e.videoCurrentNow.removeClass('videoNow').addClass('videoAfter')
                            e.drawVideoHTML('videoBefore')
                        break;
                    }
                }else{
                    $.ccio.log('$.timelapse','newSetOf3')
                    $.timelapse.display.empty()
                    e.drawVideoHTML()//videoNow
                    e.drawVideoHTML('videoBefore')
                    e.drawVideoHTML('videoAfter')
                }
                $.timelapse.display.find('video').each(function(n,v){
                    v.addEventListener('loadeddata', function() {
                        e.videoCurrentAfterPreview=$('.timelapse_video[href="'+$(v).attr('video')+'"] .frame')
                        if(e.videoCurrentAfterPreview.attr('set')!=='1'){
                            $.ccio.snapshotVideo(v,function(url,buffer){
                                e.videoCurrentAfterPreview.attr('set','1').css('background-image','url('+url+')')
                                if($(v).hasClass('videoAfter')){
                                    v.currentTime=0
                                    v.pause()
                                }
                            })
                        }
                    }, false);
                })
                e.videoNow=$.timelapse.display.find('video.videoNow')[0]
                if($.timelapse.videoNowIsMuted){
                    e.videoNow.muted=true
                }
                $.timelapse.playButtonIcon.removeClass('fa-pause').addClass('fa-play')
                $.timelapse.onended = function() {
                    $.timelapse.line.find('[file="'+e.video[$.timelapse.playDirection].filename+'"]').click()
                };
                e.videoNow.onended = $.timelapse.onended
                e.videoNow.onerror = $.timelapse.onended
                //
                $(e.videoNow)
                .off('play').on('play',$.timelapse.play)
                .off('pause').on('pause',$.timelapse.onPlayPause)
                .off('timeupdate').on('timeupdate',function(){
                    var value= (( e.videoNow.currentTime / e.videoNow.duration ) * 100)+"%"
                    $.timelapse.seekBarProgress.css("width",value);
                    $.timelapse.e.find('.timelapse_video[file="'+e.filename+'"] .progress-bar').css("width",value);
                })
                $.timelapse.play()
                $.timelapse.seekBar.off("click").on("click", function(seek){
                    var offset = $(this).offset();
                    var left = (seek.pageX - offset.left);
                    var totalWidth = $.timelapse.seekBar.width();
                    var percentage = ( left / totalWidth );
                    var vidTime = e.videoNow.duration * percentage;
                    e.videoNow.currentTime = vidTime;
                });

                $.ccio.log('$.timelapse',e.video)
                $.timelapse.line.find('.timelapse_video').removeClass('active')
                e.videoCurrentNow=$.timelapse.display.find('.videoNow')
                e.e.addClass('active')
                if ($('#timelapse_video_line:hover').length === 0) {
                    $.timelapse.line.animate({scrollTop:$.timelapse.line.scrollTop() + e.e.position().top - $.timelapse.line.height()/2 + e.e.height()/2 - 40});
                }
            break;
        }
        $.timelapse.e.find('.timelapse_playRate').text('x'+$.timelapse.playRate)
    })
    $.timelapse.e.on('hidden.bs.modal',function(e){
        delete($.timelapse.currentVideos)
        delete($.timelapse.currentVideosArray)
    })
})
