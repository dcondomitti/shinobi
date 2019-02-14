$(document).ready(function(e){
//api window
$.apM={e:$('#apis')};$.apM.f=$.apM.e.find('form');
$.apM.md=$.apM.f.find('[detail]');
$.apM.md.change($.ccio.form.details).first().change();
$.apM.f.submit(function(e){
    e.preventDefault();e.e=$(this),e.s=e.e.serializeObject();
    e.er=[];
    if(!e.s.ip||e.s.ip.length<7){e.er.push('Enter atleast one IP')}
    if(e.er.length>0){$.apM.e.find('.msg').html(e.er.join('<br>'));return;}
    $.each(e.s,function(n,v){e.s[n]=v.trim()})
    // e.s = {
    //     "ip": "",
    //     "details": "{\"get_monitors\":\"1\",\"control_monitors\":\"1\",\"get_logs\":\"1\",\"watch_stream\":\"1\",\"watch_snapshot\":\"1\",\"watch_videos\":\"1\",\"delete_videos\":\"1\"}"
    // }
    $.post($.ccio.init('location',$user)+$user.auth_token+'/api/'+$user.ke+'/add',{data:JSON.stringify(e.s)},function(d){
        $.ccio.log(d)
    })
});
$.apM.e.on('click','.delete',function(e){
    e.e=$(this);e.p=e.e.parents('[api_key]'),e.code=e.p.attr('api_key');
    $.confirm.e.modal('show');
    $.confirm.title.text('Delete API Key');
    e.html='Do you want to delete this API key? You cannot recover it.';
    $.confirm.body.html(e.html);
    $.confirm.click({title:'Delete',class:'btn-danger'},function(){
        $.post($.ccio.init('location',$user)+$user.auth_token+'/api/'+$user.ke+'/delete',{data:JSON.stringify({code:e.code})},function(d){
            $.ccio.log(d)
        })
    })
})
})
