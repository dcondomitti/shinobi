$.ccio={
    fr:$('#files_recent'),
    mon:{},
    useUTC: <%- config.useUTC || false %>,
    definitions: <%-JSON.stringify(define)%>,
    libURL: '<%-window.libURL%>'
};
<% if(config.DropboxAppKey){ %>
    $.ccio.DropboxAppKey = '<%-window.DropboxAppKey%>'
<% } %>
$.ccio.HWAccelChoices = [
<% if(config.availableHWAccels) {
        var methods = {
            auto: {label:lang['Auto'],value:'auto'},
            drm: {label:lang['drm'],value:'drm'},
            cuvid: {label:lang['cuvid'],value:'cuvid'},
            vaapi: {label:lang['vaapi'],value:'vaapi'},
            qsv: {label:lang['qsv'],value:'qsv'},
            vdpau: {label:lang['vdpau'],value:'vdpau'},
            dxva2: {label:lang['dxva2'],value:'dxva2'},
            vdpau: {label:lang['vdpau'],value:'vdpau'},
            videotoolbox: {label:lang['videotoolbox'],value:'videotoolbox'}
        }
        config.availableHWAccels.forEach(function(availibleMethod){
            if(methods[availibleMethod]){ %>
                <%- JSON.stringify(methods[availibleMethod]) %>,
            <% }
        })
    }
 %>
]
try{
    $user.details = JSON.parse($user.details)
}catch(err){

}
if(!$user.details.lang||$user.details.lang==''){
    $user.details.lang="<%-config.language%>"
}
switch($user.details.lang){
    case'ar'://Arabic
    case'bn'://Bengali
        $('body').addClass('right-to-left')
        $('.mdl-menu__item').each(function(n,v){
            v=$(v).find('i')
            v.appendTo(v.parent())
        })
    break;
}
window.chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
};
//global form functions
$.ccio.form={};
$.ccio.form.details=function(e){
    e.ar={},e.f=$(this).parents('form');
    $.each(e.f.find('[detail]'),function(n,v){
        v=$(v);e.ar[v.attr('detail')]=v.val();
    });
    e.f.find('[name="details"]').val(JSON.stringify(e.ar));
};
$(document).ready(function(e){

    //check switch UI
    e.o=$.ccio.op().switches;
    if(e.o){
        $.each(e.o,function(n,v){
            $('[system="switch"][switch="'+n+'"]').each(function(m,b){
                b=$(b);
                switch(b.attr('type')){
                    case'text':
                    if(v===1){
                        b.addClass('text-success')
                    }else{
                        b.removeClass('text-success')
                    }
                    break;
                 }
            })
        })
    }else{
        $.ccio.op('switches',{notifyHide:0})
    }
    //set class toggle preferences
    e.o=$.ccio.op().class_toggle;
    if(e.o){
        $.each(e.o,function(n,v){
            if(v[1]===1){
                $(n).addClass(v[0])
            }else{
                $(n).removeClass(v[0])
            }
        })
    }
    //set dropdown toggle preferences
    e.o = $.ccio.op().dropdown_toggle
    if(e.o){
        $.each(e.o,function(n,v){
            $('[dropdown_toggle="'+n+'"]').val(v).change()
        })
    }
    //set localStorage input values
    e.o = $.ccio.op()
    if(e.o){
        $.each(e.o,function(n,v){
            if(typeof v==='string'){
                var el = $('[localStorage="'+n+'"]')
                if(el.is(':checkbox') === false){
                    el.val(v)
                }
            }
        })
    }
    document.addEventListener("fullscreenchange", onFullScreenChange, false);
    document.addEventListener("webkitfullscreenchange", onFullScreenChange, false);
    document.addEventListener("mozfullscreenchange", onFullScreenChange, false);
    function onFullScreenChange() {
        var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
        if(!fullscreenElement){
            $('.fullscreen').removeClass('fullscreen')
            setTimeout(function(){
                $('canvas.stream-element').resize();
            },2000)
        }
    }
})
