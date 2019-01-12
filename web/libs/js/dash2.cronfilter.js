$(document).ready(function(e){
//filters window
if(!$user.details.filters)$user.details.filters={};
$.fI={e:$('#filters')};$.fI.f=$.fI.e.find('form');
$.fI.md=$.fI.f.find('[detail]');
$.ccio.init('filters');
$.ccio.tm('filters-where');
$.fI.e.on('click','.where .add',function(e){
    $.ccio.tm('filters-where');
})
$.fI.e.on('click','.where .remove',function(e){
    e.e=$('#filters_where .row');
    if(e.e.length>1){
        e.e.last().remove();
    }
})
$('#saved_filters').change(function(e){
    e.e=$(this),e.id=e.e.val();
    $('#filters_where').empty()
    if(e.id&&e.id!==''){
        e.name=$user.details.filters[e.id].name;
        $.each($user.details.filters[e.id].where,function(n,v){
            $.ccio.tm('filters-where',v)
        });
        $.each($user.details.filters[e.id],function(n,v){
            if(n==='where'){return}
            $.fI.f.find('[name="'+n+'"]').val(v);
        });
    }else{
        e.name=lang['Add New'];
        $.fI.f.find('[name="id"]').val($.ccio.gid(5));
        $.ccio.tm('filters-where');
    }
    $.fI.e.find('.filter_name').text(e.name)
}).change()
$.fI.f.find('.delete').click(function(e){
    e.s=$.fI.f.serializeObject();
    $.confirm.e.modal('show');
    $.confirm.title.text(lang['Delete Filter']);
    e.html=lang.confirmDeleteFilter;
    $.confirm.body.html(e.html);
    $.confirm.click({title:lang['Delete Filter'],class:'btn-danger'},function(){
        $.ccio.cx({f:'settings',ff:'filters',fff:'delete',form:e.s})
    });
})
$.fI.f.submit(function(e){
    e.preventDefault();e.e=$(this),e.s=e.e.serializeObject();
    e.er=[];
    $.each(e.s,function(n,v){e.s[n]=v.trim()})
    e.s.where=[];
    e.e.find('.where-row').each(function(n,v){
        n={};
        $(v).find('[where]').each(function(m,b){
            b=$(b);
            n[b.attr('where')]=b.val().trim();
        })
        e.s.where.push(n)
    })
    $.ccio.cx({f:'settings',ff:'filters',fff:'save',form:e.s})
});
})
