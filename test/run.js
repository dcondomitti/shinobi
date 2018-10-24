module.exports = function(s,config,lang,app,io){
    var checkResult = function(functionName,expectedResult,testResult){
        if(expectedResult !== testResult){
            console.log(expectedResult,testResult)
            throw new Error('x ' + functionName + ' : Failed!')
        }else{
            console.log('- ' + functionName + ' : Success')
        }
    }
    var sampleMonitorObject = require('./testMonitor-WatchOnly.json')
    var test = {
        "basic.js" : {
            checkRelativePath : function(){
                var expectedResult = s.mainDirectory + '/'
                var testResult = s.checkRelativePath('')
                checkResult('checkRelativePath',expectedResult,testResult)
            },
            parseJSON : function(){
                var expectedResult = {}
                var testResult = s.parseJSON('{}')
                checkResult('parseJSON',JSON.stringify(expectedResult),JSON.stringify(testResult))
            },
            stringJSON : function(){
                var expectedResult = '{}'
                var testResult = s.stringJSON({})
                checkResult('stringJSON',expectedResult,testResult)
            },
            addUserPassToUrl : function(){
                var expectedResult = 'http://user:pass@url.com'
                var testResult = s.addUserPassToUrl('http://url.com','user','pass')
                checkResult('addUserPassToUrl',expectedResult,testResult)
            },
            checkCorrectPathEnding : function(){
                var expectedResult = '/'
                var testResult = s.checkCorrectPathEnding('')
                checkResult('checkCorrectPathEnding',expectedResult,testResult)
            },
            md5 : function(){
                var expectedResult = '5f4dcc3b5aa765d61d8327deb882cf99'
                var testResult = s.md5('password')
                checkResult('md5',expectedResult,testResult)
            },
            sha256 : function(){
                var expectedResult = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
                var testResult = require('crypto').createHash('sha256').update('test').digest("hex")
                checkResult('createHash/sha256',expectedResult,testResult)
            },
            nameToTime : function(){
                var expectedResult = '2018-10-22 23:00:00'
                var testResult = s.nameToTime('2018-10-22T23-00-00.mp4')
                checkResult('nameToTime',expectedResult,testResult)
            },
            ipRange : function(){
                var expectedResult = [
                    '192.168.1.1',
                    '192.168.1.2',
                    '192.168.1.3'
                ]
                var testResult = s.ipRange('192.168.1.1','192.168.1.3')
                checkResult('ipRange',JSON.stringify(expectedResult),JSON.stringify(testResult))
            },
            portRange : function(){
                var expectedResult = [
                    8000,
                    8001,
                    8002,
                ]
                var testResult = s.portRange(8000,8002)
                checkResult('portRange',JSON.stringify(expectedResult),JSON.stringify(testResult))
            },
            getFunctionParamNames : function(){
                var testing = function(arg1,arg2){}
                var expectedResult = [
                    'arg1',
                    'arg2',
                ]
                var testResult = s.getFunctionParamNames(testing)
                checkResult('getFunctionParamNames',JSON.stringify(expectedResult),JSON.stringify(testResult))
            }
        },
        "ffmpeg.js" : {
            splitForFFPMEG : function(){
                var expectedResult = [
                    'flag1',
                    'flag2',
                    'fl ag3',
                ]
                var testResult = s.splitForFFPMEG('flag1  flag2    "fl ag3"')
                checkResult('splitForFFPMEG',JSON.stringify(expectedResult),JSON.stringify(testResult))
            },
            "ffmpeg" : function(){
                //command string builder
                var x = {tmp : ''}
                s.checkDetails(sampleMonitorObject)
                sampleMonitorObject.url = s.buildMonitorUrl(sampleMonitorObject)
                var expectedResult = '-loglevel warning -progress pipe:5 -analyzeduration 1000000 -probesize 1000000 -stream_loop -1 -fflags +igndts -re -i "https://cdn.shinobi.video:/videos/bears.mp4" -f mp4 -an -c:v copy -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream" -reset_timestamps 1 pipe:1'
                s.ffmpegFunctions.buildMainInput(sampleMonitorObject,x)
                s.ffmpegFunctions.buildMainStream(sampleMonitorObject,x)
                s.ffmpegFunctions.buildMainRecording(sampleMonitorObject,x)
                s.ffmpegFunctions.buildMainDetector(sampleMonitorObject,x)
                s.ffmpegFunctions.assembleMainPieces(sampleMonitorObject,x)
                var testResult = x.ffmpegCommandString
                checkResult('ffmpeg',expectedResult,testResult)
                //check pipe builder
                var expectedResult = []
                var times = config.pipeAddition
                if(sampleMonitorObject.details.stream_channels){
                    times += sampleMonitorObject.details.stream_channels.length
                }
                for(var i=0; i < times; i++){
                    expectedResult.push('pipe')
                }
                s.ffmpegFunctions.createPipeArray(sampleMonitorObject,x)
                var testResult = x.stdioPipes
                checkResult('ffmpeg.createPipeArray',JSON.stringify(expectedResult),JSON.stringify(testResult))
            }
        }
    }
    console.log('----- Function Test Starting')
    Object.keys(test).forEach(function(libkey){
        var library = test[libkey]
        console.log('--- Testing ' + libkey + '...')
        Object.keys(library).forEach(function(key){
            var functionTest = library[key]
            functionTest()
        })
        console.log('-- Completed ' + libkey + '...')
    })
    console.log('---- Function Test Ended')
}
