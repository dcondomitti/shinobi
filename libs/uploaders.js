module.exports = function(s,config,lang){
    var loadLib = function(lib){
        return require('./uploaders/' + lib + '.js')
    }
    loadLib('loader')(s,config,lang)
    loadLib('backblazeB2')(s,config,lang)
    loadLib('amazonS3')(s,config,lang)
    loadLib('webdav')(s,config,lang)
    loadLib('wasabi')(s,config,lang)
    loadLib('sftp')(s,config,lang)
}
