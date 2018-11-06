var P2P = require('pipe2pam');
// pamDiff is based on https://www.npmjs.com/package/pam-diff
var PamDiff = require('./detectorPamDiff.js');
module.exports = function(s,config){
    s.createPamDiffEngine = function(e){
        var width,
            height,
            globalSensitivity,
            globalColorThreshold,
            fullFrame = false
        if(s.group[e.ke].mon_conf[e.id].details.detector_scale_x===''||s.group[e.ke].mon_conf[e.id].details.detector_scale_y===''){
            width = s.group[e.ke].mon_conf[e.id].details.detector_scale_x;
            height = s.group[e.ke].mon_conf[e.id].details.detector_scale_y;
        }else{
            width = e.width
            height = e.height
        }
        if(e.details.detector_sensitivity===''){
            globalSensitivity = 10
        }else{
            globalSensitivity = parseInt(e.details.detector_sensitivity)
        }
        if(e.details.detector_color_threshold===''){
            globalColorThreshold = 9
        }else{
            globalColorThreshold = parseInt(e.details.detector_color_threshold)
        }

        globalThreshold = parseInt(e.details.detector_threshold) || 0

        var regionJson
        try{
            regionJson = JSON.parse(s.group[e.ke].mon_conf[e.id].details.cords)
        }catch(err){
            regionJson = s.group[e.ke].mon_conf[e.id].details.cords
        }

        if(Object.keys(regionJson).length === 0 || e.details.detector_frame === '1'){
            fullFrame = {
                name:'FULL_FRAME',
                sensitivity:globalSensitivity,
                color_threshold:globalColorThreshold,
                points:[
                    [0,0],
                    [0,height],
                    [width,height],
                    [width,0]
                ]
            };
        }

        e.triggerTimer = {}

        var regions = s.createPamDiffRegionArray(regionJson,globalColorThreshold,globalSensitivity,fullFrame)

        s.group[e.ke].mon[e.id].pamDiff = new PamDiff({grayscale: 'luminosity', regions : regions.forPam});
        s.group[e.ke].mon[e.id].p2p = new P2P();
        var sendTrigger = function(trigger){
            var detectorObject = {
                f:'trigger',
                id:e.id,
                ke:e.ke,
                name:trigger.name,
                details:{
                    plug:'built-in',
                    name:trigger.name,
                    reason:'motion',
                    confidence:trigger.percent
                },
                plates:[],
                imgHeight:e.details.detector_scale_y,
                imgWidth:e.details.detector_scale_x
            }
            if(trigger.matrix)detectorObject.details.matrices = [trigger.matrix]
            var region = Object.values(regionJson).find(x => x.name == detectorObject.name)
            s.checkMaximumSensitivity(e, region, detectorObject, function() {
                s.checkTriggerThreshold(e, region, detectorObject, function() {
                    detectorObject.doObjectDetection = (s.ocv && e.details.detector_use_detect_object === '1')
                    s.triggerEvent(detectorObject)
                })
            })
        }
        if(e.details.detector_noise_filter==='1'){
            if(!s.group[e.ke].mon[e.id].noiseFilterArray)s.group[e.ke].mon[e.id].noiseFilterArray = {}
            var noiseFilterArray = s.group[e.ke].mon[e.id].noiseFilterArray
            Object.keys(regions.notForPam).forEach(function(name){
                if(!noiseFilterArray[name])noiseFilterArray[name]=[];
            })
            s.group[e.ke].mon[e.id].pamDiff.on('diff', (data) => {
                data.trigger.forEach(function(trigger){
                    s.filterTheNoise(e,noiseFilterArray,regions,trigger,function(){
                        sendTrigger(trigger)
                    })
                })
            })
        }else{
            s.group[e.ke].mon[e.id].pamDiff.on('diff', (data) => {
                data.trigger.forEach(sendTrigger)
            })
        }
    }

    s.createPamDiffRegionArray = function(regions,globalColorThreshold,globalSensitivity,fullFrame){
        var pamDiffCompliantArray = [],
            arrayForOtherStuff = [],
            json
        try{
            json = JSON.parse(regions)
        }catch(err){
            json = regions
        }
        if(fullFrame){
            json[fullFrame.name]=fullFrame;
        }
        Object.values(json).forEach(function(region){
            if(!region)return false;
            region.polygon = [];
            region.points.forEach(function(points){
                region.polygon.push({x:parseFloat(points[0]),y:parseFloat(points[1])})
            })
            if(region.sensitivity===''){
                region.sensitivity = globalSensitivity
            }else{
                region.sensitivity = parseInt(region.sensitivity)
            }
            if(region.color_threshold===''){
                region.color_threshold = globalColorThreshold
            }else{
                region.color_threshold = parseInt(region.color_threshold)
            }
            pamDiffCompliantArray.push({name: region.name, difference: region.color_threshold, percent: region.sensitivity, polygon:region.polygon})
            arrayForOtherStuff[region.name] = region;
        })
        if(pamDiffCompliantArray.length===0){pamDiffCompliantArray = null}
        return {forPam:pamDiffCompliantArray,notForPam:arrayForOtherStuff};
    }

    s.filterTheNoise = function(e,noiseFilterArray,regions,trigger,callback){
        if(noiseFilterArray[trigger.name].length > 2){
            var thePreviousTriggerPercent = noiseFilterArray[trigger.name][noiseFilterArray[trigger.name].length - 1];
            var triggerDifference = trigger.percent - thePreviousTriggerPercent;
            var noiseRange = e.details.detector_noise_filter_range
            if(!noiseRange || noiseRange === ''){
                noiseRange = 6
            }
            noiseRange = parseFloat(noiseRange)
            if(((trigger.percent - thePreviousTriggerPercent) < noiseRange)||(thePreviousTriggerPercent - trigger.percent) > -noiseRange){
                noiseFilterArray[trigger.name].push(trigger.percent);
            }
        }else{
            noiseFilterArray[trigger.name].push(trigger.percent);
        }
        if(noiseFilterArray[trigger.name].length > 10){
            noiseFilterArray[trigger.name] = noiseFilterArray[trigger.name].splice(1,10)
        }
        var theNoise = 0;
        noiseFilterArray[trigger.name].forEach(function(v,n){
            theNoise += v;
        })
        theNoise = theNoise / noiseFilterArray[trigger.name].length;
        var triggerPercentWithoutNoise = trigger.percent - theNoise;
        if(triggerPercentWithoutNoise > regions.notForPam[trigger.name].sensitivity){
            callback(trigger)
        }
    }

    s.checkMaximumSensitivity = function(monitor, region, detectorObject, success) {
        var logName = detectorObject.id + ':' + detectorObject.name
        var globalMaxSensitivity = parseInt(monitor.details.detector_max_sensitivity) || undefined
        var maxSensitivity = parseInt(region.max_sensitivity) || globalMaxSensitivity
        if (maxSensitivity === undefined || detectorObject.details.confidence <= maxSensitivity) {
            success()
        } else {
            if (monitor.triggerTimer[detectorObject.name] !== undefined) {
                clearTimeout(monitor.triggerTimer[detectorObject.name].timeout)
                monitor.triggerTimer[detectorObject.name] = undefined
            }
        }
    }

    s.checkTriggerThreshold = function(monitor, region, detectorObject, success){
        var threshold = parseInt(region.threshold) || globalThreshold
        if (threshold <= 1) {
            success()
        } else {
            if (monitor.triggerTimer[detectorObject.name] === undefined) {
                monitor.triggerTimer[detectorObject.name] = {
                    count : threshold,
                    timeout : null
                }
            }
            if (--monitor.triggerTimer[detectorObject.name].count == 0) {
                success()
                clearTimeout(monitor.triggerTimer[detectorObject.name].timeout)
                monitor.triggerTimer[detectorObject.name] = undefined
            } else {
                var fps = parseFloat(monitor.details.detector_fps) || 2
                if (monitor.triggerTimer[detectorObject.name].timeout !== null)
                    clearTimeout(monitor.triggerTimer[detectorObject.name].timeout)
                monitor.triggerTimer[detectorObject.name].timeout = setTimeout(function() {
                    monitor.triggerTimer[detectorObject.name] = undefined
                }, ((threshold+0.5) * 1000) / fps)
            }
        }
    }
}
