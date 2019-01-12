$(document).ready(function(e){
//log viewer
$.log = {
    e : $('#logs_modal'),
    lm : $('#log_monitors'),
    dateRange : $('#logs_daterange'),
    loaded : {}
}
$.log.dateRange.daterangepicker({
    startDate:$.ccio.timeObject().subtract(moment.duration("5:00:00")),
    endDate:$.ccio.timeObject().add(moment.duration("24:00:00")),
    timePicker: true,
    timePicker24Hour: true,
    timePickerSeconds: true,
    timePickerIncrement: 30,
    locale: {
        format: 'MM/DD/YYYY h:mm A'
    }
},function(start, end, label){
    //change daterange
    $.log.lm.change()
});
$.log.table = $.log.e.find('table')
$.log.e.on('shown.bs.modal', function () {
    $.log.lm.find('option:not(.hard)').remove()
    $.each($.ccio.mon,function(n,v){
        v.id = v.mid
        $.ccio.tm('option',v,'#log_monitors')
    })
    $.log.lm.change()
})
$.log.lm.change(function(){
    e = {}
    e.v = $(this).val();
    e.urlSelector = e.v+'';
    if(e.v === 'all'){
        e.urlSelector = ''
    }
    e.dateRange = $.log.dateRange.data('daterangepicker');
    $.log.loaded.startDate = e.dateRange.startDate
    $.log.loaded.endDate = e.dateRange.endDate
    var url = $.ccio.init('location',$user)+$user.auth_token+'/logs/'+$user.ke+'/'+e.urlSelector+'?start='+$.ccio.init('th',$.log.loaded.startDate)+'&end='+$.ccio.init('th',$.log.loaded.endDate)
    $.get(url,function(d){
        $.log.loaded.url = url
        $.log.loaded.query = e.v
        $.log.loaded.rows = d
        e.tmp='';
        if(d.length === 0){
            e.tmp = '<tr class="text-center"><td>'+lang.NoLogsFoundForDateRange+'</td></tr>'
        }else{
            $.each(d,function(n,v){
                e.tmp+='<tr class="search-row"><td title="'+v.time+'" class="livestamp"></td><td>'+v.time+'</td><td>'+v.mid+'</td><td>'+$.ccio.init('jsontoblock',v.info)+'</td></tr>'
            })
        }
        $.log.table.find('tbody').html(e.tmp)
//        $.log.table.bootstrapTable()
        $.ccio.init('ls')
    })
})
$.log.e.find('[download]').click(function(){
    $.ccio.downloadJSON($.log.loaded,'Shinobi_Logs_'+(new Date())+'.json',{
        title : 'No Logs Found',
        text : 'No file will be downloaded.',
    })
})
})
