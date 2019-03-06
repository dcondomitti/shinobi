$(document).ready(function(e){

//Monitor Editor
$.aM={e:$('#add_monitor'),monitorsForCopy:$('#copy_settings_monitors')};
$.aM.f=$.aM.e.find('form')
$.aM.channels=$('#monSectionStreamChannels')
$.aM.maps=$('#monSectionInputMaps')
$.aM.e.find('.follow-list ul').affix();
$.each($.ccio.definitions["Monitor Settings"].blocks,function(n,v){
    $.each(v.info,function(m,b){
        if(!b.name){
            console.log(b)
            return
        }
        if(b.name.indexOf('detail=')>-1){
            b.name=b.name.replace('detail=','')
            v.element=$.aM.e.find('[detail="'+b.name+'"]')
        }else{
            v.element=$.aM.e.find('[name="'+b.name+'"]')
        }
        v.parent=v.element.parents('.form-group').find('label div:first-child span')
        v.parent.find('small').remove()
        v.parent.append('<small class="hover">'+b.description+'</small>')
    })
})
$.aM.generateDefaultMonitorSettings=function(){
    return {
    "mode": "start",
    "mid": $.ccio.gid(),
    "name": "Some Stream",
    "type": "h264",
    "protocol": "rtsp",
    "host": "",
    "port": "",
    "path": "",
    "ext": "mp4",
    "fps": "1",
    "width": "640",
    "height": "480",
    "details": JSON.stringify({
        "fatal_max": "0",
        "notes": "",
        "dir": "",
        "auto_host_enable": "1",
        "auto_host": "",
        "rtsp_transport": "tcp",
        "muser": "",
        "mpass": "",
        "port_force": "0",
        "aduration": "1000000",
        "probesize": "1000000",
        "stream_loop": "0",
        "sfps": "",
        "accelerator": "0",
        "hwaccel": "auto",
        "hwaccel_vcodec": "",
        "hwaccel_device": "",
        "stream_type": "mp4",
        "stream_flv_type": "ws",
        "stream_mjpeg_clients": "",
        "stream_vcodec": "copy",
        "stream_acodec": "no",
        "hls_time": "2",
        "preset_stream": "ultrafast",
        "hls_list_size": "3",
        "signal_check": "10",
        "signal_check_log": "0",
        "stream_quality": "15",
        "stream_fps": "2",
        "stream_scale_x": "",
        "stream_scale_y": "",
        "rotate_stream": "no",
        "svf": "",
        "rtmp_vcodec": "h264",
        "rtmp_acodec": "aac",
        "stream_timestamp": "0",
        "stream_timestamp_font": "",
        "stream_timestamp_font_size": "",
        "stream_timestamp_color": "",
        "stream_timestamp_box_color": "",
        "stream_timestamp_x": "",
        "stream_timestamp_y": "",
        "stream_watermark": "0",
        "stream_watermark_location": "",
        "stream_watermark_position": "tr",
        "snap": "0",
        "snap_fps": "",
        "snap_scale_x": "",
        "snap_scale_y": "",
        "snap_vf": "",
        "rawh264": "0",
        "rawh264_vcodec": "copy",
        "rawh264_acodec": "",
        "rawh264_fps": "",
        "rawh264_scale_x": "",
        "rawh264_scale_y": "",
        "rawh264_crf": "",
        "rawh264_vf": "",
        "vcodec": "copy",
        "crf": "1",
        "preset_record": "",
        "acodec": "no",
        "dqf": "0",
        "cutoff": "15",
        "rotate_record": "no",
        "vf": "",
        "timestamp": "0",
        "timestamp_font": "",
        "timestamp_font_size": "10",
        "timestamp_color": "white",
        "timestamp_box_color": "0x00000000@1",
        "timestamp_x": "(w-tw)/2",
        "timestamp_y": "0",
        "watermark": "0",
        "watermark_location": "",
        "watermark_position": "tr",
        "cust_input": "",
        "cust_snap": "",
        "cust_rawh264": "",
        "cust_detect": "",
        "cust_stream": "",
        "cust_stream_server": "",
        "cust_record": "",
        "custom_output": "",
        "detector": "0",
        "detector_pam": "1",
        "detector_webhook": "0",
        "detector_webhook_url": "",
        "detector_command_enable": "0",
        "detector_command": "",
        "detector_command_timeout": "",
        "detector_lock_timeout": "",
        "detector_save": "0",
        "detector_frame_save": "0",
        "detector_mail": "0",
        "detector_mail_timeout": "",
        "detector_record_method": "sip",
        "detector_trigger": "1",
        "detector_trigger_record_fps": "",
        "detector_timeout": "10",
        "watchdog_reset": "0",
        "detector_delete_motionless_videos": "0",
        "detector_send_frames": "1",
        "detector_region_of_interest": "0",
        "detector_fps": "",
        "detector_scale_x": "640",
        "detector_scale_y": "480",
        "detector_use_motion": "1",
        "detector_use_detect_object": "0",
        "detector_frame": "0",
        "detector_sensitivity": "",
        "detector_max_sensitivity": "",
        "detector_threshold": "1",
        "detector_color_threshold": "",
        "cords": "[]",
        "detector_buffer_vcodec": "auto",
        "detector_buffer_fps": "",
        "detector_buffer_hls_time": "",
        "detector_buffer_hls_list_size": "",
        "detector_buffer_start_number": "",
        "detector_buffer_live_start_index": "",
        "detector_lisence_plate": "0",
        "detector_lisence_plate_country": "us",
        "detector_notrigger": "0",
        "detector_notrigger_mail": "0",
        "detector_notrigger_timeout": "",
        "control": "0",
        "control_base_url": "",
        "control_stop": "0",
        "control_url_stop_timeout": "",
        "control_url_center": "",
        "control_url_left": "",
        "control_url_left_stop": "",
        "control_url_right": "",
        "control_url_right_stop": "",
        "control_url_up": "",
        "control_url_up_stop": "",
        "control_url_down": "",
        "control_url_down_stop": "",
        "control_url_enable_nv": "",
        "control_url_disable_nv": "",
        "control_url_zoom_out": "",
        "control_url_zoom_out_stop": "",
        "control_url_zoom_in": "",
        "control_url_zoom_in_stop": "",
        "tv_channel": "0",
        "groups": "[]",
        "loglevel": "warning",
        "sqllog": "0",
        "detector_cascades": ""
    }),
    "shto": "[]",
    "shfr": "[]"
}
}
$.aM.drawList=function(){
    e={list:$.aM.e.find('.follow-list ul'),html:''}
    $.aM.e.find('[section]:visible').each(function(n,v){
        e.e=$(v)
        e.id = e.e.attr('id');
        e.title = e.e.find('h4').first().html();
        var div = document.createElement('div');
        div.innerHTML = e.title;
        var elements = div.getElementsByTagName('a');
        while (elements[0])
           elements[0].parentNode.removeChild(elements[0])
        var elements = div.getElementsByTagName('small');
        while (elements[0])
           elements[0].parentNode.removeChild(elements[0])
        var repl = div.innerHTML;
        e.html += '<li><a class="scrollTo" href="#'+e.id+'" scrollToParent="#add_monitor .modal-body">'+repl+'</a></li>'
    })
    e.list.html(e.html)
}
$.aM.import=function(e){
    $.get($.ccio.init('location',$user)+$user.auth_token+'/hls/'+e.values.ke+'/'+e.values.mid+'/detectorStream.m3u8',function(data){
        $('#monEditBufferPreview').html(data)
    })
    $.aM.e.find('.edit_id').text(e.values.mid);
    $.aM.e.attr('mid',e.values.mid).attr('ke',e.values.ke).attr('auth',e.auth)
    $.each(e.values,function(n,v){
        $.aM.e.find('[name="'+n+'"]').val(v).change()
    })
    e.ss=JSON.parse(e.values.details);
    //get maps
    $.aM.maps.empty()
    if(e.ss.input_maps&&e.ss.input_maps!==''){
        var input_maps
        try{
            input_maps = JSON.parse(e.ss.input_maps)
        }catch(er){
            input_maps = e.ss.input_maps;
        }
        if(input_maps.length>0){
            $.aM.showInputMappingFields()
            $.each(input_maps,function(n,v){
                var tempID = $.ccio.tm('input-map')
                var parent = $('#monSectionMap'+tempID)
                $.each(v,function(m,b){
                    parent.find('[map-detail="'+m+'"]').val(b).change()
                })
            })
        }else{
            $.aM.showInputMappingFields(false)
        }
    }
    //get channels
    $.aM.channels.empty()
    if(e.ss.stream_channels&&e.ss.stream_channels!==''){
        var stream_channels
        try{
            stream_channels = JSON.parse(e.ss.stream_channels)
        }catch(er){
            stream_channels = e.ss.stream_channels;
        }
        $.each(stream_channels,function(n,v){
            var tempID = $.ccio.tm('stream-channel')
            var parent = $('#monSectionChannel'+tempID)
            $.each(v,function(m,b){
                parent.find('[channel-detail="'+m+'"]').val(b)
            })
        })
    }
    //get map choices for outputs
    $('[input-mapping] .choices').empty()
    if(e.ss.input_map_choices&&e.ss.input_map_choices!==''){
        var input_map_choices
        try{
            input_map_choices = JSON.parse(e.ss.input_map_choices)
        }catch(er){
            input_map_choices = e.ss.input_map_choices;
        }
        $.each(input_map_choices,function(n,v){
            $.each(v,function(m,b){
                var parent = $('[input-mapping="'+n+'"] .choices')
                $.ccio.tm('input-map-selector',b,parent)
            })
        })
    }
    $.aM.e.find('[detail]').each(function(n,v){
        v=$(v).attr('detail');if(!e.ss[v]){e.ss[v]=''}
    })
    $.each(e.ss,function(n,v){
        var theVal = v;
        if(v instanceof Object){
            theVal = JSON.stringify(v);
        }
        $.aM.e.find('[detail="'+n+'"]').val(theVal).change();
    });
    $.each(e.ss,function(n,v){
        try{
            var variable=JSON.parse(v)
        }catch(err){
            var variable=v
        }
        if(variable instanceof Object){
            $('[detailContainer="'+n+'"][detailObject]').prop('checked',false)
            $('[detailContainer="'+n+'"][detailObject]').parents('.mdl-js-switch').removeClass('is-checked')
            if(variable instanceof Array){
                $.each(variable,function(m,b,parentOfObject){
                    $('[detailContainer="'+n+'"][detailObject="'+b+'"]').prop('checked',true)
                    parentOfObject=$('[detailContainer="'+n+'"][detailObject="'+b+'"]').parents('.mdl-js-switch')
                    parentOfObject.addClass('is-checked')
                })
            }else{
                $.each(variable,function(m,b){
                    if(typeof b ==='string'){
                       $('[detailContainer="'+n+'"][detailObject="'+m+'"]').val(b).change()
                    }else{
                        $('[detailContainer="'+n+'"][detailObject="'+m+'"]').prop('checked',true)
                        parentOfObject=$('[detailContainer="'+n+'"][detailObject="'+m+'"]').parents('.mdl-js-switch')
                        parentOfObject.addClass('is-checked')
                    }
                })
            }
        }
    });
    try{
        $.each(['groups','group_detector_multi'],function(m,b){
            var tmp=''
            $.each($user.mon_groups,function(n,v){
                tmp+='<li class="mdl-list__item">';
                tmp+='<span class="mdl-list__item-primary-content">';
                tmp+=v.name;
                tmp+='</span>';
                tmp+='<span class="mdl-list__item-secondary-action">';
                tmp+='<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">';
                tmp+='<input type="checkbox" '+b+' value="'+v.id+'" class="mdl-switch__input"';
                if(!e.ss[b]){
                    e.ss[b]=[]
                }
                if(e.ss[b].indexOf(v.id)>-1){tmp+=' checked';}
                tmp+=' />';
                tmp+='</label>';
                tmp+='</span>';
                tmp+='</li>';
            })
            $('#monitor_'+b).html(tmp)
        })
        componentHandler.upgradeAllRegistered()
    }catch(er){
        console.log(er)
        //no group, this 'try' will be removed in future.
    };
    $('#copy_settings').val('0').change()
    var tmp = '';
    $.each($.ccio.mon,function(n,v){
        if(v.ke === $user.ke){
            tmp += $.ccio.tm('option',{auth_token:$user.auth_token,id:v.mid,name:v.name},null,$user);
        }
    })
    $.aM.monitorsForCopy.find('optgroup').html(tmp)
    setTimeout(function(){$.aM.drawList()},1000)
}
//parse "Automatic" field in "Input" Section
$.aM.e.on('change','.auto_host_fill input,.auto_host_fill select',function(e){
    var theSwitch = $.aM.e.find('[detail="auto_host_enable"]').val()
    if(!theSwitch||theSwitch===''){
        theSwitch='1'
    }
    if(theSwitch==='1'){
        return
    }
    if($.aM.e.find('[name="host"]').val() !== ''){
        $.aM.e.find('[detail="auto_host"]').val($.aM.buildMonitorURL())
    }
})
$.aM.e.on('change','[detail="auto_host"]',function(e){
    var isRTSP = false
    var inputType = $.aM.e.find('[name="type"]').val()
    var url = $(this).val()
    var theSwitch = $.aM.e.find('[detail="auto_host_enable"]')
    var disabled = theSwitch.val()
    if(!disabled||disabled===''){
        //if no value, then probably old version of monitor config. Set to Manual to avoid confusion.
        disabled='0'
        theSwitch.val('0').change()
    }
    if(disabled==='0'){
        return
    }
    if(inputType === 'local'){
        $.aM.e.find('[name="path"]').val(url).change()
    }else{
        var urlSplitByDots = url.split('.')
        var has = function(query,searchIn){if(!searchIn){searchIn=url;};return url.indexOf(query)>-1}
        var protocol = url.split('://')[0]
        console.log(url.split('://'))
        //switch RTSP, RTMP and RTMPS to parse URL
        if(has('rtsp://')){
            isRTSP = true;
            url = url.replace('rtsp://','http://')
        }
        if(has('rtmp://')){
            isRTMP = true;
            url = url.replace('rtmp://','http://')
        }
        if(has('rtmps://')){
            isRTMPS = true;
            url = url.replace('rtmps://','http://')
        }
        //parse URL
        var parsedURL = document.createElement('a');
        parsedURL.href = url;
        var pathname = parsedURL.pathname
        if(url.indexOf('?') > -1){
            pathname += '?'+url.split('?')[1]
        }
        $.aM.e.find('[name="protocol"]').val(protocol).change()
        if(isRTSP){
            $.aM.e.find('[detail="rtsp_transport"]').val('tcp').change()
            $.aM.e.find('[detail="aduration"]').val(1000000).change()
            $.aM.e.find('[detail="probesize"]').val(1000000).change()
        }
        $.aM.e.find('[detail="muser"]').val(parsedURL.username).change()
        $.aM.e.find('[detail="mpass"]').val(parsedURL.password).change()
        $.aM.e.find('[name="host"]').val(parsedURL.hostname).change()
        $.aM.e.find('[name="port"]').val(parsedURL.port).change()
        $.aM.e.find('[name="path"]').val(pathname).change()
        delete(parsedURL)
    }
})
$.aM.e.find('.refresh_cascades').click(function(e){
    $.ccio.cx({f:'ocv_in',data:{f:'refreshPlugins',ke:$user.ke}})
})
$.aM.f.submit(function(ee){
    ee.preventDefault();
    e={e:$(this)};
    e.s=e.e.serializeObject();
    e.er=[];
    $.each(e.s,function(n,v){e.s[n]=v.trim()});
    e.s.mid=e.s.mid.replace(/[^\w\s]/gi,'').replace(/ /g,'')
    if(e.s.mid.length<3){e.er.push('Monitor ID too short')}
    if(e.s.port==''){
        if(e.s.protocol === 'https'){
            e.s.port = 443
        }else{
            e.s.port = 80
        }
    }
    if(e.s.name==''){e.er.push('Monitor Name cannot be blank')}
//    if(e.s.protocol=='rtsp'){e.s.ext='mp4',e.s.type='rtsp'}
    if(e.er.length>0){
        $.sM.e.find('.msg').html(e.er.join('<br>'));
        $.ccio.init('note',{title:'Configuration Invalid',text:e.er.join('<br>'),type:'error'});
        return;
    }
    $.post($.ccio.init('location',$user)+$user.auth_token+'/configureMonitor/'+$user.ke+'/'+e.s.mid,{data:JSON.stringify(e.s)},function(d){
        $.ccio.log(d)
    })
    //
    if($('#copy_settings').val() === '1'){
        e.s.details = JSON.parse(e.s.details);
        var copyMonitors = $.aM.monitorsForCopy.val();
        var chosenSections = [];
        var chosenMonitors = {};

        if(!copyMonitors||copyMonitors.length===0){
            $.ccio.init('note',{title:lang['No Monitors Selected'],text:lang.monSavedButNotCopied})
            return
        }

        $.aM.e.find('[copy]').each(function(n,v){
            var el = $(v)
            if(el.val() === '1'){
                chosenSections.push(el.attr('copy'))
            }
        })
        var alterSettings = function(settingsToAlter,monitor){
            monitor.details = JSON.parse(monitor.details);
            $.aM.e.find(settingsToAlter).find('input,select,textarea').each(function(n,v){
                var el = $(v);
                var name = el.attr('name')
                var detail = el.attr('detail')
                var value
                switch(true){
                    case !!name:
                        var value = e.s[name]
                        monitor[name] = value;
                    break;
                    case !!detail:
                        detail = detail.replace('"','')
                        var value = e.s.details[detail]
                        monitor.details[detail] = value;
                    break;
                }
            })
            monitor.details = JSON.stringify(monitor.details);
            return monitor;
        }
        $.each(copyMonitors,function(n,id){
            var monitor
            if(id === '$New'){
                monitor = $.aM.generateDefaultMonitorSettings();
                //connection
                monitor.name = e.s.name+' - '+monitor.mid
                monitor.type = e.s.type
                monitor.protocol = e.s.protocol
                monitor.host = e.s.host
                monitor.port = e.s.port
                monitor.path = e.s.path
                monitor.details.fatal_max = e.s.details.fatal_max
                monitor.details.port_force = e.s.details.port_force
                monitor.details.muser = e.s.details.muser
                monitor.details.password = e.s.details.password
                monitor.details.rtsp_transport = e.s.details.rtsp_transport
                monitor.details.auto_host = e.s.details.auto_host
                monitor.details.auto_host_enable = e.s.details.auto_host_enable
                //input
                monitor.details.aduration = e.s.details.aduration
                monitor.details.probesize = e.s.details.probesize
                monitor.details.stream_loop = e.s.details.stream_loop
                monitor.details.sfps = e.s.details.sfps
                monitor.details.accelerator = e.s.details.accelerator
                monitor.details.hwaccel = e.s.details.hwaccel
                monitor.details.hwaccel_vcodec = e.s.details.hwaccel_vcodec
                monitor.details.hwaccel_device = e.s.details.hwaccel_device
            }else{
                monitor = Object.assign({},$.ccio.init('cleanMon',$.ccio.mon[$user.ke+id+$user.auth_token]));
            }
            $.each(chosenSections,function(n,section){
                monitor = alterSettings(section,monitor)
            })
            console.log(monitor)
            $.post($.ccio.init('location',$user)+$user.auth_token+'/configureMonitor/'+$user.ke+'/'+monitor.mid,{data:JSON.stringify(monitor)},function(d){
                $.ccio.log(d)
            })
             chosenMonitors[monitor.mid] = monitor;
        })
        console.log(chosenMonitors)
    }

    $.aM.e.modal('hide')
    return false;
});
//////////////////
//Input Map (Feed)
$.aM.mapPlacementInit = function(){
    $('.input-map').each(function(n,v){
        var _this = $(this)
        _this.find('.place').text(n+1)
    })
}
$.aM.mapSave = function(){
    var e={};
    var mapContainers = $('[input-mapping]');
    var stringForSave={}
    mapContainers.each(function(q,t){
        var mapRowElement = $(t).find('.map-row');
        var mapRow = []
        mapRowElement.each(function(n,v){
            var map={}
            $.each($(v).find('[map-input]'),function(m,b){
                map[$(b).attr('map-input')]=$(b).val()
            });
            mapRow.push(map)
        });
        stringForSave[$(t).attr('input-mapping')] = mapRow;
    });
    $.aM.e.find('[detail="input_map_choices"]').val(JSON.stringify(stringForSave)).change();
}
$.aM.maps.on('click','.delete',function(){
    $(this).parents('.input-map').remove()
    var inputs = $('[map-detail]')
    if(inputs.length===0){
        $.aM.e.find('[detail="input_maps"]').val('[]').change()
        $.aM.showInputMappingFields(false)
    }else{
        inputs.first().change()
        $.aM.showInputMappingFields()
    }
    $.aM.mapPlacementInit()
})
$.aM.e.on('change','[map-detail]',function(){
  var e={};
    e.e=$.aM.maps.find('.input-map')
    e.s=[]
    e.e.each(function(n,v){
        var map={}
        $.each($(v).find('[map-detail]'),function(m,b){
            map[$(b).attr('map-detail')]=$(b).val()
        });
        e.s.push(map)
    });
    $.aM.e.find('[detail="input_maps"]').val(JSON.stringify(e.s)).change()
})
$.aM.e.on('click','[input-mapping] .add_map_row',function(){
    $.ccio.tm('input-map-selector',{},$(this).parents('[input-mapping]').find('.choices'))
    $.aM.mapSave()
})
$.aM.e.on('click','[input-mapping] .delete_map_row',function(){
    $(this).parents('.map-row').remove()
    $.aM.mapSave()
})
$.aM.e.on('change','[map-input]',function(){
    $.aM.mapSave()
})
//////////////////
//Stream Channels
$.aM.channelSave = function(){
  var e={};
    e.e=$.aM.channels.find('.stream-channel')
    e.s=[]
    e.e.each(function(n,v){
        var channel={}
        $.each($(v).find('[channel-detail]'),function(m,b){
            channel[$(b).attr('channel-detail')]=$(b).val()
        });
        e.s.push(channel)
    });
    $.aM.e.find('[detail="stream_channels"]').val(JSON.stringify(e.s)).change()
}
$.aM.channelPlacementInit = function(){
    $('.stream-channel').each(function(n,v){
        var _this = $(this)
        _this.attr('stream-channel',n)
        _this.find('.place').text(n)
        _this.find('[input-mapping]').attr('input-mapping','stream_channel-'+n)
        $.aM.mapSave()
    })
}
$.aM.buildMonitorURL = function(){
    var e={};
    e.user=$.aM.e.find('[detail="muser"]').val();
    e.pass=$.aM.e.find('[detail="mpass"]').val();
    e.host=$.aM.e.find('[name="host"]').val();
    e.protocol=$.aM.e.find('[name="protocol"]').val();
    e.port=$.aM.e.find('[name="port"]').val();
    e.path=$.aM.e.find('[name="path"]').val();
    if($.aM.e.find('[name="type"]').val()==='local'){
        e.url=e.path;
    }else{
        if(e.host.indexOf('@')===-1&&e.user!==''){
            e.host=e.user+':'+e.pass+'@'+e.host;
        }
        e.url=$.ccio.init('url',e)+e.path;
    }
    return e.url
}
$.aM.showInputMappingFields = function(showMaps){
    var el = $('[input-mapping],.input-mapping')
    if(showMaps === undefined)showMaps = true
    if(showMaps){
        el.show()
    }else{
        el.hide()
    }
    $.aM.drawList()
}
$.aM.channels.on('click','.delete',function(){
    $(this).parents('.stream-channel').remove()
    $.aM.channelSave()
    $.aM.channelPlacementInit()
})
$.aM.e.on('change','[channel-detail]',function(){
    $.aM.channelSave()
})
//////////////////
$.aM.e.on('change','[groups]',function(){
  var e={};
    e.e=$.aM.e.find('[groups]:checked');
    e.s=[];
    e.e.each(function(n,v){
        e.s.push($(v).val())
    });
    $.aM.e.find('[detail="groups"]').val(JSON.stringify(e.s)).change()
})
$.aM.e.on('change','[group_detector_multi]',function(){
  var e={};
    e.e=$.aM.e.find('[group_detector_multi]:checked');
    e.s=[];
    e.e.each(function(n,v){
        e.s.push($(v).val())
    });
    $.aM.e.find('[detail="group_detector_multi"]').val(JSON.stringify(e.s)).change()
})
$.aM.e.on('change','.detector_cascade_selection',function(){
  var e={};
    e.e=$.aM.e.find('.detector_cascade_selection:checked');
    e.s={};
    e.e.each(function(n,v){
        e.s[$(v).val()]={}
    });
    $.aM.e.find('[detail="detector_cascades"]').val(JSON.stringify(e.s)).change()
})
//$.aM.e.on('change','.detector_cascade_selection',function(){
//  var e={};
//    e.details=$.aM.e.find('[name="details"]')
//    try{
//        e.detailsVal=JSON.parse(e.details.val())
//    }catch(err){
//        e.detailsVal={}
//    }
//    e.detailsVal.detector_cascades=[];
//    e.e=$.aM.e.find('.detector_cascade_selection:checked');
//    e.e.each(function(n,v){
//        e.detailsVal.detector_cascades.push($(v).val())
//    });
//    e.details.val(JSON.stringify(e.detailsVal))
//})
$.aM.e.find('.probe_config').click(function(){
    $.pB.e.find('[name="url"]').val($.aM.buildMonitorURL());
    $.pB.f.submit();
    $.pB.e.modal('show');
})
$.aM.e.find('.import_config').click(function(e){
  var e={};e.e=$(this);e.mid=e.e.parents('[mid]').attr('mid');
    $.confirm.e.modal('show');
    $.confirm.title.text(lang['Import Monitor Configuration'])
    e.html=lang.ImportMonitorConfigurationText+'<div style="margin-top:15px"><div class="form-group"><textarea placeholder="'+lang['Paste JSON here.']+'" class="form-control"></textarea></div><label class="upload_file btn btn-primary btn-block"> Upload File <input class="upload" type=file name="files[]"></label></div>';
    $.confirm.body.html(e.html)
    $.confirm.e.find('.upload').change(function(e){
        var files = e.target.files; // FileList object
        f = files[0];
        var reader = new FileReader();
        reader.onload = function(ee) {
            $.confirm.e.find('textarea').val(ee.target.result);
        }
        reader.readAsText(f);
    });
    $.confirm.click({title:'Import',class:'btn-primary'},function(){
        try{
            e.values=JSON.parse($.confirm.e.find('textarea').val());
            $.aM.import(e)
            $.aM.e.modal('show')
        }catch(err){
            $.ccio.log(err)
            $.ccio.init('note',{title:lang['Invalid JSON'],text:lang.InvalidJSONText,type:'error'})
        }
    });
});
$.aM.e.find('.save_config').click(function(e){
  var e={};e.e=$(this);e.mid=e.e.parents('[mid]').attr('mid');e.s=$.aM.f.serializeObject();
    if(!e.mid||e.mid===''){
        e.mid='NewMonitor'
    }
    e.dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(e.s));
    $('#temp').html('<a></a>')
        .find('a')
        .attr('href',e.dataStr)
        .attr('download','Shinobi_'+e.mid+'_config.json')
        [0].click()
});
$.aM.e.find('.add_map').click(function(e){
    $.aM.showInputMappingFields()
    $.ccio.tm('input-map')
});
$.aM.e.find('.add_channel').click(function(e){
    $.ccio.tm('stream-channel')
});
$.aM.f.find('[detail="stream_type"]').change(function(e){
    e.e=$(this);
    if(e.e.val()==='jpeg'){$.aM.f.find('[detail="snap"]').val('1').change()}
})
$.aM.f.find('[name="type"]').change(function(e){
    e.e=$(this);
    if(e.e.val()==='h264'){$.aM.f.find('[name="protocol"]').val('rtsp').change()}
})
$.aM.md=$.aM.f.find('[detail]');
$.aM.md.change($.ccio.form.details)
$.aM.f.on('change','[selector]',function(){
    e={e:$(this)}
    e.v=e.e.val();
    e.a=e.e.attr('selector')
    e.triggerChange=e.e.attr('triggerchange')
    e.triggerChangeIgnore=e.e.attr('triggerChangeIgnore')
    $.aM.f.find('.'+e.a+'_input').hide()
    $.aM.f.find('.'+e.a+'_'+e.v).show();
    $.aM.f.find('.'+e.a+'_text').text($(this).find('option:selected').text())
    if(e.triggerChange && e.triggerChange !== '' && !e.triggerChangeIgnore || (e.triggerChangeIgnore && e.triggerChangeIgnore.split(',').indexOf(e.v) === -1)){
        console.log(e.triggerChange)
        $(e.triggerChange).trigger('change')
    }
    $.aM.drawList()
});
$.aM.f.find('[name="type"]').change(function(e){
    e.e=$(this);
    e.v=e.e.val();
    e.h=$.aM.f.find('[name="path"]');
    e.p=e.e.parents('.form-group');
    switch(e.v){
        case'local':case'socket':
            e.h.attr('placeholder','/dev/video0')
        break;
        default:
            e.h.attr('placeholder','/videostream.cgi?1')
        break;
    }
});
    $.aM.connectedDetectorPlugins = {}
    $.aM.addDetectorPlugin = function(name,d){
        $.aM.connectedDetectorPlugins[d.plug] = {
            id: d.id,
            plug: d.plug,
            notice: d.notice,
            connectionType: d.connectionType
        }
        $.aM.drawPluginElements()
    }
    $.aM.removeDetectorPlugin = function(name){
        delete($.aM.connectedDetectorPlugins[name])
        $.aM.drawPluginElements(name)
    }
    $.aM.drawPluginElements = function(){
        if(Object.keys($.aM.connectedDetectorPlugins).length === 0){
            $('.stream-objects .stream-detected-object').remove()
            $('.shinobi-detector').hide()
            $('.shinobi-detector-msg').empty()
            $('.shinobi-detector_name').empty()
            $('.shinobi-detector_plug').hide()
            $('.shinobi-detector-invert').show()
            $.aM.drawList()
        }else{
            var pluginTitle = []
            var pluginNotice = []
            $.each($.aM.connectedDetectorPlugins,function(name,d){
                pluginTitle.push(name)
                if(d.notice){
                    pluginNotice.push('<b>' + d.plug + '</b> : ' + d.notice)
                }
                $('.shinobi-detector-'+d.plug).show()
            })
            $('.shinobi-detector').show()
            $('.shinobi-detector-invert').hide()
            $('.shinobi-detector_name').text(pluginTitle.join(', '))
            if(pluginNotice.length > 0)$('.shinobi-detector-msg').text(pluginNotice.join('<br>'))
            $.aM.drawList()
        }
    }
})
