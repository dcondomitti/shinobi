//
// Shinobi - OpenCV Plugin
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
var s
try{
    s = require('../pluginBase.js')(__dirname,config)
}catch(err){
    console.log(err)
    try{
        s = require('./pluginBase.js')(__dirname,config)
    }catch(err){
        console.log(err)
        return console.log(config.plug,'Plugin start has failed. pluginBase.js was not found.')
    }
}
// Base Init />>
// OpenCV Init >>
var exec = require('child_process').exec;
var cv = require('opencv4nodejs');
if(config.cascadesDir===undefined){config.cascadesDir=__dirname+'/cascades/'}
if(config.alprConfig===undefined){config.alprConfig=__dirname+'/openalpr.conf'}
s.findCascades = function(callback){
    var foundCascades = []
    Object.keys(cv).forEach(function(cascade,n){
        if(cascade.indexOf('HAAR_') >- 1){
            foundCascades.push(cascade)
        }
    })
    s.cascadesInDir = foundCascades
    s.systemLog('Found '+foundCascades.length+' Cascades')
    callback(foundCascades)
}
s.findCascades(function(cascades){
    //get cascades
})
s.onPluginEventExtender(function(d,cn,tx){
    switch(d.f){
        case'refreshPlugins':
            s.findCascades(function(cascades){
                s.cx({f:'s.tx',data:{f:'detector_cascade_list',cascades:cascades},to:'GRP_'+d.ke})
            })
        break;
        case'readPlugins':
            s.cx({f:'s.tx',data:{f:'detector_cascade_list',cascades:s.cascadesInDir},to:'GRP_'+d.ke})
        break;
    }
})
// OpenCV Init />>
s.detectObject = function(buffer,d,tx,frameLocation){
    var detectStuff = function(frameBuffer,callback){
        if(d.mon.detector_lisence_plate==="1"){
            s.detectLicensePlate(buffer,d,tx,frameLocation)
        }
        if(!d.mon.detector_cascades || d.mon.detector_cascades === '')return;
        var selectedCascades = Object.keys(d.mon.detector_cascades);
        if(selectedCascades.length > 0){
          cv.imdecodeAsync(frameBuffer,(err,im) => {
              if(err){
                  console.log(err)
                  return
              }
              selectedCascades.forEach(function(cascade){
                  if(!cv[cascade]){
                      return s.systemLog('Attempted to use non existant cascade. : '+cascade)
                  }
                  var classifier = new cv.CascadeClassifier(cv[cascade])
                  var matrices = classifier.detectMultiScaleGpu(im).objects
                  if(matrices.length > 0){
                      matrices.forEach(function(v,n){
                        v.centerX=v.width/2
                        v.centerY=v.height/2
                        v.centerXnoParent=v.x+(v.width/2)
                        v.centerYnoParent=v.y+(v.height/2)
                      })
                      s.cx({
                          f:'trigger',
                          id:d.id,
                          ke:d.ke,
                          name:cascade,
                          details:{
                              plug:'built-in-opencv',
                              name:cascade,
                              reason:'object',
                              matrices : matrices,
                              confidence:d.average
                          },
                          imgHeight:d.mon.detector_scale_y,
                          imgWidth:d.mon.detector_scale_x
                      })
                  }
              })
          });
        }
    }
    if(frameLocation){
        fs.readFile(frameLocation,function(err,buffer){
            if(!err){
                detectStuff(buffer)
            }
            fs.unlink(frameLocation,function(){

            })
        })
    }else{
        detectStuff(buffer)
    }
}
// OpenALPR Detector >>
s.detectLicensePlate = function(buffer,d,tx,frameLocation){
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
// OpenALPR Detector />>
