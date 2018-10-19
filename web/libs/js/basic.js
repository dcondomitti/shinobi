var tool = {}
tool.getVideoImage = function (path, secs, callback) {
  var me = this, video = document.createElement('video');
  video.onloadedmetadata = function() {
    this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration)
  };
  video.onseeked = function(e) {
    var canvas = document.createElement('canvas')
    canvas.height = video.videoHeight
    canvas.width = video.videoWidth
    var ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    var base64 = canvas.toDataURL()
    callback(null, base64)
    // delete(ctx)
    // delete(video)
    // delete(canvas)
  };
  video.onerror = function(e) {
    callback(e);
  };
  video.src = path;
}
