var P2P = require('pipe2pam');
var PamDiff = require('pam-diff');
module.exports = function(s,config){
    s.createPamDiffEngine = function(e){
        var width,
            height,
            globalSensitivity,
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
        if(e.details.detector_frame==='1'){
            fullFrame={
                name:'FULL_FRAME',
                sensitivity:globalSensitivity,
                points:[
                    [0,0],
                    [0,height],
                    [width,height],
                    [width,0]
                ]
            };
        }
        var regions = s.createPamDiffRegionArray(s.group[e.ke].mon_conf[e.id].details.cords,globalSensitivity,fullFrame);
        if(!s.group[e.ke].mon[e.id].noiseFilterArray)s.group[e.ke].mon[e.id].noiseFilterArray = {}
        var noiseFilterArray = s.group[e.ke].mon[e.id].noiseFilterArray
        Object.keys(regions.notForPam).forEach(function(name){
            if(!noiseFilterArray[name])noiseFilterArray[name]=[];
        })
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
                    confidence:trigger.percent,
                },
                plates:[],
                imgHeight:height,
                imgWidth:width
            }
            detectorObject.doObjectDetection = (s.ocv && e.details.detector_use_detect_object === '1')
            s.event('trigger',detectorObject)
        }
        var filterTheNoise = function(trigger){
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
    //                                    console.log(noiseFilterArray[trigger.name])
    //                                    console.log(theNoise)
            var triggerPercentWithoutNoise = trigger.percent - theNoise;
            if(triggerPercentWithoutNoise > regions.notForPam[trigger.name].sensitivity){
                sendTrigger(trigger);
            }
        }
        if(e.details.detector_noise_filter==='1'){
            s.group[e.ke].mon[e.id].pamDiff.on('diff', (data) => {
                data.trigger.forEach(filterTheNoise)
            })
        }else{
            s.group[e.ke].mon[e.id].pamDiff.on('diff', (data) => {
                data.trigger.forEach(sendTrigger)
            })
        }
    }
    s.createPamDiffRegionArray = function(regions,globalSensitivity,fullFrame){
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
            pamDiffCompliantArray.push({name: region.name, difference: 9, percent: region.sensitivity, polygon:region.polygon})
            arrayForOtherStuff[region.name] = region;
        })
        if(pamDiffCompliantArray.length===0){pamDiffCompliantArray = null}
        return {forPam:pamDiffCompliantArray,notForPam:arrayForOtherStuff};
    }
}
