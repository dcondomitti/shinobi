module.exports = function(s,config){
    ////// USER //////
    s.onSocketAuthenticationExtensions = []
    s.onSocketAuthentication = function(callback){
        s.onSocketAuthenticationExtensions.push(callback)
    }
    //
    s.loadGroupExtensions = []
    s.loadGroupExtender = function(callback){
        s.loadGroupExtensions.push(callback)
    }
    //
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
    s.onStalePurgeLockExtensions = []
    s.onStalePurgeLock = function(callback){
        s.onStalePurgeLockExtensions.push(callback)
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
    //
    s.onMonitorStartExtensions = []
    s.onMonitorStart = function(callback){
        s.onMonitorStartExtensions.push(callback)
    }
    //
    s.onMonitorStopExtensions = []
    s.onMonitorStop = function(callback){
        s.onMonitorStopExtensions.push(callback)
    }
    //
    s.onMonitorSaveExtensions = []
    s.onMonitorSave = function(callback){
        s.onMonitorSaveExtensions.push(callback)
    }
    //
    s.onMonitorUnexpectedExitExtensions = []
    s.onMonitorUnexpectedExit = function(callback){
        s.onMonitorUnexpectedExitExtensions.push(callback)
    }
    //
    s.onDetectorNoTriggerTimeoutExtensions = []
    s.onDetectorNoTriggerTimeout = function(callback){
        s.onDetectorNoTriggerTimeoutExtensions.push(callback)
    }
    //
    s.onFfmpegCameraStringCreationExtensions = []
    s.onFfmpegCameraStringCreation = function(callback){
        s.onFfmpegCameraStringCreationExtensions.push(callback)
    }
    //
    s.onMonitorPingFailedExtensions = []
    s.onMonitorPingFailed = function(callback){
        s.onMonitorPingFailedExtensions.push(callback)
    }
    //
    s.onMonitorDiedExtensions = []
    s.onMonitorDied = function(callback){
        s.onMonitorDiedExtensions.push(callback)
    }

    ///////// SYSTEM ////////
    s.onProcessReadyExtensions = []
    s.onProcessReady = function(callback){
        s.onProcessReadyExtensions.push(callback)
    }
    //
    s.onProcessExitExtensions = []
    s.onProcessExit = function(callback){
        s.onProcessExitExtensions.push(callback)
    }
    //
    s.onBeforeDatabaseLoadExtensions = []
    s.onBeforeDatabaseLoad = function(callback){
        s.onBeforeDatabaseLoadExtensions.push(callback)
    }
    //
    s.onFFmpegLoadedExtensions = []
    s.onFFmpegLoaded = function(callback){
        s.onFFmpegLoadedExtensions.push(callback)
    }
    //
    s.beforeMonitorsLoadedOnStartupExtensions = []
    s.beforeMonitorsLoadedOnStartup = function(callback){
        s.beforeMonitorsLoadedOnStartupExtensions.push(callback)
    }
    //
    s.onWebSocketConnectionExtensions = []
    s.onWebSocketConnection = function(callback){
        s.onWebSocketConnectionExtensions.push(callback)
    }
    //
    s.onWebSocketDisconnectionExtensions = []
    s.onWebSocketDisconnection = function(callback){
        s.onWebSocketDisconnectionExtensions.push(callback)
    }
    //
}
