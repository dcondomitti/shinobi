module.exports = function(s){
    s.addCloudUploader = function(opt){
        s.loadGroupAppExtender(opt.loadGroupAppExtender)
        s.unloadGroupAppExtender(opt.unloadGroupAppExtender)
        s.insertCompletedVideoExtender(opt.insertCompletedVideoExtender)
        s.deleteVideoFromCloudExtensions[opt.name] = opt.deleteVideoFromCloudExtensions
        s.cloudDiskUseStartupExtensions[opt.name] = opt.cloudDiskUseStartupExtensions
        s.beforeAccountSave(opt.beforeAccountSave)
        s.onAccountSave(opt.onAccountSave)
        s.cloudDisksLoader(opt.name)
    }
    s.addSimpleUploader = function(opt){
        s.loadGroupAppExtender(opt.loadGroupAppExtender)
        s.unloadGroupAppExtender(opt.unloadGroupAppExtender)
        s.insertCompletedVideoExtender(opt.insertCompletedVideoExtender)
        s.beforeAccountSave(opt.beforeAccountSave)
        s.onAccountSave(opt.onAccountSave)
        s.onMonitorSave(opt.onMonitorSave)
    }
}
