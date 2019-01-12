var fs = require('fs')
module.exports = function(s,config,lang,app,io){
    var checkFolder = function(folderName){
        var folderPath = __dirname + '/' + folderName
        fs.readdir(folderPath,function(err,folderContents){
            if(!err && folderContents){
                folderContents.forEach(function(filename){
                    var customModulePath = folderPath + '/' + filename
                    if(filename.indexOf('.js') > -1){
                        try{
                            require(customModulePath)(s,config,lang,app,io)
                        }catch(err){
                            console.log('Failed to Load Module : ' + filename)
                            console.log(err)
                        }
                    }else{
                        if(fs.lstatSync(customModulePath).isDirectory()){
                            try{
                                require(customModulePath)(s,config,lang,app,io)
                            }catch(err){
                                console.log('Failed to Load Module : ' + filename)
                                console.log(err)
                            }
                        }
                    }
                })
            }else{
                fs.mkdirSync(folderPath)
            }
        })
    }
    checkFolder('customAutoLoad')
}
