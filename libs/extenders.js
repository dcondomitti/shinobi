module.exports = function(s,config){
    ////// USER //////
    s.loadGroupAppExtensions = []
    s.loadGroupAppExtender = function(callback){
        s.loadGroupAppExtensions.push(callback)
    }
    //
    s.unloadGroupAppExtensions = []
    s.unloadGroupAppExtender = function(callback){
        s.unloadGroupAppExtensions.push(callback)
    }
    //
    s.cloudDisksLoaded = []
    s.cloudDisksLoader = function(storageType){
        s.cloudDisksLoaded.push(storageType)
    }
    //
    s.onAccountSaveExtensions = []
    s.onAccountSave = function(callback){
        s.onAccountSaveExtensions.push(callback)
    }
    //
    s.beforeAccountSaveExtensions = []
    s.beforeAccountSave = function(callback){
        s.beforeAccountSaveExtensions.push(callback)
    }
    //
    s.onTwoFactorAuthCodeNotificationExtensions = []
    s.onTwoFactorAuthCodeNotification = function(callback){
        s.onTwoFactorAuthCodeNotificationExtensions.push(callback)
    }
    //
    s.cloudDiskUseStartupExtensions = {}

    ////// EVENTS //////
    s.onEventTriggerExtensions = []
    s.onEventTrigger = function(callback){
        s.onEventTriggerExtensions.push(callback)
    }
    s.onEventTriggerBeforeFilterExtensions = []
    s.onEventTriggerBeforeFilter = function(callback){
        s.onEventTriggerBeforeFilterExtensions.push(callback)
    }
    s.onFilterEventExtensions = []
    s.onFilterEvent = function(callback){
        s.onFilterEventExtensions.push(callback)
    }

    ////// MONITOR //////
    s.onMonitorInitExtensions = []
    s.onMonitorInit = function(callback){
        s.onMonitorInitExtensions.push(callback)
    }
    s.onDetectorNoTriggerTimeoutExtensions = []
    s.onDetectorNoTriggerTimeout = function(callback){
        s.onDetectorNoTriggerTimeoutExtensions.push(callback)
    }
}
