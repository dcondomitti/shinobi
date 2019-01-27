$.ccio.permissionCheck = function(toCheck,monitorId){
    var details = $user.details
    if(details.sub && details.allmonitors === '0'){
        var chosenValue = details[toCheck]
        if(details[toCheck] instanceof Array && chosenValue.indexOf(monitorId) > -1){
            return true
        }else if(chosenValue === '1'){
            return true
        }
    }else{
        return true
    }
    return false
}
$.ccio.op = function(r,rr,rrr){
    if(!rrr){rrr={};};if(typeof rrr === 'string'){rrr={n:rrr}};if(!rrr.n){rrr.n='ShinobiOptions_'+location.host}
    ii={o:localStorage.getItem(rrr.n)};try{ii.o=JSON.parse(ii.o)}catch(e){ii.o={}}
    if(!ii.o){ii.o={}}
    if(r&&rr&&!rrr.x){
        ii.o[r]=rr;
    }
    switch(rrr.x){
        case 0:
            delete(ii.o[r])
        break;
        case 1:
            delete(ii.o[r][rr])
        break;
    }
    localStorage.setItem(rrr.n,JSON.stringify(ii.o))
    return ii.o
}
$.ccio.log = function(x,y,z){
    if($.ccio.op().browserLog==="1"){
        if(!y){y=''};if(!z){z=''};
        console.log(x,y,z)
    }
}
$.ccio.gid = function(x){
    if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < x; i++ )
        t += p.charAt(Math.floor(Math.random() * p.length));
    return t;
};
$.ccio.downloadJSON = function(jsonToDownload,filename,errorResponse){
    var arr = jsonToDownload;
    if(arr.length===0 && errorResponse){
        errorResponse.type = 'error'
        $.ccio.init('note',errorResponse);
        return
    }
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(arr,null,3));
    $('#temp').html('<a></a>')
        .find('a')
        .attr('href',dataStr)
        .attr('download',filename)
        [0].click()
}
$.ccio.timeObject = function(time,isUTC){
    if(isUTC === true){
        return moment(time).utc()
    }
    return moment(time)
}
$.ccio.base64ArrayBuffer = function(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }

  return base64
}
$.ccio.snapshot=function(e,cb){
    var image_data,url;
    e.details=JSON.parse(e.mon.details);
    if($.ccio.op().jpeg_on!==true){
        var extend=function(image_data,width,height){
            var len = image_data.length
            var arraybuffer = new Uint8Array( len );
            for (var i = 0; i < len; i++)        {
                arraybuffer[i] = image_data.charCodeAt(i);
            }
            try {
                var blob = new Blob([arraybuffer], {type: 'application/octet-stream'});
            } catch (e) {
                var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder);
                bb.append(arraybuffer);
                var blob = bb.getBlob('application/octet-stream');
            }
            url = (window.URL || window.webkitURL).createObjectURL(blob);
            finish(url,image_data,width,height);
            try{
                setTimeout(function(){
                    URL.revokeObjectURL(url)
                },10000)
            }catch(er){}
        }
        var finish = function(url,image_data,width,height){
            cb(url,image_data,width,height);
        }
        switch(JSON.parse(e.mon.details).stream_type){
            case'hls':case'flv':case'mp4':
                $.ccio.snapshotVideo($('[mid='+e.mon.mid+'].monitor_item video')[0],function(base64,video_data,width,height){
                    extend(video_data,width,height)
                })
            break;
            case'mjpeg':
                $('#temp').html('<canvas></canvas>')
                var c = $('#temp canvas')[0];
                var img = $('img',$('[mid='+e.mon.mid+'].monitor_item .stream-element').contents())[0];
                c.width = img.width;
                c.height = img.height;
                var ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0,c.width,c.height);
                extend(atob(c.toDataURL('image/jpeg').split(',')[1]),c.width,c.height)
            break;
            case'h265':
                var c = $('[mid='+e.mon.mid+'].monitor_item canvas')[0];
                var ctx = c.getContext('2d');
                extend(atob(c.toDataURL('image/jpeg').split(',')[1]),c.width,c.height)
            break;
            case'b64':
                base64 = e.mon.last_frame.split(',')[1];
                var image_data = new Image();
                image_data.src = base64;
                extend(atob(base64),image_data.width,image_data.height)
            break;
            case'jpeg':case'h265':
                url=e.p.find('.stream-element').attr('src');
                image_data = new Image();
                image_data.src = url;
                finish(url,image_data,image_data.width,image_data.height);
            break;
        }
    }else{
        url=e.p.find('.stream-element').attr('src');
        image_data = new Image();
        image_data.src = url;
        cb(url,image_data,image_data.width,image_data.height);
    }
}
$.ccio.snapshotVideo=function(videoElement,cb){
    var image_data;
    var base64
    $('#temp').html('<canvas></canvas>')
    var c = $('#temp canvas')[0];
    var img = videoElement;
    c.width = img.videoWidth;
    c.height = img.videoHeight;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0,c.width,c.height);
    base64=c.toDataURL('image/jpeg')
    image_data=atob(base64.split(',')[1]);
    var arraybuffer = new ArrayBuffer(image_data.length);
    var view = new Uint8Array(arraybuffer);
    for (var i=0; i<image_data.length; i++) {
        view[i] = image_data.charCodeAt(i) & 0xff;
    }
    try {
        var blob = new Blob([arraybuffer], {type: 'application/octet-stream'});
    } catch (e) {
        var bb = new (window.WebKitBlobBuilder || window.MozBlobBuilder);
        bb.append(arraybuffer);
        var blob = bb.getBlob('application/octet-stream');
    }
    cb(base64,image_data,c.width,c.height);
}
$.ccio.magnifyStream = function(e){
    if(!e.p){
        e.e=$(this),
        e.p=e.e.parents('[mid]')
    }
    if(e.animate === true){
        var zoomGlassAnimate = 'animate'
    }else{
        var zoomGlassAnimate = 'css'
    }
    if(e.auto === true){
        var streamBlockOperator = 'position'
    }else{
        var streamBlockOperator = 'offset'
    }
    if(e.useCanvas === true){
        var magnifiedElement = 'canvas'
    }else{
        var magnifiedElement = 'iframe'
    }
    e.ke=e.p.attr('ke'),//group key
    e.mid=e.p.attr('mid'),//monitor id
    e.auth=e.p.attr('auth'),//authkey
    e.mon=$.ccio.mon[e.ke+e.mid+e.auth]//monitor configuration
    if(e.zoomAmount)e.mon.zoomAmount=3;
    if(!e.mon.zoomAmount)e.mon.zoomAmount=3;
    e.height=parseFloat(e.p.attr('realHeight')) * e.mon.zoomAmount//height of stream
    e.width=parseFloat(e.p.attr('realWidth')) * e.mon.zoomAmount;//width of stream
    var targetForZoom = e.p.find('.stream-element');
    zoomGlass = e.p.find(".zoomGlass");
    var zoomFrame = function(){
        var magnify_offset = e.p.find('.stream-block')[streamBlockOperator]();
        var mx = e.pageX - magnify_offset.left;
        var my = e.pageY - magnify_offset.top;
        var rx = Math.round(mx/targetForZoom.width()*e.width - zoomGlass.width()/2)*-1;
        var ry = Math.round(my/targetForZoom.height()*e.height - zoomGlass.height()/2)*-1;
        var px = mx - zoomGlass.width()/2;
        var py = my - zoomGlass.height()/2;
        zoomGlass[zoomGlassAnimate]({left: px, top: py}).find(magnifiedElement)[zoomGlassAnimate]({left: rx, top: ry});
    }
    if(!e.height||!e.width||zoomGlass.length===0){
        $.ccio.snapshot(e,function(url,buffer,width,height){
            e.width = width * e.mon.zoomAmount;
            e.height = height * e.mon.zoomAmount;
            e.p.attr('realWidth',width)
            e.p.attr('realHeight',height)
            zoomGlass = e.p.find(".zoomGlass");
            if(zoomGlass.length===0){
                if(e.useCanvas === true){
                    e.p.append('<div class="zoomGlass"><canvas class="blenderCanvas"></canvas></div>');
                }else{
                    e.p.append('<div class="zoomGlass"><iframe src="'+e.auth+'/embed/'+e.ke+'/'+e.mid+'/fullscreen|jquery|relative"/><div class="hoverShade"></div></div>');
                }
                zoomGlass = e.p.find(".zoomGlass");
            }
            zoomGlass.find(magnifiedElement).css({height:e.height,width:e.width});
            zoomFrame()
        })
    }else{
        zoomGlass.find(magnifiedElement).css({height:e.height,width:e.width});
        zoomFrame()
    }
}
$.ccio.destroyStream = function(d,user,killElement){
    if(d.mid && !d.id)d.id = d.mid
    console.log(d.ke+d.id+user.auth_token)
    console.log($.ccio.mon[d.ke+d.id+user.auth_token])
    if($.ccio.mon[d.ke+d.id+user.auth_token]){
        console.log('destroy')
        $.ccio.init('closeVideo',{mid:d.id,ke:d.ke},user);
        $.ccio.init('jpegModeStop',{mid:d.id,ke:d.ke},user);
        $.ccio.init('clearTimers',d,user)
        clearInterval($.ccio.mon[d.ke+d.id+user.auth_token].signal);delete($.ccio.mon[d.ke+d.id+user.auth_token].signal);
        $.ccio.mon[d.ke+d.id+user.auth_token].watch = 0;
        $.ccio.mon[d.ke+d.id+user.auth_token].PoseidonErrorCount = 0
        if($.ccio.mon[d.ke+d.id+user.auth_token].hls){$.ccio.mon[d.ke+d.id+user.auth_token].hls.destroy()}
        if($.ccio.mon[d.ke+d.id+user.auth_token].Poseidon){$.ccio.mon[d.ke+d.id+user.auth_token].Poseidon.stop()}
        if($.ccio.mon[d.ke+d.id+user.auth_token].Base64){$.ccio.mon[d.ke+d.id+user.auth_token].Base64.disconnect()}
        if($.ccio.mon[d.ke+d.id+user.auth_token].h265Socket){$.ccio.mon[d.ke+d.id+user.auth_token].h265Socket.disconnect()}
        if($.ccio.mon[d.ke+d.id+user.auth_token].h265Player){$.ccio.mon[d.ke+d.id+user.auth_token].h265Player.stop()}
        if($.ccio.mon[d.ke+d.id+user.auth_token].dash){$.ccio.mon[d.ke+d.id+user.auth_token].dash.reset()}
        if($.ccio.mon[d.ke+d.id+user.auth_token].h265HttpStream && $.ccio.mon[d.ke+d.id+user.auth_token].abort){
            $.ccio.mon[d.ke+d.id+user.auth_token].h265HttpStream.abort()
        }
        if(killElement){
            $.grid.data().removeWidget($('#monitor_live_'+d.id+user.auth_token))
        }
    }
}
