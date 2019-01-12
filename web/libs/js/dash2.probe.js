$(document).ready(function(e){
//probe
$.pB={e:$('#probe')};$.pB.f=$.pB.e.find('form');$.pB.o=$.pB.e.find('.output_data');
$.pB.f.submit(function(e){

    $.pB.e.find('._loading').show()
    $.pB.o.empty();
    $.pB.e.find('.stop').show();
    $.pB.e.find('[type="submit"]').hide();

    e.preventDefault();e.e=$(this),e.s=e.e.serializeObject();
    e.s.url=e.s.url.trim();
    var flags = '';
    switch(e.s.mode){
        case'json':
            flags = '-v quiet -print_format json -show_format -show_streams';
        break;
    }
//    if(e.s.url.indexOf('{{JSON}}')>-1){
//        e.s.url='-v quiet -print_format json -show_format -show_streams '+e.s.url
//    }
    $.get($.ccio.init('location',$user)+$user.auth_token+'/probe/'+$user.ke+'?url='+e.s.url+'&flags='+flags,function(data){
        if(data.ok===true){
            var html
            try{
                html = $.ccio.init('jsontoblock',JSON.parse(data.result))
            }catch(err){
                html = data.result
            }
            $.pB.o.append(html)
        }else{
            $.ccio.init('note',{title:'Failed to Probe',text:data.error,type:'error'});
        }
        $.pB.e.find('._loading').hide()
        $.pB.o.append('<div><b>END</b></div>');
        $.pB.e.find('.stop').hide();
        $.pB.e.find('[type="submit"]').show();
    })
    return false;
});
$.pB.e.on('hidden.bs.modal',function(){
    $.pB.o.empty()
})
$.pB.e.find('.stop').click(function(e){
    e.e=$(this);
//    $.ccio.cx({f:'ffprobe',ff:'stop'})
});
})
