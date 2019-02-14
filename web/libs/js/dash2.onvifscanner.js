$(document).ready(function(e){
//onvif probe
$.oB={
    e:$('#onvif_probe'),
    v:$('#onvif_video'),
};
$.oB.f=$.oB.e.find('form');$.oB.o=$.oB.e.find('.output_data');
$.oB.f.submit(function(ee){
    ee.preventDefault();
    e={};
    $.oB.foundMonitors={}
    e.e=$(this),e.s=e.e.serializeObject();
    $.oB.o.empty();
    $.oB.e.find('._loading').show()
    $.oB.e.find('[type="submit"]').prop('disabled',true)
    $.ccio.cx({f:'onvif',ip:e.s.ip,port:e.s.port,user:e.s.user,pass:e.s.pass})
    clearTimeout($.oB.checkTimeout)
    $.oB.checkTimeout=setTimeout(function(){
        if($.oB.o.find('tr').length===0){
            $.oB.e.find('._loading').hide()
            $.oB.e.find('[type="submit"]').prop('disabled',false)
            $.oB.o.append('<td class="text-center _notfound">Sorry, nothing was found.</td>')
        }
    },5000)
    return false;
});
$.oB.e.on('click','.copy',function(){
    $('.hidden-xs [monitor="edit"]').click();
    e={};
    e.e = $(this).parents('[onvif_row]');
    var id = e.e.attr('onvif_row');
    var onvifRecord = $.oB.foundMonitors[id];
    var streamURL = onvifRecord.uri;
    if($.oB.e.find('[name="user"]').val()!==''){
        streamURL = streamURL.split('://')
        streamURL = streamURL[0]+'://'+$.oB.e.find('[name="user"]').val()+':'+$.oB.e.find('[name="pass"]').val()+'@'+streamURL[1];
    }
    $.aM.e.find('[detail="auto_host"]').val(streamURL).change()
    $.aM.e.find('[name="mode"]').val('start')
    $.oB.e.modal('hide')
})
$.oB.e.find('[name="ip"]').change(function(e){
    $.ccio.op('onvif_probe_ip',$(this).val());
})
if($.ccio.op().onvif_probe_ip){
    $.oB.e.find('[name="ip"]').val($.ccio.op().onvif_probe_ip)
}
$.oB.e.find('[name="port"]').change(function(e){
    $.ccio.op('onvif_probe_port',$(this).val());
})
if($.ccio.op().onvif_probe_port){
    $.oB.e.find('[name="port"]').val($.ccio.op().onvif_probe_port)
}
$.oB.e.find('[name="user"]').change(function(e){
    $.ccio.op('onvif_probe_user',$(this).val());
})
if($.ccio.op().onvif_probe_user){
    $.oB.e.find('[name="user"]').val($.ccio.op().onvif_probe_user)
}
})
