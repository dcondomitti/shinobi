$(document).ready(function(e){
//detector filters window
$.detectorFilters={e:$('#detector_filter')};
$.detectorFilters.f=$.detectorFilters.e.find('form');
$.detectorFilters.md=$.detectorFilters.f.find('[detail]');
$.detectorFilters.getSelected = function(){
    return $('#detector_filters').val()
}
$.detectorFilters.drawOptions = function(){
    var dFilters = $.detectorFilters.getCurrent()
    $('#detector_filters optgroup').empty()
    $.each(dFilters,function(n,dFilter){
        $.ccio.tm('option',{auth_token:$user.auth_token,id:dFilter.id,name:dFilter.filter_name},'#detector_filters optgroup')
    })
}
$.detectorFilters.getCurrent = function(){
    try{
        return JSON.parse($.aM.e.find('[detail="detector_filters"]').val())
    }catch(err){
        return {}
    }
}
$.detectorFilters.save = function(){
    var currentVals = $.detectorFilters.getCurrent()
    currentVals[$.detectorFilters.lastSave.id] = $.detectorFilters.lastSave
    $.aM.e.find('[detail="detector_filters"]').val(JSON.stringify(currentVals)).change()
}
$.ccio.tm('detector-filters-where');
$.detectorFilters.e.on('change','[where="p1"]',function(e){
    var el = $(this)
    var p1v = el.val()
    var parent = el.parents('.row')
    var p3 = parent.find('[where="p3"]')
    var options = []
    switch(p1v){
        case'time':
            options = [
                '00:00:00'
            ]
        break;
        case'reason':
            options = [
                'licensePlate',
                'object',
                'motion',
            ]
        break;
        case'plug':
            options = [
                'PythonYolo',
                'OpenCV',
                'built-in',
            ]
        break;
        case'tag':
            options = [
                'car',
                'tree',
                'pottedplant',
            ]
        break;
    }
    var msg = 'Value'
    if(options.length > 0){
        msg = 'Example : '+options.join(', ')
    }
    p3.attr('placeholder',msg)
})
$.detectorFilters.e.on('shown.bs.modal',function(e){
    $.detectorFilters.drawOptions()
})
$.detectorFilters.e.on('click','.where .add',function(e){
    $.ccio.tm('detector-filters-where');
})
$.detectorFilters.e.on('click','.where .remove',function(e){
    e.e=$('#detector_filters_where .row');
    if(e.e.length>1){
        e.e.last().remove();
        $('#detector_filters_where .row:last [where="p4"]').prop('disabled',true)
    }
})
$.detectorFilters.f.find('.delete').click(function(e){
    var currentVals = $.detectorFilters.getCurrent()
    var newObject = {}
    var deleteId = $.detectorFilters.getSelected()
    $.each(currentVals,function(id,obj){
        if(id === deleteId)return false;
        newObject[id] = obj
    })
    $.aM.e.find('[detail="detector_filters"]').val(JSON.stringify(newObject)).change()
    $.detectorFilters.drawOptions()
})
$('#detector_filters').change(function(){
    e = {}
    e.e=$(this),e.id=e.e.val();
    $('#detector_filters_where').empty()
    if(e.id&&e.id!==''){
        var currentFilter = $.detectorFilters.getCurrent()[e.id]
        e.name=currentFilter.name;
        $.each(currentFilter.where,function(n,v){
            $.ccio.tm('detector-filters-where',v)
        });
        $.each(currentFilter.actions,function(action,val){
            $.detectorFilters.e.find('[actions="'+action+'"]').val(val)
        });
        $.each(currentFilter,function(n,v){
            if(n==='where'){return}
            $.detectorFilters.f.find('[name="'+n+'"]').val(v);
        });
    }else{
        e.name=lang['Add New'];
        $.detectorFilters.f.find('[name="id"]').val($.ccio.gid(5));
        $.ccio.tm('detector-filters-where');
    }
    $.detectorFilters.e.find('.filter_name').text(e.name)
}).change()
$.detectorFilters.f.submit(function(ee){
    ee.preventDefault()
    e = {}
    e.e=$(this),e.s=e.e.serializeObject();
    e.er=[];
    $.each(e.s,function(n,v){e.s[n]=v.trim()})
    //create conditions object (where)
    e.s.where=[];
    e.e.find('.where-row').each(function(n,v){
        n={};
        $(v).find('[where]').each(function(m,b){
            b=$(b);
            n[b.attr('where')]=b.val().trim();
        })
        e.s.where.push(n)
    })
    // create actions object (do)
    e.s.actions={};
    e.e.find('.actions-row').each(function(n,v){
        b=$(v).find('[actions]');
        e.s.actions[b.attr('actions')] = b.val()
    })
    $.detectorFilters.lastSave = e.s
    $.detectorFilters.save()
    $.detectorFilters.e.modal('hide')
});
})
