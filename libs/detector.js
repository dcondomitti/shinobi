// Matrix In Region Libs >
var SAT = require('sat')
var V = SAT.Vector;
var P = SAT.Polygon;
// Matrix In Region Libs />
var P2P = require('pipe2pam')
// pamDiff is based on https://www.npmjs.com/package/pam-diff
var PamDiff = require('pam-diff')
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
            }
        }

        e.triggerTimer = {}

        var regions = s.createPamDiffRegionArray(regionJson,globalColorThreshold,globalSensitivity,fullFrame)

        s.group[e.ke].mon[e.id].pamDiff = new PamDiff({
            grayscale: 'luminosity',
            regions : regions.forPam,
            drawMatrix : e.details.detector_show_matrix
        });
        s.group[e.ke].mon[e.id].p2p = new P2P()
        var regionArray = Object.values(regionJson)
        if(config.detectorMergePamRegionTriggers === true){
            // merge pam triggers for performance boost
            var buildTriggerEvent = function(trigger){
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
                if(trigger.merged){
                    if(trigger.matrices)detectorObject.details.matrices = trigger.matrices
                    var filteredCount = 0
                    var filteredCountSuccess = 0
                    trigger.merged.forEach(function(triggerPiece){
                        var region = regionArray.find(x => x.name == triggerPiece.name)
                        s.checkMaximumSensitivity(e, region, detectorObject, function(err1) {
                            s.checkTriggerThreshold(e, region, detectorObject, function(err2) {
                                ++filteredCount
                                if(!err1 && !err2)++filteredCountSuccess
                                if(filteredCount === trigger.merged.length && filteredCountSuccess > 0){
                                    detectorObject.doObjectDetection = (s.ocv && e.details.detector_use_detect_object === '1')
                                    s.triggerEvent(detectorObject)
                                }
                            })
                        })
                    })
                }else{
                    if(trigger.matrix)detectorObject.details.matrices = [trigger.matrix]
                    var region = regionArray.find(x => x.name == detectorObject.name)
                    s.checkMaximumSensitivity(e, region, detectorObject, function(err1) {
                        s.checkTriggerThreshold(e, region, detectorObject, function(err2) {
                            if(!err1 && !err2){
                                detectorObject.doObjectDetection = (s.ocv && e.details.detector_use_detect_object === '1')
                                s.triggerEvent(detectorObject)
                            }
                        })
                    })
                }
            }
            if(e.details.detector_noise_filter==='1'){
                if(!s.group[e.ke].mon[e.id].noiseFilterArray)s.group[e.ke].mon[e.id].noiseFilterArray = {}
                var noiseFilterArray = s.group[e.ke].mon[e.id].noiseFilterArray
                Object.keys(regions.notForPam).forEach(function(name){
                    if(!noiseFilterArray[name])noiseFilterArray[name]=[];
                })
                s.group[e.ke].mon[e.id].pamDiff.on('diff', (data) => {
                    var filteredCount = 0
                    var filteredCountSuccess = 0
                    data.trigger.forEach(function(trigger){
                        s.filterTheNoise(e,noiseFilterArray,regions,trigger,function(err){
                            ++filteredCount
                            if(!err)++filteredCountSuccess
                            if(filteredCount === data.trigger.length && filteredCountSuccess > 0){
                                buildTriggerEvent(s.mergePamTriggers(data))
                            }
                        })
                    })
                })
            }else{
                s.group[e.ke].mon[e.id].pamDiff.on('diff', (data) => {
                    buildTriggerEvent(s.mergePamTriggers(data))
                })
            }
        }else{
            //config.detectorMergePamRegionTriggers NOT true
            //original behaviour, all regions have their own event.
            var buildTriggerEvent = function(trigger){
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
                s.checkMaximumSensitivity(e, region, detectorObject, function(err1) {
                    s.checkTriggerThreshold(e, region, detectorObject, function(err2) {
                        if(!err1 && ! err2){
                            detectorObject.doObjectDetection = (s.ocv && e.details.detector_use_detect_object === '1')
                            s.triggerEvent(detectorObject)
                        }
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
                            buildTriggerEvent(trigger)
                        })
                    })
                })
            }else{
                s.group[e.ke].mon[e.id].pamDiff.on('diff', (data) => {
                    data.trigger.forEach(buildTriggerEvent)
                })
            }
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
            callback(null,trigger)
        }else{
            callback(true)
        }
    }

    s.checkMaximumSensitivity = function(monitor, region, detectorObject, callback) {
        var logName = detectorObject.id + ':' + detectorObject.name
        var globalMaxSensitivity = parseInt(monitor.details.detector_max_sensitivity) || undefined
        var maxSensitivity = parseInt(region.max_sensitivity) || globalMaxSensitivity
        if (maxSensitivity === undefined || detectorObject.details.confidence <= maxSensitivity) {
            callback(null)
        } else {
            callback(true)
            if (monitor.triggerTimer[detectorObject.name] !== undefined) {
                clearTimeout(monitor.triggerTimer[detectorObject.name].timeout)
                monitor.triggerTimer[detectorObject.name] = undefined
            }
        }
    }

    s.checkTriggerThreshold = function(monitor, region, detectorObject, callback){
        var threshold = parseInt(region.threshold) || globalThreshold
        if (threshold <= 1) {
            callback(null)
        } else {
            if (monitor.triggerTimer[detectorObject.name] === undefined) {
                monitor.triggerTimer[detectorObject.name] = {
                    count : threshold,
                    timeout : null
                }
            }
            if (--monitor.triggerTimer[detectorObject.name].count == 0) {
                callback(null)
                clearTimeout(monitor.triggerTimer[detectorObject.name].timeout)
                monitor.triggerTimer[detectorObject.name] = undefined
            } else {
                callback(true)
                var fps = parseFloat(monitor.details.detector_fps) || 2
                if (monitor.triggerTimer[detectorObject.name].timeout !== null)
                    clearTimeout(monitor.triggerTimer[detectorObject.name].timeout)
                monitor.triggerTimer[detectorObject.name].timeout = setTimeout(function() {
                    monitor.triggerTimer[detectorObject.name] = undefined
                }, ((threshold+0.5) * 1000) / fps)
            }
        }
    }
    s.mergePamTriggers = function(data){
        if(data.trigger.length > 1){
            var n = 0
            var sum = 0
            var name = []
            var matrices = []
            data.trigger.forEach(function(trigger){
                name.push(trigger.name + ' ('+trigger.percent+'%)')
                ++n
                sum += trigger.percent
                if(trigger.matrix)matrices.push(trigger.matrix)
            })
            var average = sum / n
            name = name.join(', ')
            if(matrices.length === 0)matrices = null
            var trigger = {
                name: name,
                percent: parseInt(average),
                matrices: matrices,
                merged: data.trigger
            }
        }else{
            var trigger = data.trigger[0]
            trigger.matrices = [trigger.matrix]
        }
        return trigger
    }
    s.isAtleastOneMatrixInRegion = function(regions,matrices,callback){
        var regionPolys = []
        var matrixPoints = []
        regions.forEach(function(region,n){
            var polyPoints = []
            region.points.forEach(function(point){
                polyPoints.push(new V(parseInt(point[0]),parseInt(point[1])))
            })
            regionPolys[n] = new P(new V(0,0), polyPoints)
        })
        var collisions = []
        var foundInRegion = false
        matrices.forEach(function(matrix){
            var matrixPoints = [
                new V(matrix.x,matrix.y),
                new V(matrix.width,matrix.y),
                new V(matrix.width,matrix.height),
                new V(matrix.x,matrix.height)
            ]
            var matrixPoly = new P(new V(0,0), matrixPoints)
            regionPolys.forEach(function(region,n){
                var response = new SAT.Response()
                var collided = SAT.testPolygonPolygon(matrixPoly, region, response)
                if(collided === true){
                    collisions.push({
                        matrix: matrix,
                        region: regions[n]
                    })
                    foundInRegion = true
                }
            })
        })
        if(callback)callback(foundInRegion,collisions)
        return foundInRegion
    }
}
