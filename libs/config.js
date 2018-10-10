module.exports = function(s){
    s.location = {
        super : s.mainDirectory+'/super.json',
        config : s.mainDirectory+'/conf.json',
        languages : s.mainDirectory+'/languages'
    }
    var config = require(s.location.config);
    if(!config.productType){
        config.productType='CE'
    }
    //config defaults
    if(config.cpuUsageMarker === undefined){config.cpuUsageMarker='%Cpu'}
    if(config.customCpuCommand === undefined){config.customCpuCommand=null}
    if(config.autoDropCache === undefined){config.autoDropCache=true}
    if(config.doSnapshot === undefined){config.doSnapshot=true}
    if(config.restart === undefined){config.restart={}}
    if(config.systemLog === undefined){config.systemLog=true}
    if(config.deleteCorruptFiles === undefined){config.deleteCorruptFiles=true}
    if(config.restart.onVideoNotExist === undefined){config.restart.onVideoNotExist=true}
    if(config.ip === undefined||config.ip===''||config.ip.indexOf('0.0.0.0')>-1){config.ip='localhost'}else{config.bindip=config.ip};
    if(config.cron === undefined)config.cron={};
    if(config.cron.enabled === undefined)config.cron.enabled=true;
    if(config.cron.deleteOld === undefined)config.cron.deleteOld=true;
    if(config.cron.deleteNoVideo === undefined)config.cron.deleteNoVideo=true;
    if(config.cron.deleteNoVideoRecursion === undefined)config.cron.deleteNoVideoRecursion=false;
    if(config.cron.deleteOverMax === undefined)config.cron.deleteOverMax=true;
    if(config.cron.deleteOverMaxOffset === undefined)config.cron.deleteOverMaxOffset=0.9;
    if(config.cron.deleteLogs === undefined)config.cron.deleteLogs=true;
    if(config.cron.deleteEvents === undefined)config.cron.deleteEvents=true;
    if(config.cron.deleteFileBins === undefined)config.cron.deleteFileBins=true;
    if(config.cron.interval === undefined)config.cron.interval=1;
    if(config.databaseType === undefined){config.databaseType='mysql'}
    if(config.pluginKeys === undefined)config.pluginKeys={};
    if(config.databaseLogs === undefined){config.databaseLogs=false}
    if(config.useUTC === undefined){config.useUTC=false}
    if(config.iconURL === undefined){config.iconURL = "https://shinobi.video/libs/assets/icon/apple-touch-icon-152x152.png"}
    if(config.pipeAddition === undefined){config.pipeAddition=7}else{config.pipeAddition=parseInt(config.pipeAddition)}
    if(config.hideCloudSaveUrls === undefined){config.hideCloudSaveUrls = true}
    if(config.insertOrphans === undefined){config.insertOrphans = true}
    if(config.orphanedVideoCheckMax === undefined){config.orphanedVideoCheckMax = 20}
    //Child Nodes
    if(config.childNodes === undefined)config.childNodes = {};
        //enabled
        if(config.childNodes.enabled === undefined)config.childNodes.enabled = false;
        //mode, set value as `child` for all other machines in the cluster
        if(config.childNodes.mode === undefined)config.childNodes.mode = 'master';
        //child node connection port
        if(config.childNodes.port === undefined)config.childNodes.port = 8288;
        //child node connection key
        if(config.childNodes.key === undefined)config.childNodes.key = [
            '3123asdasdf1dtj1hjk23sdfaasd12asdasddfdbtnkkfgvesra3asdsd3123afdsfqw345'
        ];

    return config
}
