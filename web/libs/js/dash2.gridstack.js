$(document).ready(function(e){
//monitor grid
$.grid={e:$('#monitors_live')}
$.grid.data = function(){
    return $.grid.e.data('gridstack')
}
$.grid.getMonitorsPerRow = function(){
    var x
    switch($.ccio.op().montage){
        case'1':
            x = '12'
        break;
        case'2':
            x = '6'
        break;
        case'3':
            x = '4'
        break;
        case'4':
            x = '3'
        break;
        case'5':
            x = '5'
        break;
        case'6':
            x = '2'
        break;
       default://3
            x = '4'
        break;
    }
    return x
}
$.grid.saveElementPositions = function() {
    var monitors = {}
    $.grid.e.find(" .monitor_item").each(function(n,v){
        var el = $(v)
        var item = {}
        item.ke = el.attr('ke')
        item.mid = el.attr('mid')
        item.x = el.attr('data-gs-x')
        item.y = el.attr('data-gs-y')
        item.height = el.attr('data-gs-height')
        item.width = el.attr('data-gs-width')
        monitors[item.ke+item.mid] = item
    })
    $user.details.monitorOrder=monitors;
    $.ccio.cx({f:'monitorOrder',monitorOrder:monitors})
}
$.grid.e
.gridstack({
    cellHeight: 80,
    verticalMargin: 0,
})
.on('dragstop', function(event,ui){
    setTimeout(function(){
        $.grid.saveElementPositions()
    },700)
})
.on('gsresizestop', $.grid.saveElementPositions);
})
