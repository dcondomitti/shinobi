$(document).ready(function(e){
    console.log("%cWarning!", "font: 2em monospace; color: red;");
    console.log('%cLeaving the developer console open is fine if you turn off "Network Recording". This is because it will keep a log of all files, including frames and videos segments.', "font: 1.2em monospace; ");
    if(!$.ccio.permissionCheck('monitor_create')){
        $('#add_monitor_button_main').remove()
    }
    $.each(['user_change','monitor_create','view_logs'],function(n,permission){
        if(!$.ccio.permissionCheck(permission)){
            $('.permission_'+permission).remove()
        }
    })

    //Group Selector
    $.gR={e:$('#group_list'),b:$('#group_list_button')};
    $.gR.drawList=function(){
      var e={};
        e.tmp='';
        $.each($.ccio.init('monGroup'),function(n,v){
            if($user.mon_groups[n]){
               e.tmp+='<li class="mdl-menu__item" groups="'+n+'">'+$user.mon_groups[n].name+'</li>'
            }
        })
        $.gR.e.html(e.tmp)
    }
    $.gR.e.on('click','[groups]',function(){
      var e={};
        e.e=$(this),
        e.a=e.e.attr('groups');
        var user=$.users[e.e.attr('auth')];
        if(!user){user=$user}
        if(user===$user){
            e.chosen_set='watch_on'
        }else{
            e.chosen_set='watch_on_links'
        }
        $.each($.ccio.op()[e.chosen_set],function(n,v){
            $.each(v,function(m,b){
                $.ccio.cx({f:'monitor',ff:'watch_off',id:m,ke:n},user)
            })
        })
        $.each($.ccio.mon_groups[e.a],function(n,v){
            $.ccio.cx({f:'monitor',ff:'watch_on',id:v.mid,ke:v.ke},user)
        })
    })


    //open all monitors
    $('[class_toggle="list-blocks"][data-target="#left_menu"]').dblclick(function(){
        $('#monitors_list .monitor_block').each(function(n,v){
            var el = $(v)
            var ke = el.attr('ke')
            var mid = el.attr('mid')
            var auth = el.attr('auth')
            var monItem = $('.monitor_item[ke='+ke+'][mid='+mid+'][auth='+auth+']')
            if(monItem.length > 0){
                monItem.find('[monitor="watch_on"]').click()
            }else{
                el.find('[monitor="watch"]').click()
            }
        })
    })
    //search monitors list
    $('#monitors_list_search').keyup(function(){
        var monitorBlocks = $('.monitor_block');
        var searchTerms = $(this).val().toLowerCase().split(' ')
        if(searchTerms.length === 0 || searchTerms[0] === ''){
            monitorBlocks.show()
            return
        }
        monitorBlocks.hide()
        $.each($.ccio.mon,function(n,monitor){
            var searchThis = JSON.stringify($.ccio.init('cleanMon',monitor)).toLowerCase().replace('"','');
            $.each(searchTerms,function(m,term){
                if(searchThis.indexOf(term) >-1 ){
                    $('.monitor_block[ke="'+monitor.ke+'"][mid="'+monitor.mid+'"]').show()
                }
            })
        })
    })
    //dynamic bindings
    $.ccio.windowFocus = true
    $(window).focus(function() {
        $.ccio.windowFocus = true
        clearInterval($.ccio.soundAlarmInterval)
    }).blur(function() {
        $.ccio.windowFocus = false
    });
    $('body')
    .on('click','.logout',function(e){
        var logout = function(user,callback){
            $.get($.ccio.init('location',user)+user.auth_token+'/logout/'+user.ke+'/'+user.uid,callback)
        }
        $.each($.users,function(n,linkedShinobiUser){
            logout(linkedShinobiUser,function(){});
        })
        logout($user,function(data){
            console.log(data)
            localStorage.removeItem('ShinobiLogin_'+location.host);
            location.href=location.href;
        });
    })
    .on('click','[video]',function(e){
        e.e=$(this),
        e.a=e.e.attr('video'),
        e.p=e.e.parents('[mid]'),
        e.ke=e.p.attr('ke'),
        e.mid=e.p.attr('mid'),
        e.file=e.p.attr('file');
        e.auth=e.p.attr('auth');
        e.status=e.p.attr('status');
        if(!e.ke||!e.mid){
            //for calendar plugin
            e.p=e.e.parents('[data-mid]'),
            e.ke=e.p.data('ke'),
            e.mid=e.p.data('mid'),
            e.file=e.p.data('file');
            e.auth=e.p.data('auth');
            e.status=e.p.data('status');
        }
        e.mon=$.ccio.mon[e.ke+e.mid+e.auth];
        switch(e.a){
            case'launch':
                e.preventDefault();
                e.href=$(this).attr('href')
                var el = $('#video_viewer')
                var modalBody = el.find('.modal-body')
                el.find('.modal-title span').html(e.mon.name+' - '+e.file)
                var html = '<video class="video_video" video="'+e.href+'" autoplay loop controls><source src="'+e.href+'" type="video/'+e.mon.ext+'"></video><br><small class="msg"></small>'
                modalBody.html(html)
                el.find('video')[0].onerror = function(){
                    modalBody.find('.msg').text(lang.h265BrowserText1)
                }
                el.attr('mid',e.mid);
                footer = el.find('.modal-footer');
                footer.find('.download_link').attr('href',e.href).attr('download',e.file);
                footer.find('[monitor="download"][host="dropbox"]').attr('href',e.href);
                el.modal('show')
                    .attr('ke',e.ke)
                    .attr('mid',e.mid)
                    .attr('auth',e.auth)
                    .attr('file',e.file);
                if(e.status==1){
                    $.get($.ccio.init('videoHrefToRead',e.href),function(d){
                        if(d.ok !== true)console.log(d,new Error())
                    })
                }
            break;
            case'delete':
                e.preventDefault();
                var videoLink = e.p.find('[download]').attr('href')
                var href = $(this).attr('href')
                console.log('videoLink',videoLink)
                console.log(href)
                if(!href){
                    href = $.ccio.init('location',$.users[e.auth])+e.auth+'/videos/'+e.ke+'/'+e.mid+'/'+e.file+'/delete<% if(config.useUTC === true){%>?isUTC=true<%}%>'
                }
                console.log(href)
                $.confirm.e.modal('show');
                $.confirm.title.text(lang['Delete Video']+' : '+e.file)
                e.html=lang.DeleteVideoMsg
                e.html+='<video class="video_video" autoplay loop controls><source src="'+videoLink+'" type="video/'+e.mon.ext+'"></video>';
                $.confirm.body.html(e.html)
                $.confirm.click({title:'Delete Video',class:'btn-danger'},function(){
                    $.getJSON(href,function(d){
                        $.ccio.log(d)
                    })
                });
            break;
            case'download':
                e.preventDefault();
                switch(e.e.attr('host')){
                    case'dropbox':
                        if($.ccio.DropboxAppKey){
                            Dropbox.save(e.e.attr('href'),e.e.attr('download'),{progress: function (progress) {$.ccio.log(progress)},success: function () {
                                $.ccio.log(lang.dropBoxSuccess);
                            }});
                        }
                    break;
                }
            break;
        }
    })
    .on('change','[localStorage]',function(){
        e = {}
        e.e=$(this)
        e.localStorage = e.e.attr('localStorage')
        e.value = e.e.val()
        $.ccio.op(e.localStorage,e.value)
    })
    .on('click','[system]',function(e){
      var e={};
        e.e=$(this),
        e.a=e.e.attr('system');//the function
        switch(e.a){
            case'switch':
                e.switch=e.e.attr('switch');
                e.o=$.ccio.op().switches
                if(!e.o){
                    e.o={}
                }
                if(!e.o[e.switch]){
                    e.o[e.switch]=0
                }
                if(e.o[e.switch]===1){
                    e.o[e.switch]=0
                }else{
                    e.o[e.switch]=1
                }
                $.ccio.op('switches',e.o)
                switch(e.switch){
                    case'monitorOrder':
                        if(e.o[e.switch] !== 1){
                            $('.monitor_item').attr('data-gs-auto-position','yes')
                        }else{
                            $('.monitor_item').attr('data-gs-auto-position','no')
                        }
                    break;
                    case'monitorMuteAudio':
                        $('.monitor_item video').each(function(n,el){
                            if(e.o[e.switch] === 1){
                                el.muted = true
                            }else{
                                el.muted = false
                            }
                        })
                    break;
                }
                switch(e.e.attr('type')){
                    case'text':
                        if(e.o[e.switch]===1){
                            e.e.addClass('text-success')
                        }else{
                            e.e.removeClass('text-success')
                        }
                    break;
                }
            break;
            case'cronStop':
                $.ccio.cx({f:'cron',ff:'stop'})
            break;
            case'cronRestart':
                $.ccio.cx({f:'cron',ff:'restart'})
            break;
            case'jpegToggle':
                e.cx={f:'monitor',ff:'jpeg_on'};
                if($.ccio.op().jpeg_on===true){
                    e.cx.ff='jpeg_off';
                }
                $.ccio.cx(e.cx)
            break;
        }
    })
    .on('click','[class_toggle]',function(e){
        e.e=$(this);
        e.n=e.e.attr('data-target');
        e.v=e.e.attr('class_toggle');
        e.o=$.ccio.op().class_toggle;
        if($(e.n).hasClass(e.v)){e.t=0}else{e.t=1}
        if(!e.o)e.o={};
        e.o[e.n]=[e.v,e.t];
        $.ccio.op('class_toggle',e.o)
        $(e.n).toggleClass(e.v);
    })
    .on('change','[dropdown_toggle]',function(e){
        e.e=$(this);
        e.n=e.e.attr('dropdown_toggle');
        e.v=e.e.val();
        e.o=$.ccio.op().dropdown_toggle;
        if(!e.o)e.o={};
        e.o[e.n]=e.v;
        $.ccio.op('dropdown_toggle',e.o)
    })
    //monitor functions
    .on('click','[monitor]',function(){
      var e={};
        e.e=$(this),
            e.a=e.e.attr('monitor'),//the function
            e.p=e.e.parents('[mid]'),//the parent element for monitor item
            e.ke=e.p.attr('ke'),//group key
            e.mid=e.p.attr('mid'),//monitor id
            e.auth=e.p.attr('auth'),//authkey
            e.mon=$.ccio.mon[e.ke+e.mid+e.auth];//monitor configuration
            var user
            if($.users[e.auth]){user=$.users[e.auth]}else{user=$user}
            if(!user){
                user=$user
            }
        switch(e.a){
            case'show_data':
                e.p.toggleClass('show_data')
                var dataBlocks = e.p.find('.stream-block,.mdl-data_window')
                if(e.p.hasClass('show_data')){
                    dataBlocks.addClass('col-md-6').removeClass('col-md-12')
                }else{
                    dataBlocks.addClass('col-md-12').removeClass('col-md-6')
                }
            break;
            case'motion':
                if(!e.mon.motionDetectionRunning){
                    $.ccio.init('streamMotionDetectOn',e,user)
                }else{
                    $.ccio.init('streamMotionDetectOff',e,user)
                }
            break;
            case'pop':
                e.fin=function(img){
                    if($.ccio.mon[e.ke+e.mid+user.auth_token].popOut){
                        $.ccio.mon[e.ke+e.mid+user.auth_token].popOut.close()
                    }
                    $.ccio.mon[e.ke+e.mid+user.auth_token].popOut = window.open($.ccio.init('location',user)+user.auth_token+'/embed/'+e.ke+'/'+e.mid+'/fullscreen|jquery|relative|gui','pop_'+e.mid+user.auth_token,'height='+img.height+',width='+img.width);
                }
                if(e.mon.watch===1){
                    $.ccio.snapshot(e,function(url){
                        $('#temp').html('<img>')
                        var img=$('#temp img')[0]
                        img.onload=function(){
                            e.fin(img)
                        }
                        img.src=url
                    })
                }else{
                    var img={height:720,width:1280}
                    e.fin(img)
                }
            break;
            case'mode':
                e.mode=e.e.attr('mode')
                if(e.mode){
                    $.getJSON($.ccio.init('location',user)+user.auth_token+'/monitor/'+e.ke+'/'+e.mid+'/'+e.mode,function(d){
                        $.ccio.log(d)
                    })
                }
            break;
            case'timelapse':
                $.timelapse.e.modal('show')
                $.timelapse.monitors.find('.monitor').remove()
                $.each($.ccio.mon,function(n,v){
                    $.timelapse.monitors.append('<option class="monitor" value="'+v.mid+'">'+v.name+'</option>')
                })
                e.e=$.timelapse.monitors.find('.monitor').prop('selected',false)
                if(e.mid!==''){
                    e.e=$.timelapse.monitors.find('.monitor[value="'+e.mid+'"]')
                }
                e.e.first().prop('selected',true)
                $.timelapse.f.submit()
            break;
            case'powerview':
                $.pwrvid.e.modal('show')
                $.pwrvid.m.empty()
                $.each($.ccio.mon,function(n,v){
                    $.pwrvid.m.append('<option value="'+v.mid+'">'+v.name+'</option>')
                })
                e.e=$.pwrvid.m.find('option').prop('selected',false)
                if(e.mid!==''){
                    e.e=$.pwrvid.m.find('[value="'+e.mid+'"]')
                }
                e.e.first().prop('selected',true)
                $.pwrvid.f.submit()
            break;
            case'region':
                if(!e.mon){
                    $.ccio.init('note',{title:lang['Unable to Launch'],text:lang.UnabletoLaunchText,type:'error'});
                    return;
                }
                e.d=JSON.parse(e.mon.details);
                e.width=$.aM.e.find('[detail="detector_scale_x"]');
                e.height=$.aM.e.find('[detail="detector_scale_y"]');
                e.d.cords=$.aM.e.find('[detail="cords"]').val();
                if(e.width.val()===''){
                    e.d.detector_scale_x=320;
                    e.d.detector_scale_y=240;
                    $.aM.e.find('[detail="detector_scale_x"]').val(e.d.detector_scale_x);
                    $.aM.e.find('[detail="detector_scale_y"]').val(e.d.detector_scale_y);
                }else{
                    e.d.detector_scale_x=e.width.val();
                    e.d.detector_scale_y=e.height.val();
                }

                $.zO.e.modal('show');
                $.zO.o().attr('width',e.d.detector_scale_x).attr('height',e.d.detector_scale_y);
                $.zO.c.css({width:e.d.detector_scale_x,height:e.d.detector_scale_y});
                    if(e.d.cords&&(e.d.cords instanceof Object)===false){
                    try{e.d.cords=JSON.parse(e.d.cords);}catch(er){}
                }
                if(!e.d.cords||e.d.cords===''){
                    e.d.cords={
                        red:{ name:"red",sensitivity:0.0005, max_sensitivity:"",color_threshold:"",points:[[0,0],[0,100],[100,0]] },
                    }
                }
                $.zO.regionViewerDetails=e.d;
                $.zO.initRegionList()
            break;
            case'detector_filters':
                $.detectorFilters.e.modal('show');
            break;
            case'snapshot':
                $.ccio.snapshot(e,function(url){
                    $('#temp').html('<a href="'+url+'" download="'+$.ccio.init('tf')+'_'+e.ke+'_'+e.mid+'.jpg">a</a>').find('a')[0].click();
                });
            break;
            case'control':
                e.a=e.e.attr('control')
                $.ccio.cx({f:'monitor',ff:'control',direction:e.a,mid:e.mid,ke:e.ke},user)
            break;
            case'videos_table':case'calendar':case'video_grid'://call videos table or calendar or video grid
                $.vidview.launcher=$(this);
                e.limit=$.vidview.limit.val();
                if(!$.vidview.current_mid||$.vidview.current_mid!==e.mid){
                    $.vidview.current_mid=e.mid
                    $.vidview.current_page=1;
                    if(e.limit.replace(/ /g,'')===''){
                        e.limit='100';
                    }
                    if(e.limit.indexOf(',')===-1){
                        e.limit='0,'+e.limit
                    }else{
                        e.limit='0,'+e.limit.split(',')[1]
                    }
                    if(e.limit=='0,0'){
                        e.limit='0'
                    }
                    $.vidview.limit.val(e.limit)
                }
                e.dateRange=$('#videos_viewer_daterange').data('daterangepicker');
                var videoSet = 'videos'
                switch($.vidview.set.val()){
                    case'cloud':
                        videoSet = 'cloudVideos'
                    break;
                }
                e.videoURL=$.ccio.init('location',user)+user.auth_token+'/'+videoSet+'/'+e.ke+'/'+e.mid+'?limit='+e.limit+'&start='+$.ccio.init('th',e.dateRange.startDate)+'&end='+$.ccio.init('th',e.dateRange.endDate);
                $.getJSON(e.videoURL,function(d){
                    d.pages=d.total/100;
                    $('.video_viewer_total').text(d.total)
                    if(d.pages+''.indexOf('.')>-1){++d.pages}
                    $.vidview.page_count=d.pages;
                    d.count=1
                    $.vidview.pages.empty()
                    d.fn=function(drawOne){
                        if(d.count<=$.vidview.page_count){
                            $.vidview.pages.append('<a class="btn btn-primary" page="'+d.count+'">'+d.count+'</a> ')
                            ++d.count;
                            d.fn()
                        }
                    }
                    d.fn()
                    $.vidview.pages.find('[page="'+$.vidview.current_page+'"]').addClass('active')
                    e.v=$.vidview.e;
                    $.vidview.loadedVideos = {}
                    e.b=e.v.modal('show').find('.modal-body .contents');
                    e.t=e.v.find('.modal-title i');
                    switch(e.a){
                        case'calendar':
                           $.vidview.e.removeClass('dark')
                           e.t.attr('class','fa fa-calendar')
                           e.ar=[];
                            if(d.videos[0]){
                                $.each(d.videos,function(n,v){
                                    if(v.status !== 0){
                                        $.vidview.loadedVideos[v.filename] = Object.assign(v,{})
                                        var n=$.ccio.mon[v.ke+v.mid+user.auth_token];
                                        if(n){v.title=n.name+' - '+(parseInt(v.size)/1000000).toFixed(2)+'mb';}
                                        v.start=v.time;
    //                                    v.filename=$.ccio.init('tf',v.time)+'.'+v.ext;
                                        e.ar.push(v);
                                    }
                                })
                                e.b.html('')
                                try{e.b.fullCalendar('destroy')}catch(er){}
                                e.b.fullCalendar({
                                    header: {
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: 'month,agendaWeek,agendaDay,listWeek'
                                    },
                                    defaultDate: $.ccio.timeObject(d.videos[0].time).format('YYYY-MM-DD'),
                                    navLinks: true,
                                    eventLimit: true,
                                    events:e.ar,
                                    eventClick:function(f){
                                        $('#temp').html('<div mid="'+f.mid+'" ke="'+f.ke+'" auth="'+user.auth_token+'" file="'+f.filename+'"><div video="launch" href="'+$.ccio.init('videoUrlBuild',f)+'"></div></div>').find('[video="launch"]').click();
                                        $(this).css('border-color', 'red');
                                    }
                                });
                                setTimeout(function(){e.b.fullCalendar('changeView','month');e.b.find('.fc-scroller').css('height','auto')},500)
                            }else{
                                e.b.html('<div class="text-center">'+lang.NoVideosFoundForDateRange+'</div>')
                            }
                        break;
                        case'video_grid':
                            $.vidview.e.addClass('dark')
                            var tmp = '<di class="video_grid row">';
                            $.each(d.videos,function(n,v){
                                var href = $.ccio.init('videoUrlBuild',v)
                                v.mon = $.ccio.mon[v.ke+v.mid+user.auth_token]
                                var parentTag = 'ke="'+v.ke+'" status="'+v.status+'" mid="'+v.mid+'" file="'+v.filename+'" auth="'+v.mon.user.auth_token+'"'
                                tmp += '<div class="col-md-2" '+parentTag+'>'
                                    tmp += '<div class="thumb">'
                                        tmp += '<div class="title-strip">'+$.ccio.timeObject(v.time).format('h:mm:ss A, MMMM Do YYYY')+'</div>'
                                        tmp += '<div class="button-strip">'
                                            tmp += '<div class="btn-group">'
                                                tmp += '<a class="btn btn-xs btn-primary" video="launch" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a>'
                                                tmp += '<a class="btn btn-xs btn-default preview" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a>'
                                                tmp += '<a class="btn btn-xs btn-default" download="'+v.mid+'-'+v.filename+'" href="'+href+'">&nbsp;<i class="fa fa-download"></i>&nbsp;</a>'
                                            tmp += '</div>'
                                        tmp += '</div>'
                                    tmp += '</div>'
                                tmp += '</div>'
                            })
                            tmp += '</div>'
                            e.b.html(tmp)
                            var i = 0
                            var getThumbnail = function(){
                                var v = d.videos[i]
                                if(v){
                                    tool.getVideoImage($.ccio.init('videoUrlBuild',v),0,function(err,base64){
                                        if(base64){
                                            $('[ke="'+v.ke+'"][mid="'+v.mid+'"][file="'+v.filename+'"] .thumb').css('background-image','url('+base64+')')
                                        }
                                        ++i
                                        getThumbnail()
                                    })
                                }
                            }
                            getThumbnail()
                        break;
                        case'videos_table':
                            var showThumbnail = $.ccio.op().showThumbnail === '1'
                            $.vidview.e.removeClass('dark')
                            e.t.attr('class','fa fa-film')
                            var tmp = '<table class="table table-striped" style="max-height:500px">';
                            tmp+='<thead>';
                            tmp+='<tr>';
                            tmp+='<th><div class="checkbox"><input id="videos_select_all" type="checkbox"><label for="videos_select_all"></label></div></th>';
                            if(showThumbnail)tmp+='<th data-field="Thumbnail" data-sortable="true">'+lang.Thumbnail+'</th>';
                            tmp+='<th data-field="Closed" data-sortable="true">'+lang.Closed+'</th>';
                            tmp+='<th data-field="Ended" data-sortable="true">'+lang.Ended+'</th>';
                            tmp+='<th data-field="Started" data-sortable="true">'+lang.Started+'</th>';
                            tmp+='<th data-field="Monitor" data-sortable="true">'+lang.Monitor+'</th>';
                            tmp+='<th data-field="Filename" data-sortable="true">'+lang.Filename+'</th>';
                            tmp+='<th data-field="Size" data-sortable="true">'+lang['Size (mb)']+'</th>';
                            tmp+='<th data-field="Preview" data-sortable="true">'+lang.Preview+'</th>';
                            tmp+='<th data-field="Watch" data-sortable="true">'+lang.Watch+'</th>';
                            tmp+='<th data-field="Download" data-sortable="true">'+lang.Download+'</th>';
                            tmp+='<th class="permission_video_delete" data-field="Delete" data-sortable="true">'+lang.Delete+'</th>';
    //                        tmp+='<th class="permission_video_delete" data-field="Fix" data-sortable="true">'+lang.Fix+'</th>';
                            tmp+='</tr>';
                            tmp+='</thead>';
                            tmp+='<tbody>';
                            $.each(d.videos,function(n,v){
                                if(v.status!==0){
                                    $.vidview.loadedVideos[v.filename] = Object.assign(v,{})
                                    var href = $.ccio.init('videoUrlBuild',v)
                                    v.mon=$.ccio.mon[v.ke+v.mid+user.auth_token];
                                    v.start=v.time;
    //                                v.filename=$.ccio.init('tf',v.time)+'.'+v.ext;
                                    tmp+='<tr data-ke="'+v.ke+'" data-status="'+v.status+'" data-mid="'+v.mid+'" data-file="'+v.filename+'" data-auth="'+v.mon.user.auth_token+'">';
                                    tmp+='<td><div class="checkbox"><input id="'+v.ke+'_'+v.filename+'" name="'+v.filename+'" value="'+v.mid+'" type="checkbox"><label for="'+v.ke+'_'+v.filename+'"></label></div></td>';
                                    if(showThumbnail)tmp+='<td class="text-center"><img class="thumbnail"></td>';
                                    tmp+='<td><span class="livestamp" title="'+$.ccio.timeObject(v.end).format('YYYY-MM-DD HH:mm:ss')+'"></span></td>';
                                    tmp+='<td title="'+v.end+'">'+$.ccio.timeObject(v.end).format('h:mm:ss A, MMMM Do YYYY')+'</td>';
                                    tmp+='<td title="'+v.time+'">'+$.ccio.timeObject(v.time).format('h:mm:ss A, MMMM Do YYYY')+'</td>';
                                    tmp+='<td>'+v.mon.name+'</td>';
                                    tmp+='<td>'+v.filename+'</td>';
                                    tmp+='<td>'+(parseInt(v.size)/1000000).toFixed(2)+'</td>';
                                    tmp+='<td><a class="btn btn-sm btn-default preview" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a></td>';
                                    tmp+='<td><a class="btn btn-sm btn-primary" video="launch" href="'+href+'">&nbsp;<i class="fa fa-play-circle"></i>&nbsp;</a></td>';
                                    tmp+='<td><a class="btn btn-sm btn-success" download="'+v.mid+'-'+v.filename+'" href="'+href+'">&nbsp;<i class="fa fa-download"></i>&nbsp;</a></td>';
                                    tmp+='<td class="permission_video_delete"><a class="btn btn-sm btn-danger" video="delete" href="'+$.ccio.init('videoHrefToDelete',href)+'">&nbsp;<i class="fa fa-trash"></i>&nbsp;</a></td>';
    //                                tmp+='<td class="permission_video_delete"><a class="btn btn-sm btn-warning" video="fix">&nbsp;<i class="fa fa-wrench"></i>&nbsp;</a></td>';
                                    tmp+='</tr>';
                                }
                            })
                            tmp+='</tbody>';
                            tmp+='</table>';
                            e.b.html(tmp)
                            if(showThumbnail){
                                var i = 0
                                var getThumbnail = function(){
                                    var v = d.videos[i]
                                    if(v){
                                        tool.getVideoImage($.ccio.init('videoUrlBuild',v),0,function(err,base64){
                                            if(base64){
                                                $('[data-ke="'+v.ke+'"][data-mid="'+v.mid+'"][data-file="'+v.filename+'"] .thumbnail')[0].src = base64
                                            }
                                            ++i
                                            getThumbnail()
                                        })
                                    }
                                }
                                getThumbnail()
                            }
                            $.ccio.init('ls');
                            $.vidview.e.find('table').bootstrapTable();
                        break;
                    }
                })
            break;
            case'fullscreen':
                e.e=e.e.parents('.monitor_item');
                e.e.addClass('fullscreen')
                e.vid=e.e.find('.stream-element')
                if(e.vid.is('canvas')){
                    e.doc=$('body')
                   e.vid.attr('height',e.doc.height())
                   e.vid.attr('width',e.doc.width())
                }
                $.ccio.init('fullscreen',e.vid[0])
            break;
            case'watch_on':
                $.ccio.cx({f:'monitor',ff:'watch_on',id:e.mid},user)
            break;
            case'control_toggle':
                e.e=e.p.find('.PTZ_controls');
                if(e.e.length>0){
                    e.e.remove()
                }else{
                    var html = '<div class="PTZ_controls">'
                    html += '<div class="pad">'
                        html += '<div class="control top" monitor="control" control="up"></div>'
                        html += '<div class="control left" monitor="control" control="left"></div>'
                        html += '<div class="control right" monitor="control" control="right"></div>'
                        html += '<div class="control bottom" monitor="control" control="down"></div>'
                        html += '<div class="control middle" monitor="control" control="center"></div>'
                    html += '</div>'
                    html += '<div class="btn-group btn-group-sm btn-group-justified">'
                        html += '<a title="'+lang['Zoom In']+'" class="zoom_in btn btn-default" monitor="control" control="zoom_in"><i class="fa fa-search-plus"></i></a>'
                        html += '<a title="'+lang['Zoom Out']+'" class="zoom_out btn btn-default" monitor="control" control="zoom_out"><i class="fa fa-search-minus"></i></a>'
                    html += '</div>'
                        html += '<div class="btn-group btn-group-sm btn-group-justified">'
                            html += '<a title="'+lang['Enable Nightvision']+'" class="nv_enable btn btn-default" monitor="control" control="enable_nv"><i class="fa fa-moon-o"></i></a>'
                            html += '<a title="'+lang['Disable Nightvision']+'" class="nv_disable btn btn-default" monitor="control" control="disable_nv"><i class="fa fa-sun-o"></i></a>'
                        html += '</div>'
                    html += '</div>'
                    e.p.append(html)
                }
            break;
            case'watch':
                if($("#monitor_live_"+e.mid+user.auth_token).length===0||$.ccio.mon[e.ke+e.mid+user.auth_token].watch!==1){
                    $.ccio.cx({f:'monitor',ff:'watch_on',id:e.mid},user)
                }else{
                    $("#main_canvas").animate({scrollTop:$("#monitor_live_"+e.mid+user.auth_token).offset().top-($('#main_header').height()+10)},500);
                }
            break;
            case'watch_off':
                $.ccio.cx({f:'monitor',ff:'watch_off',id:e.mid},user)
            break;
            case'delete':
                e.m=$('#confirm_window').modal('show');e.f=e.e.attr('file');
                $.confirm.title.text(lang['Delete Monitor']+' : '+e.mon.name)
                e.html=lang.DeleteMonitorText
                e.html+='<table class="info-table table table-striped"><tr>';
                $.each($.ccio.init('cleanMon',e.mon),function(n,v,g){
                    if(n==='host'&&v.indexOf('@')>-1){g=v.split('@')[1]}else{g=v};
                    try{JSON.parse(g);return}catch(err){}
                    e.html+='<tr><td><b>'+n+'</b></td><td>'+g+'</td></tr>';
                })
                e.html+='</tr></table>';
                $.confirm.body.html(e.html)
                $.confirm.click([
                    {
                        title:'Delete Monitor',
                        class:'btn-danger',
                        callback:function(){
                            $.get($.ccio.init('location',user)+user.auth_token+'/configureMonitor/'+user.ke+'/'+e.mon.mid+'/delete',function(d){
                                $.ccio.log(d)
                            })
                        }
                    },
                    {
                        title:'Delete Monitor and Files',
                        class:'btn-danger',
                        callback:function(){
                            $.get($.ccio.init('location',user)+user.auth_token+'/configureMonitor/'+user.ke+'/'+e.mon.mid+'/delete?deleteFiles=true',function(d){
                                $.ccio.log(d)
                            })
                        }
                    }
                ])
            break;
            case'edit':
                e.p=$('#add_monitor'),e.mt=e.p.find('.modal-title')
                e.p.find('.am_notice').hide()
                e.p.find('[detailcontainer="detector_cascades"]').prop('checked',false).parents('.mdl-js-switch').removeClass('is-checked')
                if(!$.ccio.mon[e.ke+e.mid+user.auth_token]){
                    e.p.find('.am_notice_new').show()
                    //new monitor
                    e.p.find('[monitor="delete"]').hide()
                    e.mt.find('span').text('Add'),e.mt.find('i').attr('class','fa fa-plus');
                    //default values
                    e.values=$.aM.generateDefaultMonitorSettings();
                }else{
                    e.p.find('.am_notice_edit').show()
                    //edit monitor
                    e.p.find('[monitor="delete"]').show()
                    e.mt.find('span').text(lang.Edit);
                    e.mt.find('i').attr('class','fa fa-wrench');
                    e.values=$.ccio.mon[e.ke+e.mid+user.auth_token];
                }
                $.aM.selected=e.values;
    //            e.openTabs=$.ccio.op().tabsOpen
    //            if(e.openTabs[e.mid]){
    //                e.values=e.openTabs[e.mid]
    //            }
                $.aM.import(e)
                $('#add_monitor').modal('show')
            break;
        }
    })
    .on('dblclick','[type="password"],.password_field',function(){
        var _this = $(this)
        var type = 'password'
        _this.addClass('password_field')
        if(_this.attr('type') === 'password'){
            type = 'text'
        }
        _this.attr('type',type)
    })

    $('.modal').on('hidden.bs.modal',function(){
        $(this).find('video').remove();
        $(this).find('iframe').attr('src','about:blank');
    });
    $('.modal').on('shown.bs.modal',function(){
        e={e:$(this).find('.flex-container-modal-body')}
        if(e.e.length>0){
            e.e.resize()
        }
    });

    $('body')
    .on('click','.scrollTo',function(ee){
        ee.preventDefault()
        var e = {e:$(this)};
        e.parent=e.e.attr('scrollToParent')
        if(!e.parent){
            e.parent='body,html'
        }
        $(e.parent).animate({
            scrollTop: $(e.e.attr('href')).position().top
        }, 400);
    })
    .on('resize','.flex-container-modal-body',function(e){
        e=$(this)
        e.find('.flex-modal-block').css('height',e.height())
    })
    .on('resize','#monitors_live .monitor_item',function(e){
        e.e=$(this).find('.stream-block');
        e.c=e.e.find('canvas');
        e.c.attr('height',e.e.height());
        e.c.attr('width',e.e.width());
    })
    .on('keyup','.search-parent .search-controller',function(){
        _this = this;
        $.each($(".search-parent .search-body .search-row"), function() {
            if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1)
               $(this).hide();
            else
               $(this).show();
        });
    })
    .on('dblclick','.stream-hud',function(){
        $(this).parents('[mid]').find('[monitor="fullscreen"]').click();
    })
    //.on('mousemove',".magnifyStream",$.ccio.magnifyStream)
    //.on('touchmove',".magnifyStream",$.ccio.magnifyStream);
})
