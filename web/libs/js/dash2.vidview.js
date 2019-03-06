$(document).ready(function(e){
//videos window
$.vidview={
    e:$('#videos_viewer'),
    pages:$('#videos_viewer_pages'),
    limit:$('#videos_viewer_limit'),
    dr:$('#videos_viewer_daterange'),
    preview:$('#videos_viewer_preview'),
    set:$('#videos_viewer_set')
}
$.vidview.set.change(function(){
    var el = $(this)
    var isCloud = (el.val() === 'cloud')
    var zipDlButton = $.vidview.e.find('.export_selected,.merge_selected')
    if(isCloud){
        zipDlButton.hide()
    }else{
        zipDlButton.show()
    }

})
$.vidview.f=$.vidview.e.find('form')
$.vidview.dr.daterangepicker({
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
    $.vidview.launcher.click()
    $.vidview.dr.focus()
});
$.vidview.e.on('change','#videos_select_all',function(e){
    e.e=$(this);
    e.p=e.e.prop('checked')
    e.a=$.vidview.e.find('input[type=checkbox][name]')
    if(e.p===true){
        e.a.prop('checked',true)
    }else{
        e.a.prop('checked',false)
    }
})
$.vidview.f.submit(function(e){
    e.preventDefault();
    $.vidview.launcher.click()
    return false;
})
$('#videos_viewer_limit,#videos_viewer_daterange,#videos_viewer_set').change(function(){
    $.vidview.f.submit()
})
$.vidview.getSelected = function(getArray){
    var arr = {}
    if(getArray){
        arr = []
    }
    $.vidview.f.find('[data-ke] input:checked').each(function(n,v){
        v=$(v).parents('tr')
        if(getArray){
            arr.push({filename:v.attr('data-file'),mid:v.attr('data-mid'),auth:v.attr('data-auth')})
        }else{
            arr[v.attr('data-file')]={mid:v.attr('data-mid'),auth:v.attr('data-auth')}
        }
    })
    return arr
}
$.vidview.e.find('.delete_selected').click(function(){
    e = {}
    e.s = $.vidview.getSelected()
    if(Object.keys(e.s).length === 0){
        $.ccio.init('note',{
            title:'No Videos Selected',
            text:'You must choose at least one video.',
            type:'error'
        },$user);
        return
    }
    $.confirm.e.modal('show');
    $.confirm.title.text(lang['Delete Selected Videos'])
    e.html=lang.DeleteSelectedVideosMsg+'<div style="margin-bottom:15px"></div>'
    var deleteLinks = []
    $.each(e.s,function(n,v){
        e.html+=n+'<br>';
        if($.vidview.loadedVideos[n])deleteLinks.push($.vidview.loadedVideos[n].links.deleteVideo)
    })
    $.confirm.body.html(e.html)
    $.confirm.click({title:'Delete Video',class:'btn-danger'},function(){
        $.each(deleteLinks,function(n,link){
            $.getJSON(link,function(d){
                $.ccio.log(d)
            })
        })
    });
})
$.vidview.e.find('.export_selected').click(function(){
    e = {}
    var videos = $.vidview.getSelected(true)
    if(videos.length === 0){
        $.ccio.init('note',{
            title:'No Videos Selected',
            text:'You must choose at least one video.',
            type:'error'
        },$user);
        return
    }
    $.confirm.e.modal('show');
    $.confirm.title.text(lang['Export Selected Videos'])
    var html = lang.ExportSelectedVideosMsg+'<div style="margin-bottom:15px"></div>'
    $.each(videos,function(n,v){
        html+=v.filename+'<br>';
    })
    $.confirm.body.html(html)
    $.confirm.click({title:'Export Video',class:'btn-danger'},function(){
        var queryVariables = []
        queryVariables.push('videos='+JSON.stringify(videos))
        if($.ccio.useUTC === true){
            queryVariables.push('isUTC=true')
        }
        var downloadZip = $.ccio.init('location',$user)+$user.auth_token+'/zipVideos/'+$user.ke+'?'+queryVariables.join('&')
        $('#temp').html('<iframe>a</iframe>').find('iframe').attr('src',downloadZip);
    });
})
$.vidview.e.find('.merge_selected').click(function(){
    e = {}
    var videos = $.vidview.getSelected(true)
    if(videos.length === 0){
        $.ccio.init('note',{
            title:'No Videos Selected',
            text:'You must choose at least one video.',
            type:'error'
        },$user);
        return
    }
    $.confirm.e.modal('show');
    $.confirm.title.text(lang['Merge Selected Videos'])
    var html = lang.MergeSelectedVideosMsg+'<div style="margin-bottom:15px"></div>'
    $.each(videos,function(n,v){
        html+=v.filename+'<br>';
    })
    $.confirm.body.html(html)
    $.confirm.click({title:'Merge Video',class:'btn-danger'},function(){
        var queryVariables = []
        queryVariables.push('videos='+JSON.stringify(videos))
        if($.ccio.useUTC === true){
            queryVariables.push('isUTC=true')
        }
        var downloadZip = $.ccio.init('location',$user)+$user.auth_token+'/videosMerge/'+$user.ke+'?'+queryVariables.join('&')
        $('#temp').html('<iframe>a</iframe>').find('iframe').attr('src',downloadZip)
    });
})
$.vidview.pages.on('click','[page]',function(e){
    e.limit=$.vidview.limit.val();
    e.page=$(this).attr('page');
    $.vidview.current_page=e.page;
    if(e.limit.replace(/ /g,'')===''){
        e.limit='100';
    }
    if(e.limit.indexOf(',')>-1){
        e.limit=parseInt(e.limit.split(',')[1])
    }else{
        e.limit=parseInt(e.limit)
    }
    $.vidview.limit.val((parseInt(e.page)-1)+'00,'+e.limit)
    $.vidview.launcher.click()
})
$.vidview.e.on('click','.preview',function(e){
    e.preventDefault()
    e=$(this)
    $.vidview.preview.html('<video class="video_video" video="'+e.attr('href')+'" preload controls autoplay><source src="'+e.attr('href')+'" type="video/mp4"></video>')
})
})
