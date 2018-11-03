//
// Shinobi - OpenALPR Plugin
// Copyright (C) 2016-2025 Moe Alam, moeiscool
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
// Base Init >>
var fs = require('fs');
var config = require('./conf.json')
var exec = require('child_process').exec;
var s
try{
    s = require('../pluginBase.js')(__dirname,config)
}catch(err){
    console.log(err)
    try{
        s = require('./pluginBase.js')(__dirname,config)
    }catch(err){
        console.log(err)
        return console.log(config.plug,'Plugin start has failed. This may be because you started this plugin on another machine. Just copy the pluginBase.js file into this (plugin) directory.')
        return console.log(config.plug,'pluginBase.js was not found.')
    }
}
// Base Init />>
// OpenALPR Init >>
if(config.alprConfig===undefined){config.alprConfig=__dirname+'/openalpr.conf'}
// OpenALPR Init />>
s.detectObject = function(buffer,d,tx,frameLocation){
    var detectStuff = function(frame){
        try{
            exec('alpr -j --config '+config.alprConfig+' -c '+d.mon.detector_lisence_plate_country+' '+frame,{encoding:'utf8'},(err, scan, stderr) => {
                if(err){
                    s.systemLog(err);
                }else{
                    try{
                        try{
                            scan=JSON.parse(scan.replace('--(!)Loaded CUDA classifier','').trim())
                        }catch(err){
                            if(!scan||!scan.results){
                                return s.systemLog(scan,err);
                            }
                        }
  //                      console.log('scan',scan)
                        if(scan.results.length > 0){
                            scan.plates=[]
                            scan.mats=[]
                            scan.results.forEach(function(v){
                                v.candidates.forEach(function(g,n){
                                    if(v.candidates[n].matches_template){
                                        delete(v.candidates[n].matches_template)
                                    }
                                })
                                scan.plates.push({
                                    coordinates: v.coordinates,
                                    candidates: v.candidates,
                                    confidence: v.confidence,
                                    plate: v.plate
                                })
                                var width = Math.sqrt( Math.pow(v.coordinates[1].x - v.coordinates[0].x, 2) + Math.pow(v.coordinates[1].y - v.coordinates[0].y, 2));
                                var height = Math.sqrt( Math.pow(v.coordinates[2].x - v.coordinates[1].x, 2) + Math.pow(v.coordinates[2].y - v.coordinates[1].y, 2))
                                scan.mats.push({
                                    x: v.coordinates[0].x,
                                    y: v.coordinates[0].y,
                                    width: width,
                                    height: height,
                                    tag: v.plate
                                })
                            })
                            tx({
                                f: 'trigger',
                                id:  d.id,
                                ke: d.ke,
                                details: {
                                    plug: config.plug,
                                    name: 'licensePlate',
                                    reason: 'object',
                                    matrices: scan.mats,
                                    imgHeight: d.mon.detector_scale_y,
                                    imgWidth: d.mon.detector_scale_x,
                                    frame: d.base64
                                }
                            })
                        }
                    }catch(err){
                        s.systemLog(scan,err);
                    }
                }
                fs.unlink(frame,function(){

                })
            })
        }catch(err){
            console.log(err)
        }
    }
    if(frameLocation){
        detectStuff(frameLocation)
    }else{
        d.tmpFile=s.gid(5)+'.jpg'
        if(!fs.existsSync(s.dir.streams)){
            fs.mkdirSync(s.dir.streams);
        }
        d.dir=s.dir.streams+d.ke+'/'
        if(!fs.existsSync(d.dir)){
            fs.mkdirSync(d.dir);
        }
        d.dir=s.dir.streams+d.ke+'/'+d.id+'/'
        if(!fs.existsSync(d.dir)){
            fs.mkdirSync(d.dir);
        }
        fs.writeFile(d.dir+d.tmpFile,buffer,function(err){
            if(err) return s.systemLog(err);
            try{
                detectStuff(d.dir+d.tmpFile)
            }catch(error){
                console.error('Catch: ' + error);
            }
        })
    }
}
