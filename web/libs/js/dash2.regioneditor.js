$(document).ready(function(e){
//Region Editor
$.zO={e:$('#region_editor')};
$.zO.f=$.zO.e.find('form');
$.zO.o=function(){return $.zO.e.find('canvas')};
$.zO.c=$.zO.e.find('.canvas_holder');
$.zO.name=$.zO.e.find('[name="name"]');
$.zO.rl=$('#regions_list');
$.zO.rp=$('#regions_points');
$.zO.ca=$('#regions_canvas');
$.zO.saveCoords=function(){
    $.aM.e.find('[detail="cords"]').val(JSON.stringify($.zO.regionViewerDetails.cords)).change()
}
$.zO.initRegionList=function(){
    $('#regions_list,#region_points').empty();
    $.each($.zO.regionViewerDetails.cords,function(n,v){
        if(v&&v.name){
            $.zO.rl.append('<option value="'+n+'">'+v.name+'</option>')
        }
    });
    $.zO.rl.change();
}
$.zO.rl.change(function(e){
    $.zO.initCanvas();
})
$.zO.initLiveStream=function(e){
  var e={}
    e.re=$('#region_editor_live');
    e.re.find('iframe,img').attr('src','about:blank').hide()
    if($('#region_still_image').is(':checked')){
        e.re=e.re.find('img')
        e.choice='jpeg'
    }else{
        e.re=e.re.find('iframe')
        e.choice='embed'
    }
    e.src=$.ccio.init('location',$user)+$user.auth_token+'/'+e.choice+'/'+$user.ke+'/'+$.aM.selected.mid
    if(e.choice=='embed'){
        e.src+='/fullscreen|jquery|relative'
    }else{
         e.src+='/s.jpg'
    }
    if(e.re.attr('src')!==e.src){
        e.re.attr('src',e.src).show()
    }
    e.re.attr('width',$.zO.regionViewerDetails.detector_scale_x)
    e.re.attr('height',$.zO.regionViewerDetails.detector_scale_y)
}
$('#region_still_image').change(function(e){
    e.o=$.ccio.op().switches
    if(!e.o){e.o={}}
    if($(this).is(':checked')){
        e.o.regionStillImage=1
    }else{
        e.o.regionStillImage="0"
    }
    $.ccio.op('switches',e.o)
    $.zO.initLiveStream()
}).ready(function(e){
    e.switches=$.ccio.op().switches
    if(e.switches&&e.switches.regionStillImage===1){
        $('#region_still_image').prop('checked',true)
    }
})
$.zO.initCanvas=function(){
  var e={};
    e.ar=[];
    e.val=$.zO.rl.val();
    if(!e.val){
        $.zO.f.find('[name="name"]').val('')
        $.zO.f.find('[name="sensitivity"]').val('')
        $.zO.f.find('[name="max_sensitivity"]').val('')
        $.zO.f.find('[name="threshold"]').val('')
        $.zO.f.find('[name="color_threshold"]').val('')
        $.zO.rp.empty()
    }else{
        e.cord=$.zO.regionViewerDetails.cords[e.val];
        if(!e.cord.points){e.cord.points=[[0,0],[0,100],[100,0]]}
        $.each(e.cord.points,function(n,v){
            e.ar=e.ar.concat(v)
        });
        if(isNaN(e.cord.sensitivity)){
            e.cord.sensitivity=$.zO.regionViewerDetails.detector_sensitivity;
        }
        $.zO.f.find('[name="name"]').val(e.val)
        $.zO.e.find('.cord_name').text(e.val)
        $.zO.f.find('[name="sensitivity"]').val(e.cord.sensitivity)
        $.zO.f.find('[name="max_sensitivity"]').val(e.cord.max_sensitivity)
        $.zO.f.find('[name="threshold"]').val(e.cord.threshold)
        $.zO.f.find('[name="color_threshold"]').val(e.cord.color_threshold)
        $.zO.e.find('.canvas_holder canvas').remove();

        $.zO.initLiveStream()
        e.e=$.zO.ca.val(e.ar.join(','))
        e.e.canvasAreaDraw({
            imageUrl:placeholder.getData(placeholder.plcimg({
                bgcolor:'transparent',
                text:' ',
                size:$.zO.regionViewerDetails.detector_scale_x+'x'+$.zO.regionViewerDetails.detector_scale_y
            }))
        });
        e.e.change();
    }
}
$.zO.e.on('change','[name]:not([name="name"])',function(){
    var el = $(this)
    var val = el.val()
    var key = el.attr('name')
    $.zO.regionViewerDetails.cords[$.zO.rl.val()][key] = val
    $.zO.saveCoords()
})
$.zO.e.on('change','[name="name"]',function(e){
    e.old=$.zO.rl.val();
    e.new=$.zO.name.val();
    $.zO.regionViewerDetails.cords[e.new]=$.zO.regionViewerDetails.cords[e.old];
    delete($.zO.regionViewerDetails.cords[e.old]);
    $.zO.rl.find('option[value="'+e.old+'"]').attr('value',e.new).text(e.new)
    $.zO.saveCoords()
})
$.zO.e.on('change','[point]',function(e){
    e.points=[];
    $('[points]').each(function(n,v){
        v=$(v);
        n=v.find('[point="x"]').val();
        if(n){
            e.points.push([n,v.find('[point="y"]').val()])
        }
    })
    $.zO.regionViewerDetails.cords[$.zO.name.val()].points=e.points;
    $.zO.initCanvas();
})
$.zO.e.find('.erase').click(function(e){
    e.arr=[]
    $.each($.zO.regionViewerDetails.cords,function(n,v){
        if(v&&v!==$.zO.regionViewerDetails.cords[$.zO.rl.val()]){
            e.arr.push(v)
        }
    })
    $.zO.regionViewerDetails.cords=e.arr.concat([]);
    if(Object.keys($.zO.regionViewerDetails.cords).length>0){
        $.zO.initRegionList();
    }else{
        $.zO.f.find('input').prop('disabled',true)
        $('#regions_points tbody').empty()
        $('#regions_list [value="'+$.zO.rl.val()+'"]').remove()
        $.aM.e.find('[detail="cords"]').val('[]')
    }
});
//$.zO.e.find('.new').click(function(e){
//    $.zO.regionViewerDetails.cords[$.zO.rl.val()]
//    $.zO.initRegionList();
//})
$.zO.e.on('changed','#regions_canvas',function(e){
    e.val=$(this).val().replace(/(,[^,]*),/g, '$1;').split(';');
    e.ar=[];
    $.each(e.val,function(n,v){
        v=v.split(',')
        if(v[1]){
            e.ar.push([v[0],v[1]])
        }
    })
    $.zO.regionViewerDetails.cords[$.zO.rl.val()].points=e.ar;
    e.selected=$.zO.regionViewerDetails.cords[$.zO.rl.val()];
    e.e=$('#regions_points tbody').empty();
    $.each($.zO.regionViewerDetails.cords[$.zO.rl.val()].points,function(n,v){
        if(isNaN(v[0])){v[0]=20}
        if(isNaN(v[1])){v[1]=20}
        e.e.append('<tr points="'+n+'"><td><input class="form-control" placeholder="X" point="x" value="'+v[0]+'"></td><td><input class="form-control" placeholder="Y" point="y" value="'+v[1]+'"></td><td class="text-right"><a class="delete btn btn-danger"><i class="fa fa-trash-o"></i></a></td></tr>')
    });
    $.zO.saveCoords()
})
$.zO.f.submit(function(e){
    e.preventDefault();e.e=$(this),e.s=e.e.serializeObject();

    return false;
});
$('#regions_points')
.on('click','.delete',function(e){
    e.p=$(this).parents('tr'),e.row=e.p.attr('points');
    delete($.zO.regionViewerDetails.cords[$.zO.rl.val()].points[e.row])
    $.zO.saveCoords()
    e.p.remove();
    $.zO.rl.change();
})
$.zO.e.on('click','.add',function(e){
    $.zO.f.find('input').prop('disabled',false)
    e.gid=$.ccio.gid(5);
    e.save={};
    $.each($.zO.regionViewerDetails.cords,function(n,v){
        if(v&&v!==null&&v!=='null'){
            e.save[n]=v;
        }
    })
    $.zO.regionViewerDetails.cords=e.save;
    $.zO.regionViewerDetails.cords[e.gid]={name:e.gid,sensitivity:0.0005,max_sensitivity:'',threshold:1,color_threshold:9,points:[[0,0],[0,100],[100,0]]};
    $.zO.rl.append('<option value="'+e.gid+'">'+e.gid+'</option>');
    $.zO.rl.val(e.gid)
    $.zO.rl.change();
});
})
