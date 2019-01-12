$(document).ready(function(e){
//POWER videos window
$.pwrvid={e:$('#pvideo_viewer')};
$.pwrvid.f=$.pwrvid.e.find('form'),
$.pwrvid.d=$('#vis_pwrvideo'),
$.pwrvid.mL=$('#motion_list'),
$.pwrvid.m=$('#vis_monitors'),
$.pwrvid.lv=$('#live_view'),
$.pwrvid.dr=$('#pvideo_daterange'),
$.pwrvid.vp=$('#video_preview'),
$.pwrvid.seekBar=$('#pwrvid_seekBar'),
$.pwrvid.seekBarProgress=$.pwrvid.seekBar.find('.progress-bar'),
$.pwrvid.playRate = 1;
$.pwrvid.dr.daterangepicker({
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
    $.pwrvid.drawTimeline()
    $.pwrvid.dr.focus()
});
$('#pvideo_show_events').change(function(){
    $.pwrvid.drawTimeline()
})
$.pwrvid.e.on('click','[preview]',function(e){
    e.e=$(this);
    e.video=$.pwrvid.vp.find('video')[0];
    if(e.video){
        e.duration=e.video.duration;
        e.now=e.video.currentTime;
    }
    if($.pwrvid.video){
        clearInterval($.pwrvid.video.interval);
    }
    switch(e.e.attr('preview')){
        case'fullscreen':
            $.ccio.init('fullscreen',e.video)
        break;
        case'mute':
            e.video.muted = !e.video.muted
            e.e.find('i').toggleClass('fa-volume-off fa-volume-up')
            e.e.toggleClass('btn-danger')
        break;
        case'play':
            e.video.playbackRate = 1;
            $.pwrvid.vpOnPlayPause(1)
        break;
        case'stepFrontFront':
            e.add=e.e.attr('add')
            e.stepFrontFront=parseInt(e.e.attr('stepFrontFront'))
            if(!e.stepFrontFront||isNaN(e.stepFrontFront)){e.stepFrontFront = 5}
            if(e.add==="0"){
                $.pwrvid.playRate = e.stepFrontFront
            }else{
                $.pwrvid.playRate += e.stepFrontFront
            }
            e.video.playbackRate = $.pwrvid.playRate;
            e.video.play()
        break;
        case'stepFront':
            e.video.currentTime += 1;
            e.video.pause()
        break;
        case'stepBackBack':
           $.pwrvid.video.interval = setInterval(function(){
               e.video.playbackRate = 1.0;
               if(e.video.currentTime == 0){
                   clearInterval($.pwrvid.video.interval);
                   e.video.pause();
               }
               else{
                   e.video.currentTime += -.2;
               }
           },30);
        break;
        case'stepBack':
            e.video.currentTime += -1;
            e.video.pause()
        break;
        case'video':
//            e.preventDefault();
            e.p=e.e.parents('[mid]');
            e.filename=e.p.attr('file');
            $.pwrvid.vp.find('h3').text(e.filename)
            e.href=e.e.attr('href');
            e.status=e.p.attr('status');
            e.mon=$.ccio.mon[e.p.attr('ke')+e.p.attr('mid')+$user.auth_token];
            $.pwrvid.vp.find('.holder').html('<video class="video_video" video="'+e.href+'"><source src="'+e.href+'" type="video/'+e.mon.ext+'"></video>');
            $.pwrvid.vp
                .attr('mid',e.mon.mid)
                .attr('mid',e.mon.user.auth_token)
                .attr('ke',e.mon.ke)
                .attr('status',e.status)
                .attr('file',e.filename)
                .find('[download],[video="download"]')
                .attr('download',e.filename)
                .attr('href',e.href)
                $.pwrvid.vp.find('video').off('loadeddata').on('loadeddata',function(){
                    $.pwrvid.vp.find('.stream-objects .stream-detected-object').remove()
                })
            if(e.status==1){
                $.get($.ccio.init('videoHrefToRead',e.href),function(d){

                })
            }
            var labels=[]
            var Dataset1=[]
            var events=$.pwrvid.currentDataObject[e.filename].motion
            var eventsLabeledByTime={}
            $.each(events,function(n,v){
                if(!v.details.confidence){v.details.confidence=0}
                var time=$.ccio.timeObject(v.time).format('MM/DD/YYYY HH:mm:ss')
                labels.push(time)
                Dataset1.push(v.details.confidence)
                eventsLabeledByTime[time]=v;
            })
            if(events.length>0){
                $.pwrvid.mL.html("<canvas></canvas>")
                var timeFormat = 'MM/DD/YYYY HH:mm:ss';
                var color = Chart.helpers.color;
                Chart.defaults.global.defaultFontColor = '#fff';
                var config = {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            type: 'line',
                            label: 'Motion Confidence',
                            backgroundColor: color(window.chartColors.red).alpha(0.2).rgbString(),
                            borderColor: window.chartColors.red,
                            data: Dataset1,
                        }]
                    },
                    options: {
                        maintainAspectRatio: false,
                        title: {
                            fontColor: "white",
                            text:"Events in this video"
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
                var ctx = $.pwrvid.mL.find('canvas')[0].getContext("2d");
                $.pwrvid.miniChart = new Chart(ctx, config);
                $.pwrvid.mL.find('canvas').click(function(f) {
                    var target = $.pwrvid.miniChart.getElementsAtEvent(f)[0];
                    if(!target){return false}
                    var video = $.pwrvid.currentDataObject[e.filename];
                    var event = video.motion[target._index];
                    var video1 = $('#video_preview video')[0];
                    video1.currentTime=$.ccio.timeObject(event.time).diff($.ccio.timeObject(video.row.time),'seconds')
                    video1.play()
                });
                var colorNames = Object.keys(window.chartColors);

            }else{
                $.pwrvid.mL.html('<div class="super-center text-center" style="width:auto">'+lang['No Events found for this video']+'</div>')
            }
            $.pwrvid.video={filename:e.filename,href:e.href,mid:e.mon.mid,ke:e.mon.ke}
            $.pwrvid.vpOnPlayPause=function(x,e){
              var e={}
                e.video=$.pwrvid.vp.find('video')[0]
                e.i=$.pwrvid.vp.find('[preview="play"]').find('i')
                if(e.video.paused===true){
                    e.i.removeClass('fa-pause').addClass('fa-play')
                    if(x==1)e.video.play();
                }else{
                    e.i.removeClass('fa-play').addClass('fa-pause')
                    if(x==1)e.video.pause();
                }
            }
            var videoElement=$.pwrvid.vp.find('video')[0]
            $.pwrvid.vp.find('video')
                .off('loadeddata').on('loadeddata', function() {
                    this.playbackRate = $.pwrvid.playRate;
                    this.play()
                })
                .off("pause").on("pause",$.pwrvid.vpOnPlayPause)
                .off("play").on("play",$.pwrvid.vpOnPlayPause)
                .off("timeupdate").on("timeupdate",function(){
                    var video = $.pwrvid.currentDataObject[e.filename];
                    var videoTime=$.ccio.timeObject(video.row.time).add(parseInt(videoElement.currentTime),'seconds').format('MM/DD/YYYY HH:mm:ss');
                    var event = eventsLabeledByTime[videoTime];
                    if(event){
                        if(event.details.plates){
                            console.log('licensePlateVideo',event)
                        }
                        if(event.details.matrices){
                            event.monitorDetails=JSON.parse(e.mon.details)
                            event.stream=$(videoElement)
                            event.streamObjects=$.pwrvid.vp.find('.stream-objects')
                            $.ccio.init('drawMatrices',event)
                        }
                        if(event.details.confidence){
                            $.pwrvid.vp.find('.motion-meter .progress-bar').css('width',event.details.confidence+'px').find('span').text(event.details.confidence)
                        }
                    }
                    var value= (( videoElement.currentTime / videoElement.duration ) * 100)+"%"
                    $.pwrvid.seekBarProgress.css("width",value);
                })
                $.pwrvid.seekBar.off("click").on("click", function(seek){
                    var offset = $(this).offset();
                    var left = (seek.pageX - offset.left);
                    var totalWidth = $.pwrvid.seekBar.width();
                    var percentage = ( left / totalWidth );
                    var vidTime = videoElement.duration * percentage;
                    videoElement.currentTime = vidTime;
                });
        break;
    }
})
$.pwrvid.drawTimeline=function(getData){
    var e={};
    $.pwrvid.e.find('.nodata').hide()
    if(getData===undefined){getData=true}
    var mid=$.pwrvid.m.val();
    $.pwrvid.e.find('.loading').show()
    e.live_header=$.pwrvid.lv.find('h3 span');
    e.live=$.pwrvid.lv.find('iframe');
    e.dateRange=$.pwrvid.dr.data('daterangepicker');
    e.videoLimit = $('#pvideo_video_limit').val();
    e.eventLimit = $('#pvideo_event_limit').val();
    if(e.eventLimit===''||isNaN(e.eventLimit)){e.eventLimit=500}
    if(e.videoLimit===''||isNaN(e.videoLimit)){e.videoLimit=0}

    var getTheData = function(){
        e.live_header.text($.ccio.mon[$user.ke+mid+$user.auth_token].name)
        e.live.attr('src',$.ccio.init('location',$user)+$user.auth_token+'/embed/'+$user.ke+'/'+mid+'/fullscreen|jquery|relative|gui')

        var pulseLoading = function(){
            var loading = $.pwrvid.e.find('.loading')
            var currentColor = loading.css('color')
            loading.animate('color','red')
            setTimeout(function(){
                loading.css('color',currentColor)
            },500)
        }
        if(getData===true){
            $.ccio.cx({
                f:'monitor',
                ff:'get',
                fff:'videos&events',
                videoLimit:e.videoLimit,
                eventLimit:e.eventLimit,
                startDate:$.ccio.init('th',e.dateRange.startDate),
                endDate:$.ccio.init('th',e.dateRange.endDate),
                ke:e.ke,
                mid:mid
            });
        }else{
            $.pwrvid.e.find('.loading').hide()
            e.next($.pwrvid.currentVideos,$.pwrvid.currentEvents)
        }
    }
    if(parseInt(e.eventLimit) >= 1000){
        $.confirm.e.modal('show');
        $.confirm.title.text(lang['Warning']+'!')
        e.html=lang.powerVideoEventLimit
        $.confirm.body.html(e.html)
        $.confirm.click({title:lang.Request,class:'btn-primary'},function(){
            getTheData()
        });
    }else{
        getTheData()
    }
}
$('#vis_monitors,#pvideo_event_limit,#pvideo_video_limit').change(function(){
    $.pwrvid.f.submit()
})
$.pwrvid.f.submit(function(e){
    e.preventDefault();
    $.pwrvid.drawTimeline()
    return false;
})
$.pwrvid.e.on('hidden.bs.modal',function(e){
    $(this).find('iframe').attr('src','about:blank')
    $.pwrvid.vp.find('.holder').empty()
    delete($.pwrvid.currentDataObject)
    delete($.pwrvid.currentData)
    $.pwrvid.mL.empty()
    $.pwrvid.d.empty()
})
})
