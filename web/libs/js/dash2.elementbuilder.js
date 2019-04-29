$.ccio.tm=function(x,d,z,user){
    var tmp='';if(!d){d={}};
    var k={}
    if(d&&d.user){
        user=d.user
    }
    if(!user){
        user=$user
    }
    if(d.id&&!d.mid){d.mid=d.id;}
    switch(x){
        case 0://video
            var url = $.ccio.init('videoUrlBuild',d)
            href = 'href="'+url+'"'
//                if(!d.filename){d.filename=$.ccio.init('tf',d.time)+'.'+d.ext;}
            d.dlname=d.mid+'-'+d.filename;
            d.startMoment=$.ccio.timeObject(d.time),
            d.endMoment=$.ccio.timeObject(d.end),
            d.hr=parseInt(d.startMoment.format('HH')),
            d.per=parseInt(d.hr/24*100);
            d.circle='<div title="at '+d.hr+' hours of '+d.startMoment.format('MMMM DD')+'" '+href+' video="launch" class="progress-circle progress-'+d.per+'"><span>'+d.hr+'</span></div>'
            tmp+='<li class="video-item glM'+d.mid+user.auth_token+'" auth="'+user.auth_token+'" mid="'+d.mid+'" ke="'+d.ke+'" status="'+d.status+'" status="'+d.status+'" file="'+d.filename+'">'+d.circle+'<div><span title="'+d.endMoment.format()+'" class="livestamp"></span></div><div><div class="small"><b>'+lang.Start+'</b> : '+d.startMoment.format('h:mm:ss , MMMM Do YYYY')+'</div><div class="small"><b>'+lang.End+'</b> : '+d.endMoment.format('h:mm:ss , MMMM Do YYYY')+'</div></div><div><span class="pull-right">'+(parseInt(d.size)/1000000).toFixed(2)+'mb</span><div class="controls btn-group"><a class="btn btn-sm btn-primary" video="launch" '+href+'><i class="fa fa-play-circle"></i></a> <a download="'+d.dlname+'" '+href+' class="btn btn-sm btn-default"><i class="fa fa-download"></i></a>'
            if($.ccio.DropboxAppKey){ tmp+='<a video="download" host="dropbox" download="'+d.dlname+'" '+href+' class="btn btn-sm btn-default"><i class="fa fa-dropbox"></i></a>' }
            tmp+='<a title="'+lang['Delete Video']+'" video="delete" href="'+$.ccio.init('videoHrefToDelete',url)+'" class="btn btn-sm btn-danger permission_video_delete"><i class="fa fa-trash"></i></a></div></div></li>';
            $(z).each(function(n,v){
                v=$(v);
                if(v.find('.video-item').length>10){v.find('.video-item:last').remove()}
            })
        break;
        case 1://monitor icon
            d.src=placeholder.getData(placeholder.plcimg({bgcolor:'#b57d00',text:'...'}));
            tmp+='<div auth="'+user.auth_token+'" mid="'+d.mid+'" ke="'+d.ke+'" title="'+d.mid+' : '+d.name+'" class="monitor_block glM'+d.mid+user.auth_token+' col-md-4"><img monitor="watch" class="snapshot" src="'+d.src+'"><div class="box"><div class="title monitor_name truncate">'+d.name+'</div><div class="list-data"><div class="monitor_mid">'+d.mid+'</div><div><b>'+lang['Save as']+' :</b> <span class="monitor_ext">'+d.ext+'</span></div><div><b>Status :</b> <span class="monitor_status">'+d.status+'</span></div></div><div class="icons text-center">'
            tmp+='<div class="btn-group btn-group-xs">'
                var buttons = {
                   "Pop": {
                      "label": "Pop",
                      "attr": "monitor=\"pop\"",
                      "class": "default",
                      "icon": "external-link"
                   },
                   "Power Viewer": {
                      "label": "Power Viewer",
                      "attr": "monitor=\"powerview\"",
                      "class": "default",
                      "icon": "map-marker"
                   },
                   "Videos List": {
                      "label": "Videos List",
                      "attr": "monitor=\"videos_table\"",
                      "class": "default",
                      "icon": "film"
                   },
                   "Monitor Settings": {
                      "label": "Monitor Settings",
                      "attr": "monitor=\"edit\"",
                      "class": "default",
                      "icon": "wrench"
                   }
                }
                if(!$.ccio.permissionCheck('video_view',d.mid)){
                    delete(buttons["Videos List"])
                    delete(buttons["Power Viewer"])
                }
                if(!$.ccio.permissionCheck('monitor_edit',d.mid)){
                    delete(buttons["Monitor Settings"])
                }
                $.each(buttons,function(n,v){
                    tmp+='<a class="btn btn-'+v.class+'" '+v.attr+' title="'+v.label+'"><i class="fa fa-'+v.icon+'"></i></a>'
                })
            tmp+='</div>\
            </div></div></div>';
            delete(d.src);
        break;
        case 2://monitor stream
            try{k.d=JSON.parse(d.details);}catch(er){k.d=d.details;}
            k.mode=$.ccio.init('humanReadMode',d.mode);
            var dataTarget = '.monitor_item[mid=\''+d.mid+'\'][ke=\''+d.ke+'\'][auth=\''+user.auth_token+'\']';
            tmp+='<div id="monitor_live_'+d.mid+user.auth_token+'" auth="'+user.auth_token+'" mid="'+d.mid+'" ke="'+d.ke+'" mode="'+k.mode+'" class="grid-stack-item monitor_item glM'+d.mid+user.auth_token+'"><div class="grid-stack-item-content">';
            tmp+='<div class="stream-block no-padding mdl-card__media mdl-color-text--grey-50">';
            tmp+='<div class="stream-objects"></div>';
            tmp+='<div class="stream-hud">'
            tmp+='<div class="camera_cpu_usage"><div class="progress"><div class="progress-bar progress-bar-danger" role="progressbar"><span></span></div></div></div>';
            tmp+='<div class="lamp" title="'+k.mode+'"><i class="fa fa-eercast"></i></div><div class="controls"><span title="'+lang['Currently viewing']+'" class="label label-default"><span class="viewers"></span></span> <a class="btn-xs btn-danger btn" monitor="mode" mode="record"><i class="fa fa-circle"></i> '+lang['Start Recording']+'</a> <a class="btn-xs btn-primary btn" monitor="mode" mode="start"><i class="fa fa-eye"></i> '+lang['Set to Watch Only']+'</a></div></div></div></div>'
            tmp+='<div class="mdl-card__supporting-text text-center">';
            tmp+='<div class="indifference detector-fade"><div class="progress"><div class="progress-bar progress-bar-danger" role="progressbar"><span></span></div></div></div>';
            tmp+='<div class="monitor_details">';
            tmp+='<div><span class="monitor_name">'+d.name+'</span><span class="monitor_not_record_copy">, '+lang['Recording FPS']+' : <span class="monitor_fps">'+d.fps+'</span></span></div>';
            tmp+='</div>';
            tmp+='<div class="btn-group btn-group-sm">'//start of btn list
                var buttons = {
                   "Snapshot": {
                      "label": "Snapshot",
                      "attr": "monitor=\"snapshot\"",
                      "class": "primary",
                      "icon": "camera"
                   },
                   "Show Logs": {
                      "label": "Show Logs",
                      "attr": "monitor=\"show_data\"",
                      "class": "warning",
                      "icon": "exclamation-triangle"
                   },
                   "Control": {
                      "label": "Control",
                      "attr": "monitor=\"control_toggle\"",
                      "class": "default arrows",
                      "icon": "arrows"
                   },
                   "Status Indicator": {
                      "label": "Status Indicator",
                      "attr": "monitor=\"watch_on\"",
                      "class": "success signal",
                      "icon": "plug"
                   },
                   "Pop": {
                      "label": "Pop",
                      "attr": "monitor=\"pop\"",
                      "class": "default",
                      "icon": "external-link"
                   },
                   "Calendar": {
                      "label": "Calendar",
                      "attr": "monitor=\"calendar\"",
                      "class": "default ",
                      "icon": "calendar"
                   },
                   "Power Viewer": {
                      "label": "Power Viewer",
                      "attr": "monitor=\"powerview\"",
                      "class": "default",
                      "icon": "map-marker"
                   },
                   "Time-lapse": {
                      "label": "Time-lapse",
                      "attr": "monitor=\"timelapse\"",
                      "class": "default",
                      "icon": "angle-double-right"
                   },
                   "Video Grid": {
                      "label": "Video Grid",
                      "attr": "monitor=\"video_grid\"",
                      "class": "default",
                      "icon": "th"
                   },
                   "Videos List": {
                      "label": "Videos List",
                      "attr": "monitor=\"videos_table\"",
                      "class": "default",
                      "icon": "film"
                   },
                   "Monitor Settings": {
                      "label": "Monitor Settings",
                      "attr": "monitor=\"edit\"",
                      "class": "default",
                      "icon": "wrench"
                   },
                   "Fullscreen": {
                      "label": "Fullscreen",
                      "attr": "monitor=\"fullscreen\"",
                      "class": "default",
                      "icon": "arrows-alt"
                   },
                   "Close": {
                      "label": "Close",
                      "attr": "monitor=\"watch_off\"",
                      "class": "danger",
                      "icon": "times"
                   }
                }
                if(!$.ccio.permissionCheck('video_view',d.mid)){
                    delete(buttons["Videos List"])
                    delete(buttons["Time-lapse"])
                    delete(buttons["Power Viewer"])
                    delete(buttons["Calendar"])
                }
                if(!$.ccio.permissionCheck('monitor_edit',d.mid)){
                    delete(buttons["Monitor Settings"])
                }
                $.each(buttons,function(n,v){
                    tmp+='<a class="btn btn-'+v.class+'" '+v.attr+' title="'+v.label+'"><i class="fa fa-'+v.icon+'"></i></a>'
                })
            tmp+='</div>';//end of btn list
            tmp+='</div>';//.stream-block
            tmp+='<div class="mdl-data_window pull-right">';
            tmp+='<div>';
            tmp+='<div class="data-menu col-md-6 no-padding videos_monitor_list glM'+d.mid+user.auth_token+' scrollable"><ul></ul></div>';
            tmp+='<div class="data-menu col-md-6 no-padding logs scrollable"></div>';
            tmp+='</div>';
            tmp+='</div>';//.mdl-data_window
            tmp+='</div>';//.grid-stack-content
            tmp+='</div>';//#monitor_live_...
        break;
        case 3://api key row
            tmp+='<tr api_key="'+d.code+'"><td class="code">'+d.code+'</td><td class="ip">'+d.ip+'</td><td class="time">'+d.time+'</td><td class="text-right"><a class="delete btn btn-xs btn-danger">&nbsp;<i class="fa fa-trash"></i>&nbsp;</a></td></tr>';
        break;
        case 4://log row, draw to global and monitor
            if(!d.time){d.time=$.ccio.init('t')}
            tmp+='<li class="log-item">'
            tmp+='<span>'
            tmp+='<div>'+d.ke+' : <b>'+d.mid+'</b></div>'
            tmp+='<span>'+d.log.type+'</span> '
            tmp+='<b class="time livestamp" title="'+d.time+'"></b>'
            tmp+='</span>'
            tmp+='<div class="message">'
            tmp+=$.ccio.init('jsontoblock',d.log.msg);
            tmp+='</div>'
            tmp+='</li>';
            $(z).each(function(n,v){
                v=$(v);
                if(v.find('.log-item').length>10){v.find('.log-item:last').remove()}
            })
        break;
        case 6://notification row
            if(!d.time){d.time=$.ccio.init('t')}
            if(!d.note.class){d.note.class=''}
            tmp+='<li class="note-item '+d.note.class+'" ke="'+d.ke+'" auth="'+user.auth_token+'" mid="'+d.id+'">'
            tmp+='<span>'
            tmp+='<div>'+d.ke+' : <b>'+d.id+'</b></div>'
            tmp+='<span>'+d.note.type+'</span> '
            tmp+='<b class="time livestamp" title="'+d.time+'"></b>'
            tmp+='</span>'
            tmp+='<div class="message">'
            tmp+=d.note.msg
            tmp+='</div>'
            tmp+='</li>';
        break;
        case'option':
            var selected = ''
            if(d.selected === true){selected = ' selected'}
            tmp+='<option auth="'+user.auth_token+'"'+selected+' value="'+d.id+'">'+d.name+'</option>'
        break;
        case'stream-element':
            try{k.d=JSON.parse(d.details);}catch(er){k.d=d.details}
            if($.ccio.mon[d.ke+d.mid+user.auth_token]&&$.ccio.mon[d.ke+d.mid+user.auth_token].previousStreamType===k.d.stream_type){
                return;
            }
            k.e=$('#monitor_live_'+d.mid+user.auth_token+' .stream-block');
            k.e.find('.stream-element').remove();
            if($.ccio.op().jpeg_on===true){
                tmp+='<img class="stream-element">';
            }else{
                switch(k.d.stream_type){
                    case'hls':case'flv':case'mp4':
                        tmp+='<video class="stream-element" autoplay></video>';
                    break;
                    case'mjpeg':
                        tmp+='<iframe class="stream-element"></iframe>';
                    break;
                    case'jpeg':
                        tmp+='<img class="stream-element">';
                    break;
                    default://base64//h265
                        tmp+='<canvas class="stream-element"></canvas>';
                    break;
                }
            }
            k.e.append(tmp).find('.stream-element').resize();
            if($.ccio.op().switches.monitorMuteAudio === 1){
                k.e.find('video').each(function(n,el){
                    el.muted = "muted"
                })
            }
        break;
        case'user-row':
            d.e=$('.user-row[uid="'+d.uid+'"][ke="'+d.ke+'"]')
            if(d.e.length===0){
                tmp+='<li class="user-row" uid="'+d.uid+'" ke="'+d.ke+'">';
                tmp+='<span><div><span class="mail">'+d.mail+'</span> : <b class="uid">'+d.uid+'</b></div><span>Logged in</span> <b class="time livestamped" title="'+d.logged_in_at+'"></b></span>';
                tmp+='</li>';
            }else{
                d.e.find('.mail').text(d.mail)
                d.e.find('.time').livestamp('destroy').toggleClass('livestamped livestamp').text(d.logged_in_at)
            }
            $.ccio.init('ls')
        break;
        case'detector-filters-where':
            if(!d)d={};
            d.id=$('#filters_where .row').length;
            if(!d.p1){d.p1='indifference'}
            if(!d.p2){d.p2='='}
            if(!d.p3){d.p3=''}
            if(!d.p4){d.p4='&&'}
            tmp+='<div class="row where-row">'
            tmp+='   <div class="form-group col-md-3">'
            tmp+='       <label>'
            tmp+='           <select class="form-control" where="p1">'
            tmp+='               <option value="indifference" selected>'+lang['Indifference']+'</option>'
            tmp+='               <option value="name">'+lang['Region Name']+'</option>'
            tmp+='               <option value="reason">'+lang['Reason']+'</option>'
            tmp+='               <option value="time">'+lang['Time']+'</option>'
            tmp+='               <option value="plug">'+lang['Detection Engine']+'</option>'
            tmp+='               <optgroup label="Matrix">'
            tmp+='                  <option value="tag">'+lang['Object Tag']+'</option>'
            tmp+='                  <option value="confidence">'+lang['Confidence']+'</option>'
            tmp+='                  <option value="x">'+lang['X Point']+'</option>'
            tmp+='                  <option value="y">'+lang['Y Point']+'</option>'
            tmp+='                  <option value="height">'+lang['Height']+'</option>'
            tmp+='                  <option value="width">'+lang['Width']+'</option>'
            tmp+='               </optgroup>'
            tmp+='           </select>'
            tmp+='       </label>'
            tmp+='   </div>'
            tmp+='   <div class="form-group col-md-3">'
            tmp+='       <label>'
            tmp+='           <select class="form-control" where="p2">'
            tmp+='               <option value="===" selected>'+lang['Equal to']+'</option>'
            tmp+='               <option value="!==">'+lang['Not Equal to']+'</option>'
            tmp+='               <option value="indexOf">'+lang['Contains']+'</option>'
            tmp+='               <option value="!indexOf">'+lang['Does Not Contain']+'</option>'
            tmp+='               <optgroup label="For Numbers">'
            tmp+='                  <option value=">=">'+lang['Greater Than or Equal to']+'</option>'
            tmp+='                  <option value=">">'+lang['Greater Than']+'</option>'
            tmp+='                  <option value="<">'+lang['Less Than']+'</option>'
            tmp+='                  <option value="<=">'+lang['Less Than or Equal to']+'</option>'
            tmp+='               </optgroup>'
            tmp+='           </select>'
            tmp+='       </label>'
            tmp+='   </div>'
            tmp+='   <div class="form-group col-md-3">'
            tmp+='       <label>'
            tmp+='           <input class="form-control" placeholder="Value" title="'+lang.Value+'" where="p3">'
            tmp+='       </label>'
            tmp+='   </div>'
            tmp+='   <div class="form-group col-md-3">'
            tmp+='       <label>'
            tmp+='           <select class="form-control" where="p4">'
            tmp+='               <option value="&&" selected>'+lang['AND']+'</option>'
            tmp+='               <option value="||">'+lang['OR']+'</option>'
            tmp+='           </select>'
            tmp+='       </label>'
            tmp+='   </div>'
            tmp+='</div>'
        break;
        case'filters-where':
            if(!d)d={};
            d.id=$('#filters_where .row').length;
            if(!d.p1){d.p1='mid'}
            if(!d.p2){d.p2='='}
            if(!d.p3){d.p3=''}
            tmp+='<div class="row where-row">';
            tmp+='   <div class="form-group col-md-4">';
            tmp+='       <label>';
            tmp+='           <select class="form-control" where="p1">';
            tmp+='               <option value="mid" selected>'+lang['Monitor ID']+'</option>';
            tmp+='               <option value="ext">'+lang['File Type']+'</option>';
            tmp+='               <option value="time">'+lang['Start Time']+'</option>';
            tmp+='               <option value="end">'+lang['End Time']+'</option>';
            tmp+='               <option value="size">'+lang['Filesize']+'</option>';
            tmp+='               <option value="status">'+lang['Video Status']+'</option>';
            tmp+='           </select>';
            tmp+='       </label>';
            tmp+='   </div>';
            tmp+='   <div class="form-group col-md-4">';
            tmp+='       <label>';
            tmp+='           <select class="form-control" where="p2">';
            tmp+='               <option value="=" selected>'+lang['Equal to']+'</option>';
            tmp+='               <option value="!=">'+lang['Not Equal to']+'</option>';
            tmp+='               <option value=">=">'+lang['Greater Than or Equal to']+'</option>';
            tmp+='               <option value=">">'+lang['Greater Than']+'</option>';
            tmp+='               <option value="<">'+lang['Less Than']+'</option>';
            tmp+='               <option value="<=">'+lang['Less Than or Equal to']+'</option>';
            tmp+='               <option value="LIKE">'+lang['Like']+'</option>';
            tmp+='               <option value="=~">'+lang['Matches']+'</option>';
            tmp+='               <option value="!~">'+lang['Not Matches']+'</option>';
            tmp+='               <option value="=[]">'+lang['In']+'</option>';
            tmp+='               <option value="![]">'+lang['Not In']+'</option>';
            tmp+='           </select>';
            tmp+='       </label>';
            tmp+='   </div>';
            tmp+='   <div class="form-group col-md-4">';
            tmp+='       <label>';
            tmp+='           <input class="form-control" placeholder="Value" title="'+lang.Value+'" where="p3">';
            tmp+='       </label>';
            tmp+='   </div>';
            tmp+='</div>';
        break;
        case 'link-set'://Link Shinobi - 1 set
            if(!d.host){d.host=''}
            if(!d.ke){d.ke=''}
            if(!d.api){d.api=''}
            if(!d.secure){d.secure="0"}
            tmp+='<div class="linksGroup" links="'+d.host+'">'
            tmp+='<h4 class="round-left">'+d.host+' <small>'+d.ke+'</small>&nbsp;<div class="pull-right"><a class="btn btn-danger btn-xs delete"><i class="fa fa-trash-o"></i></a></div></h4>'
            tmp+='<div class="form-group"><label><div><span>'+lang.Host+'</span></div><div><input class="form-control" link="host" value="'+d.host+'"></div></label></div>'
            tmp+='<div class="form-group"><label><div><span>'+lang['Group Key']+'</span></div><div><input class="form-control" link="ke" value="'+d.ke+'"></div></label></div>'
            tmp+='<div class="form-group"><label><div><span>'+lang['API Key']+'</span></div><div><input class="form-control" link="api" value="'+d.api+'"></div></label></div>'
            tmp+='<div class="form-group"><label><div><span>'+lang.Secure+' (HTTPS/WSS)</span></div><div><select class="form-control" link="secure"><option value="1">'+lang.Yes+'</option><option selected value="0">'+lang.No+'</option></select></div></label></div>'
            tmp+='</div>';
        break;
        case 'form-group'://Input Map Selector
            var fields = []
            if(d.fields){
                if(d.fields instanceof Object){
                    fields = [d]
                }else{
                    fields = d
                }
            }
            $.each(fields,function(n,v){
                var value,hidden
                if(!v.attribute)v.attribute='';
                if(!v.placeholder)v.placeholder='';
                if(!v.class)v.class='';
                if(!v.inputType)v.inputType='value';
                if(v.hidden){hidden='style="display:none"'}else{hidden=''};
                if(v.value){value='value=""'}else{value=''};
                tmp+='     <div class="form-group '+v.class+'" '+hidden+'>'
                tmp+='        <label><div><span>'+v.label+'</span></div>'
                tmp+='            <div>'
                switch(v.type){
                    case'text':
                    tmp+='<input class="form-control" '+v.inputType+'="'+v.name+'" placeholder="'+v.placeholder+'" "'+value+'" '+v.attribute+'>'
                    break;
                    case'selector':
                    tmp+='<select class="form-control" '+v.inputType+'="'+v.name+'" placeholder="'+v.placeholder+'" '+v.attribute+'>'
                    $.each(v.choices,function(m,b){
                        tmp+='<option value="'+b.value+'">'+b.label+'</option>'
                    })
                    tmp+='</select>'
                    break;
                }
                tmp+='            </div>'
                tmp+='        </label>'
                tmp+='      </div>'
            })
        break;
        case 'input-map-selector'://Input Map Selector
            if(!d.map){d.map=''}
            tmp+='     <div class="form-group map-row">'
            tmp+='        <label><div><span>'+lang['Map']+'</span></div>'
            tmp+='            <div>'
            tmp+='            <div class="input-group input-group-sm">'
            tmp+='<input class="form-control" map-input="map" value="'+d.map+'" placeholder="0">'
            tmp+='              <div class="input-group-btn">'
            tmp+='                  <a class="btn btn-danger delete_map_row">&nbsp;<i class="fa fa-trash-o"></i>&nbsp;</a>'
            tmp+='              </div>'
            tmp+='            </div>'
            tmp+='            </div>'
            tmp+='        </label>'
            tmp+='      </div>'
        break;
        case 'input-map'://Input Map Options
            var tempID = $.ccio.gid();
            if(!d.channel){
                var numberOfChannelsDrawn = $('#monSectionInputMaps .input-map').length
                d.channel=numberOfChannelsDrawn+1
            }
            var fields = [
//                    {
//                        name:'',
//                        class:'',
//                        placeholder:'',
//                        default:'',
//                        attribute:'',
//                        type:'text',
//                    },
                {
                    name:'type',
                    label:lang['Input Type'],
                    default:'h264',
                    attribute:'selector="h_i_'+tempID+'"',
                    type:'selector',
                    choices:[
                        {label:lang['H.264 / H.265 / H.265+'],value:'h264'},
                        {label:lang['JPEG'],value:'jpeg'},
                        {label:lang['MJPEG'],value:'mjpeg'},
                        {label:lang['HLS (.m3u8)'],value:'hls'},
                        {label:lang['MPEG-4 (.mp4 / .ts)'],value:'mp4'},
                        {label:lang['Local'],value:'local'},
                        {label:lang['Raw'],value:'raw'},
                    ]
                },
                {
                    name:'fulladdress',
                    label:lang['Full URL Path'],
                    placeholder:'Example : rtsp://admin:password@123.123.123.123/stream/1',
                    type:'text',
                },
                {
                    name:'sfps',
                    label:lang['Monitor Capture Rate'],
                    placeholder:'',
                    type:'text',
                },
                {
                    name:'aduration',
                    label:lang['Analyzation Duration'],
                    placeholder:'Example : 1000000',
                    type:'text',
                },
                {
                    name:'probesize',
                    label:lang['Probe Size'],
                    placeholder:'Example : 1000000',
                    type:'text',
                },
                {
                    name:'stream_loop',
                    label:lang['Loop Stream'],
                    class:'h_i_'+tempID+'_input h_i_'+tempID+'_mp4 h_i_'+tempID+'_raw',
                    hidden:true,
                    default:'0',
                    type:'selector',
                    choices:[
                        {label:'No',value:'0'},
                        {label:'Yes',value:'1'}
                    ]
                },
                {
                    name:'rtsp_transport',
                    label:lang['RTSP Transport'],
                    class:'h_i_'+tempID+'_input h_i_'+tempID+'_h264',
                    default:'0',
                    type:'selector',
                    choices:[
                        {label:'Auto',value:''},
                        {label:'TCP',value:'tcp'},
                        {label:'UDP',value:'udp'}
                    ]
                },
                {
                    name:'accelerator',
                    label:lang['Accelerator'],
                    attribute:'selector="h_accel_'+tempID+'"',
                    default:'0',
                    type:'selector',
                    choices:[
                        {label:'No',value:'0'},
                        {label:'Yes',value:'1'},
                    ]
                },
                {
                    name:'hwaccel',
                    label:lang['hwaccel'],
                    class:'h_accel_'+tempID+'_input h_accel_'+tempID+'_1',
                    hidden:true,
                    default:'',
                    type:'selector',
                    choices: $.ccio.HWAccelChoices
                },
                {
                    name:'hwaccel_vcodec',
                    label:lang['hwaccel_vcodec'],
                    class:'h_accel_'+tempID+'_input h_accel_'+tempID+'_1',
                    hidden:true,
                    default:'auto',
                    type:'selector',
                    choices:[
                        {label:lang['Auto'],value:'auto'},
                        {label:lang['h264_cuvid'],value:'h264_cuvid',group:'NVIDIA'},
                        {label:lang['hevc_cuvid'],value:'hevc_cuvid',group:'NVIDIA'},
                        {label:lang['mjpeg_cuvid'],value:'mjpeg_cuvid',group:'NVIDIA'},
                        {label:lang['mpeg4_cuvid'],value:'mpeg4_cuvid',group:'NVIDIA'},
                        {label:lang['h264_qsv'],value:'h264_qsv',group:'Quick Sync Video'},
                        {label:lang['hevc_qsv'],value:'hevc_qsv',group:'Quick Sync Video'},
                        {label:lang['mpeg2_qsv'],value:'mpeg2_qsv',group:'Quick Sync Video'},
                        {label:lang['h264_mmal'],value:'h264_mmal',group:'Raspberry Pi'},
                        {label:lang['mpeg2_mmal'],value:'mpeg2_mmal',group:'Raspberry Pi'},
                        {label:lang['mpeg4_mmal'],value:'mpeg4_mmal',group:'Raspberry Pi'},
                    ]
                },
                {
                    name:'hwaccel_device',
                    label:lang['hwaccel_device'],
                    class:'h_accel_'+tempID+'_input h_accel_'+tempID+'_1',
                    hidden:true,
                    placeholder:'Example : /dev/dri/video0',
                    type:'text',
                },
            ];
            tmp+='<div class="form-group-group forestgreen input-map" section id="monSectionMap'+tempID+'">'
            tmp+='  <h4>'+lang["Input"]+' <b>'+lang["Map"]+' : <span class="place">'+d.channel+'</span></b>'
            tmp+='  <div class="pull-right"><a class="btn btn-danger btn-xs delete"><i class="fa fa-trash-o"></i></a></div>'
            tmp+='  </h4>'
            $.each(fields,function(n,v){
                if(!v.attribute)v.attribute='';
                if(!v.placeholder)v.placeholder='';
                if(!v.class)v.class='';
                if(v.hidden){v.hidden='style="display:none"'}else{v.hidden=''};
                tmp+='     <div class="form-group '+v.class+'" '+v.hidden+'>'
                tmp+='        <label><div><span>'+v.label+'</span></div>'
                tmp+='            <div>'
                switch(v.type){
                    case'text':
                    tmp+='<input class="form-control" map-detail="'+v.name+'" placeholder="'+v.placeholder+'" '+v.attribute+'>'
                    break;
                    case'selector':
                    tmp+='<select class="form-control" map-detail="'+v.name+'" placeholder="'+v.placeholder+'" '+v.attribute+'>'
                        $.each(v.choices,function(m,b){
                            tmp+='<option value="'+b.value+'">'+b.label+'</option>'
                        })
                    tmp+='</select>'
                    break;
                }
                tmp+='            </div>'
                tmp+='        </label>'
                tmp+='      </div>'
            })
            tmp+='</div>'
        break;
        case 'stream-channel'://Stream Channel
            var tempID = $.ccio.gid();
            if(!d.channel){
                var numberOfChannelsDrawn = $('#monSectionStreamChannels .stream-channel').length
                d.channel=numberOfChannelsDrawn
            }
            tmp+='<div class="form-group-group blue stream-channel" section id="monSectionChannel'+tempID+'">'
            tmp+='  <h4>'+lang["Stream Channel"]+' <span class="place">'+d.channel+'</span>'
            tmp+='  <div class="pull-right"><a class="btn btn-danger btn-xs delete"><i class="fa fa-trash-o"></i></a></div>'
            tmp+='  </h4>'
//                tmp+='      <div class="form-group">'
//                tmp+='        <label><div><span>'+lang["Input Selector"]+'</span></div>'
//                tmp+='            <div><input class="form-control" channel-detail="stream_map" placeholder="0"></div>'
//                tmp+='        </label>'
//                tmp+='      </div>'
            tmp+='<div class="form-group-group forestgreen" input-mapping="stream_channel-'+d.channel+'">'
            tmp+='    <h4>'+lang['Input Feed']
            tmp+='        <div class="pull-right">'
            tmp+='            <a class="btn btn-success btn-xs add_map_row"><i class="fa fa-plus-square-o"></i></a>'
            tmp+='        </div>'
            tmp+='    </h4>'
            tmp+='    <div class="choices"></div>'
            tmp+='</div>'
            tmp+='     <div class="form-group">'
            tmp+='        <label><div><span>'+lang["Stream Type"]+'</span></div>'
            tmp+='            <div><select class="form-control" channel-detail="stream_type" selector="h_st_channel_'+tempID+'" triggerChange="#monSectionChannel'+tempID+' [channel-detail=stream_vcodec]" triggerChangeIgnore="b64,mjpeg">'
            tmp+='                <option value="mp4">'+lang["Poseidon"]+'</option>'
            tmp+='                <option value="rtmp">'+lang["RTMP Stream"]+'</option>'
            tmp+='                <option value="flv">'+lang["FLV"]+'</option>'
            tmp+='                <option value="h264">'+lang["Raw H.264 Stream"]+'</option>'
            tmp+='                <option value="hls">'+lang["HLS (includes Audio)"]+'</option>'
            tmp+='                <option value="mjpeg">'+lang["MJPEG"]+'</option>'
            tmp+='            </select></div>'
            tmp+='        </label>'
            tmp+='      </div>'
            tmp+='          <div class="h_st_channel_'+tempID+'_input h_st_channel_'+tempID+'_rtmp">'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Server URL"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="rtmp_server_url" placeholder="Example : rtmp://live-api.facebook.com:80/rtmp/"></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Stream Key"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="rtmp_stream_key" placeholder="Example : 1111111111?ds=1&a=xxxxxxxxxx"></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='          </div>'
            tmp+='      <div class="form-group h_st_channel_'+tempID+'_input h_st_channel_'+tempID+'_mjpeg" style="display:none">'
            tmp+='        <label><div><span>'+lang["# of Allow MJPEG Clients"]+'</span></div>'
            tmp+='            <div><input class="form-control" channel-detail="stream_mjpeg_clients" placeholder="20"></div>'
            tmp+='        </label>'
            tmp+='      </div>'
            tmp+='      <div class="h_st_channel_'+tempID+'_input h_st_channel_'+tempID+'_hls h_st_channel_'+tempID+'_rtmp h_st_channel_'+tempID+'_flv h_st_channel_'+tempID+'_mp4  h_st_channel_'+tempID+'_h264">'
            tmp+='          <div class="form-group">'
            tmp+='            <label><div><span>'+lang["HLS Video Encoder"]+'</span></div>'
            tmp+='                <div><select class="form-control" channel-detail="stream_vcodec" selector="h_hls_v_channel_'+tempID+'">'
            tmp+='                    <option value="no" selected>'+lang["Auto"]+'</option>'
            tmp+='                    <option value="libx264">'+lang["libx264"]+'</option>'
            tmp+='                    <option value="libx265">'+lang["libx265"]+'</option>'
            tmp+='                    <option value="copy" selected>'+lang["copy"]+'</option>'
            tmp+='                    <optgroup label="'+lang["Hardware Accelerated"]+'">'
            tmp+='                        <option value="h264_vaapi">'+lang["h264_vaapi"]+'</option>'
            tmp+='                        <option value="hevc_vaapi">'+lang["hevc_vaapi"]+'</option>'
            tmp+='                        <option value="h264_nvenc">'+lang["h264_nvenc"]+'</option>'
            tmp+='                        <option value="hevc_nvenc">'+lang["hevc_nvenc"]+'</option>'
            tmp+='                        <option value="h264_qsv">'+lang["h264_qsv"]+'</option>'
            tmp+='                        <option value="hevc_qsv">'+lang["hevc_qsv"]+'</option>'
            tmp+='                        <option value="mpeg2_qsv">'+lang["mpeg2_qsv"]+'</option>'
            tmp+='                        <option value="h264_omx">'+lang["h264_omx"]+'</option>'
            tmp+='                    </optgroup>'
            tmp+='                </select></div>'
            tmp+='            </label>'
            tmp+='          </div>'
            tmp+='          <div class="form-group">'
            tmp+='            <label><div><span>'+lang["HLS Audio Encoder"]+'</span></div>'
            tmp+='                <div><select class="form-control" channel-detail="stream_acodec">'
            tmp+='                    <option value="no" selected>'+lang["No Audio"]+'</option>'
            tmp+='                    <option value="">'+lang["Auto"]+'</option>'
            tmp+='                    <option value="aac">'+lang["aac"]+'</option>'
            tmp+='                    <option value="ac3">'+lang["ac3"]+'</option>'
            tmp+='                    <option value="libmp3lame">'+lang["libmp3lame"]+'</option>'
            tmp+='                    <option value="copy">'+lang["copy"]+'</option>'
            tmp+='                </select></div>'
            tmp+='            </label>'
            tmp+='          </div>'
            tmp+='      </div>'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Rate"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="stream_fps" placeholder=""></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='      <div class="h_st_channel_'+tempID+'_input h_st_channel_'+tempID+'_hls" style="display:none">'
            tmp+='          <div class="form-group">'
            tmp+='            <label><div><span>'+lang["HLS Segment Length"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="hls_time" placeholder="2"></div>'
            tmp+='            </label>'
            tmp+='          </div>'
            tmp+='          <div class="form-group">'
            tmp+='            <label><div><span>'+lang["HLS Preset"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="preset_stream" placeholder="ultrafast"></div>'
            tmp+='            </label>'
            tmp+='          </div>'
            tmp+='          <div class="form-group">'
            tmp+='            <label><div><span>'+lang["HLS List Size"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="hls_list_size" placeholder="2"></div>'
            tmp+='            </label>'
            tmp+='          </div>'
            tmp+='      </div>'
            tmp+='      <div class="h_st_channel_'+tempID+'_input h_st_channel_'+tempID+'_mjpeg h_st_channel_'+tempID+'_hls h_st_channel_'+tempID+'_rtmp h_st_channel_'+tempID+'_jsmpeg h_st_channel_'+tempID+'_flv h_st_channel_'+tempID+'_mp4  h_st_channel_'+tempID+'_h264 h_hls_v_channel_'+tempID+'_input h_hls_v_channel_'+tempID+'_libx264 h_hls_v_channel_'+tempID+'_libx265 h_hls_v_channel_'+tempID+'_h264_nvenc h_hls_v_channel_'+tempID+'_hevc_nvenc h_hls_v_channel_'+tempID+'_no" style="display:none">'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Quality"]+'</span></div>'
            tmp+='                <div><input class="form-control" placeholder="23" channel-detail="stream_quality"></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='          <div class="h_st_channel_'+tempID+'_input h_st_channel_'+tempID+'_rtmp">'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Video Bit Rate"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="stream_v_br" placeholder=""></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Audio Bit Rate"]+'</span></div>'
            tmp+='                <div><input class="form-control" channel-detail="stream_a_br" placeholder="128k"></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='          </div>'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Width"]+'</span></div>'
            tmp+='                <div><input class="form-control" type="number" min="1" channel-detail="stream_scale_x" placeholder="Example : 640"></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='              <div class="form-group">'
            tmp+='                <label><div><span>'+lang["Height"]+'</span></div>'
            tmp+='                <div><input class="form-control" type="number" min="1" channel-detail="stream_scale_y" placeholder="Example : 480"></div>'
            tmp+='                </label>'
            tmp+='              </div>'
            tmp+='          <div class="form-group">'
            tmp+='            <label><div><span>'+lang["Rotate"]+'</span></div>'
            tmp+='                    <div><select class="form-control" channel-detail="rotate_stream">'
            tmp+='                        <option value="no" selected>'+lang["No Rotation"]+'</option>'
            tmp+='                        <option value="2,transpose=2">'+lang["180 Degrees"]+'</option>'
            tmp+='                        <option value="0">'+lang["90 Counter Clockwise and Vertical Flip (default)"]+'</option>'
            tmp+='                        <option value="1">'+lang["90 Clockwise"]+'</option>'
            tmp+='                        <option value="2">'+lang["90 Clockwise and Vertical Flip"]+'</option>'
            tmp+='                        <option value="3">'+lang["90 Clockwise and Vertical Flip"]+'</option>'
            tmp+='                    </select></div>'
            tmp+='              </label>'
            tmp+='          </div>'
            tmp+='          <div class="form-group">'
            tmp+='            <label><div><span>'+lang["Video Filter"]+'</span></div>'
            tmp+='            <div><input class="form-control" channel-detail="svf"></div>'
            tmp+='            </label>'
            tmp+='          </div>'
            tmp+='          <div class="form-group">'
            tmp+='              <label><div><span>'+lang["Stream Flags"]+'</span></div>'
            tmp+='              <div><input class="form-control" channel-detail="cust_stream"></div>'
            tmp+='          </label>'
            tmp+='          </div>'
            tmp+='      </div>'
            tmp+='  </div>'
        break;
    }
    if(z && x !== 2){
        $(z).prepend(tmp)
    }
    switch(x){
        case 1:
            z='#monitors_list .link-monitors-list[auth="'+user.auth_token+'"][ke="'+d.ke+'"]'
            if($('.link-monitors-list[auth="'+user.auth_token+'"][ke="'+d.ke+'"]').length===0){
                $("#monitors_list").append('<div class="link-monitors-list" auth="'+user.auth_token+'" ke="'+d.ke+'"></div>')
                var options = {
                    cellHeight: 80,
                    verticalMargin: 10,
                };
                $(z).sortable({
                    stop : function(event,ui){
                        var order = {}
                        $('.link-monitors-list').each(function(n,block){
                            var el = $(this)
                            var ke = el.attr('ke')
                            var authToken = el.attr('auth')
                            var orderKey = ke + authToken
                            if(authToken === $user.auth_token)orderKey = 0
                            if(!order[orderKey])order[orderKey] = []
                            var monitorBlocks = $(this).find('.monitor_block')
                            $.each(monitorBlocks,function(n,block){
                                var mid = $(block).attr('mid')
                                order[orderKey].push(mid)
                            })
                        })
                        $user.details.monitorListOrder = order
                        $.ccio.cx({f:'monitorListOrder',monitorListOrder:order},user)
                    },
                    handle: '.title'
                })
            }
            $(z).prepend(tmp)
            // componentHandler.upgradeAllRegistered()
        break;
        case 0:case 4:
            $.ccio.init('ls');
        break;
        case 2:
            var x = 0;
            var y = 0;
            var width = $.grid.getMonitorsPerRow()
            var height = width;
            if(user.details && user.details.monitorOrder && user.details.monitorOrder[d.ke+d.mid]){
                var saved = user.details.monitorOrder[d.ke+d.mid];
                x = saved.x;
                y = saved.y;
                width = saved.width;
                height = saved.height;
            }
            var autoPlacement = false
            if($.ccio.op().switches.monitorOrder !== 1){
                autoPlacement = true
            }
            $(z).data('gridstack').addWidget($(tmp), x, y, width, height, autoPlacement);
            k.e=$('#monitor_live_'+d.mid+user.auth_token);
            try{
                if(JSON.parse(d.details).control=="1"){
                    k.e.find('[monitor="control_toggle"]').show()
                }else{
                    k.e.find('.pad').remove();
                    k.e.find('[monitor="control_toggle"]').hide()
                }
                $.ccio.tm('stream-element',d,null,user)
            }catch(re){$.ccio.log(re)}
            k.mid=d.mid
            k.mon=$.ccio.mon[d.ke+d.mid+user.auth_token]
            $.ccio.init('monitorInfo',k)
        break;
        case'detector-filters-where':
            $('#detector_filters_where').append(tmp);
            $('#detector_filters_where .row [where="p4"][disabled]').prop('disabled',false)
            $('#detector_filters_where .row:last [where="p1"]').val(d.p1)
            $('#detector_filters_where .row:last [where="p2"]').val(d.p2)
            $('#detector_filters_where .row:last [where="p3"]').val(d.p3)
            $('#detector_filters_where .row:last [where="p4"]').val(d.p4).prop('disabled',true)
        break;
        case'filters-where':
            $('#filters_where').append(tmp);
            $('#filters_where .row:last [where="p1"]').val(d.p1)
            $('#filters_where .row:last [where="p2"]').val(d.p2)
            $('#filters_where .row:last [where="p3"]').val(d.p3)
        break;
        case'input-map':
            var mapsList = $.aM.maps
            mapsList.append(tmp)
            mapsList.find('.input-map').last().find('[map-detail="aduration"]').change()
            return tempID;
        break;
        case'stream-channel':
            var channeList = $.aM.channels
            channeList.append(tmp)
            channeList.find('.stream-channel').last().find('[channel-detail="stream_vcodec"]').change()
            return tempID;
        break;
        case'link-set':
            $('[links="'+d.host+'"] [link="secure"]').val(d.secure).change()
        break;
    }
    return tmp;
}
$.ccio.pm=function(x,d,z,user){
    var tmp='';if(!d){d={}};
    if(!user){
        user=$user
    }
    switch(x){
        case 0:
            d.mon=$.ccio.mon[d.ke+d.mid+user.auth_token];
            d.ev='.glM'+d.mid+user.auth_token+'.videos_list ul,.glM'+d.mid+user.auth_token+'.videos_monitor_list ul';d.fr=$.ccio.fr.find(d.ev),d.tmp='';
            if(d.fr.length===0){$.ccio.fr.append('<div class="videos_list glM'+d.mid+user.auth_token+'"><h3 class="title">'+d.mon.name+'</h3><ul></ul></div>')}
            if(d.videos&&d.videos.length>0){
            $.each(d.videos,function(n,v){
                if(v.status!==0){
                    tmp+=$.ccio.tm(0,v,null,user)
                }
            })
            }else{
                $('.glM'+d.mid+user.auth_token+'.videos_list,.glM'+d.mid+user.auth_token+'.videos_monitor_list').appendTo($.ccio.fr)
                tmp+='<li class="notice novideos">No videos</li>';
            }
            $(d.ev).html(tmp);
            $.ccio.init('ls');
        break;
        case 3:
            z='#api_list';
            $(z).empty();
            $.each(d,function(n,v){
                tmp+=$.ccio.tm(3,v,null,user);
            })
        break;
        case'option':
            $.each(d,function(n,v){
                tmp+=$.ccio.tm('option',v,null,user);
            })
        break;
        case'user-row':
            $.each(d,function(n,v){
                tmp+=$.ccio.tm('user-row',v,null,user);
            })
            z='#users_online'
        break;
        case'link-set':
            $.sM.links.empty()
            $.each(d,function(n,v){
                tmp+=$.ccio.tm('link-set',v,'#linkShinobi',user)
            })
        break;
    }
    if(z){
        $(z).prepend(tmp)
    }
    return tmp;
}
