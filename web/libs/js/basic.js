var tool = {}
tool.getVideoImage = function (path, secs, callback) {
  var me = this, video = document.createElement('video');
  var backCalled = false
  var finish = function(err,data){
      if(!backCalled){
          backCalled = true
          callback(err,data)
          clearTimeout(timeout)
      }
  }
  var timeout = setTimeout(function(){
      finish(new Error('Failed Getting Snap from Video'))
  },5000)
  video.onloadedmetadata = function() {
      video.play()
      this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration)
      video.pause()
  };
  video.onseeked = function(e) {
    var canvas = document.createElement('canvas')
    canvas.height = video.videoHeight
    canvas.width = video.videoWidth
    var ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    var base64 = canvas.toDataURL()
    finish(null, base64)
    delete(ctx)
    delete(video)
    delete(canvas)
  };
  video.onerror = function(e) {
      finish(e)
  };
  video.src = path;
}
tool.checkCorrectPathEnding = function(x){
    var length=x.length
    if(x.charAt(length-1)!=='/'){
        x=x+'/'
    }
    return x
}
