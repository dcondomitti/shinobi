$(document).ready(function(e){
//settings window
$.sM={e:$('#settings')};
$.sM.f=$.sM.e.find('form');
$.sM.links=$('#linkShinobi');
$.sM.g=$('#settings_mon_groups');
$.sM.md=$.sM.f.find('[detail]');
$.sM.md.change($.ccio.form.details);
$.sM.f.find('[selector]').change(function(e){
    e.v=$(this).val();e.a=$(this).attr('selector')
    $.sM.f.find('.'+e.a+'_input').hide()
    $.sM.f.find('.'+e.a+'_'+e.v).show();
    $.sM.f.find('.'+e.a+'_text').text($(this).find('option:selected').text())
});
$.sM.writewMonGroups=function(){
    $.sM.f.find('[detail="mon_groups"]').val(JSON.stringify($user.mon_groups)).change()
}
$.sM.reDrawMonGroups=function(){
    $.sM.g.empty();
    $.ccio.pm('option',$user.mon_groups,'#settings_mon_groups')
    $.sM.g.change();
};
$.sM.f.submit(function(e){
    e.preventDefault();
    $.sM.writewMonGroups()
    $.sM.linkChange()
    e.e=$(this),e.s=e.e.serializeObject();
    e.er=[];
    if(e.s.pass!==''&&e.password_again===e.s.pass){e.er.push(lang['Passwords don\'t match'])};
    if(e.er.length>0){$.sM.e.find('.msg').html(e.er.join('<br>'));return;}
    $.each(e.s,function(n,v){e.s[n]=v.trim()})
    $.ccio.cx({f:'settings',ff:'edit',form:e.s})
    $.sM.e.modal('hide')
});
$.sM.e.on('shown.bs.modal',function(){
    $.sM.reDrawMonGroups()
})
$.sM.g.change(function(e){
    e.v=$(this).val();
    e.group=$user.mon_groups[e.v];
    if(!e.group){return}
    $.sM.selectedMonGroup=e.group;
    $.each(e.group,function(n,v){
        $.sM.f.find('[group="'+n+'"]').val(v)
    })
});
$.sM.f.find('[group]').change(function(){
    e = {}
    e.v = $.sM.g.val()
    if(!e.v||e.v==''){
        e.e = $.sM.f.find('[group="name"]')
        e.name = e.e.val()
        $('.mon_groups .add').click();
        e.v = $.sM.g.val()
        e.e.val(e.name)
    }
    e.group=$user.mon_groups[e.v];
    $.sM.f.find('[group]').each(function(n,v){
        v=$(v)
        e.group[v.attr('group')]=v.val()
    });
    $user.mon_groups[e.v]=e.group;
    $.sM.g.find('option[value="'+$.sM.g.val()+'"]').text(e.group.name)
    $.sM.writewMonGroups()
})
$.sM.f.on('click','.mon_groups .delete',function(e){
    e.v=$.sM.g.val();
    delete($user.mon_groups[e.v]);
    $.sM.reDrawMonGroups()
})
$.sM.f.on('click','.mon_groups .add',function(e){
    e.gid=$.ccio.gid(5);
    $user.mon_groups[e.gid]={id:e.gid,name:e.gid};
    $.sM.g.append($.ccio.tm('option',$user.mon_groups[e.gid]));
    $.sM.g.val(e.gid)
    $.sM.g.change();
});
$.sM.linkChange=function(){
    var e={};
    e.e=$.sM.e.find('[name="details"]')
    e.details=JSON.parse(e.e.val())
    e.details.links=[]
    $.sM.links.find('.linksGroup').each(function(n,v){
        var arr={}
        $(v).find('[link]').each(function(m,b){
            arr[$(b).attr('link')]=$(b).val()
        })
        e.details.links.push(arr)
    })
    e.e.val(JSON.stringify(e.details))
}
$.sM.f.on('change','[link]',$.sM.linkChange)
$.sM.e.on('click','.linkShinobi .delete',function(){
    $(this).parents('.linksGroup').remove()
    $.sM.linkChange()
})
$.sM.e.find('.linkShinobi .add').click(function(){
    $.ccio.tm('link-set',{},'#linkShinobi')
    $.sM.linkChange()
})
})
