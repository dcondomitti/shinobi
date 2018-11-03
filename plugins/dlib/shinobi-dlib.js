//
// Shinobi - Dlib Plugin
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
var fr = require('face-recognition-cuda');//modified "binding.gyp" file for "face-recognition" to build dlib with cuda
const detector = fr.FaceDetector()
s.detectObject=function(buffer,d,tx,frameLocation){
    var detectStuff = function(frame){
        try{
            var buffer = fr.loadImage(frame)
            var faceRectangles = detector.locateFaces(buffer)
            var matrices = []
            faceRectangles.forEach(function(v){
                var coordinates = [
                    {"x" : v.rect.left, "y" : v.rect.top},
                    {"x" : v.rect.right, "y" : v.rect.top},
                    {"x" : v.rect.right, "y" : v.rect.bottom}
                ]
                var width = Math.sqrt( Math.pow(coordinates[1].x - coordinates[0].x, 2) + Math.pow(coordinates[1].y - coordinates[0].y, 2));
                var height = Math.sqrt( Math.pow(coordinates[2].x - coordinates[1].x, 2) + Math.pow(coordinates[2].y - coordinates[1].y, 2))
                matrices.push({
                  x: coordinates[0].x,
                  y: coordinates[0].y,
                  width: width,
                  height: height,
                  tag: 'UNKNOWN FACE',
                  confidence: v.confidence,
                })
            })
            if(matrices.length > 0){
                tx({
                    f: 'trigger',
                    id: d.id,
                    ke: d.ke,
                    details:{
                        plug: config.plug,
                        name: 'dlib',
                        reason: 'object',
                        matrices: matrices,
                        imgHeight: parseFloat(d.mon.detector_scale_y),
                        imgWidth: parseFloat(d.mon.detector_scale_x)
                    }
                })
            }
            fs.unlink(frame,function(){

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
