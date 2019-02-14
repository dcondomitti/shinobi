module.exports = function(s,config,lang){
    if(config.rtmpServer){
        var defaultRtmpServerConfig = {
            port: 1935,
            chunk_size: 60000,
            gop_cache: true,
            ping: 60,
            ping_timeout: 30
        }
        var runningRtmpServerConfig
        if(config.rtmpServer instanceof Object === 'false'){
            runningRtmpServerConfig = defaultRtmpServerConfig
        }else{
            runningRtmpServerConfig = Object.assign(defaultRtmpServerConfig,config.rtmpServer)
        }
        s.systemLog(`RTMP Server Running on port ${runningRtmpServerConfig.port}...`)
        var NodeRtmpServer = require('./rtmpserver/node_rtmp_server')
        var nmcs = new NodeRtmpServer({
            rtmp: runningRtmpServerConfig
        })
        nmcs.run()
    }
}
