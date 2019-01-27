var fs = require('fs')
var express = require('express')
module.exports = function(s,config,lang,app,io){
    s.customAutoLoadModules = {}
    s.customAutoLoadTree = {
        pages: [],
        PageBlocks: [],
        LibsJs: [],
        LibsCss: [],
        adminPageBlocks: [],
        adminLibsJs: [],
        adminLibsCss: [],
        superPageBlocks: [],
        superLibsJs: [],
        superLibsCss: []
    }
    var folderPath = __dirname + '/customAutoLoad'
    var search = function(searchFor,searchIn){return searchIn.indexOf(searchFor) > -1}
    fs.readdir(folderPath,function(err,folderContents){
        if(!err && folderContents){
            folderContents.forEach(function(filename){
                s.customAutoLoadModules[filename] = {}
                var customModulePath = folderPath + '/' + filename
                if(filename.indexOf('.js') > -1){
                    s.customAutoLoadModules[filename].type = 'file'
                    try{
                        require(customModulePath)(s,config,lang,app,io)
                    }catch(err){
                        console.log('Failed to Load Module : ' + filename)
                        console.log(err)
                    }
                }else{
                    if(fs.lstatSync(customModulePath).isDirectory()){
                        s.customAutoLoadModules[filename].type = 'folder'
                        try{
                            require(customModulePath)(s,config,lang,app,io)
                            fs.readdir(customModulePath,function(err,folderContents){
                                folderContents.forEach(function(name){
                                    switch(name){
                                        case'web':
                                            var webFolder = s.checkCorrectPathEnding(customModulePath) + 'web/'
                                            fs.readdir(webFolder,function(err,webFolderContents){
                                                webFolderContents.forEach(function(name){
                                                    switch(name){
                                                        case'libs':
                                                        case'pages':
                                                            if(name === 'libs'){
                                                                if(config.webPaths.home !== '/'){
                                                                    app.use('/libs',express.static(webFolder + '/libs'))
                                                                }
                                                                app.use(s.checkCorrectPathEnding(config.webPaths.home)+'libs',express.static(webFolder + '/libs'))
                                                                app.use(s.checkCorrectPathEnding(config.webPaths.admin)+'libs',express.static(webFolder + '/libs'))
                                                                app.use(s.checkCorrectPathEnding(config.webPaths.super)+'libs',express.static(webFolder + '/libs'))
                                                            }
                                                            var libFolder = webFolder + name + '/'
                                                            fs.readdir(libFolder,function(err,webFolderContents){
                                                                webFolderContents.forEach(function(libName){
                                                                    var thirdLevelName = libFolder + libName
                                                                    switch(libName){
                                                                        case'js':
                                                                        case'css':
                                                                        case'blocks':
                                                                            fs.readdir(thirdLevelName,function(err,webFolderContents){
                                                                                webFolderContents.forEach(function(filename){
                                                                                    var fullPath = thirdLevelName + '/' + filename
                                                                                    var blockPrefix = ''
                                                                                    switch(true){
                                                                                        case search('super.',filename):
                                                                                            blockPrefix = 'super'
                                                                                        break;
                                                                                        case search('admin.',filename):
                                                                                            blockPrefix = 'admin'
                                                                                        break;
                                                                                    }
                                                                                    switch(libName){
                                                                                        case'js':
                                                                                            s.customAutoLoadTree[blockPrefix + 'LibsJs'].push(filename)
                                                                                        break;
                                                                                        case'css':
                                                                                            s.customAutoLoadTree[blockPrefix + 'LibsCss'].push(filename)
                                                                                        break;
                                                                                        case'blocks':
                                                                                            s.customAutoLoadTree[blockPrefix + 'PageBlocks'].push(fullPath)
                                                                                        break;
                                                                                    }
                                                                                })
                                                                            })
                                                                        break;
                                                                        default:
                                                                            if(libName.indexOf('.ejs') > -1){
                                                                                s.customAutoLoadTree.pages.push(thirdLevelName)
                                                                            }
                                                                        break;
                                                                    }
                                                                })
                                                            })
                                                        break;
                                                    }
                                                })
                                            })
                                        break;
                                        case'languages':
                                            var languagesFolder = s.checkCorrectPathEnding(customModulePath) + 'languages/'
                                            fs.readdir(languagesFolder,function(err,files){
                                                if(err)return console.log(err);
                                                files.forEach(function(filename){
                                                    var fileData = require(languagesFolder + filename)
                                                    var rule = filename.replace('.json','')
                                                    if(config.language === rule){
                                                        lang = Object.assign(lang,fileData)
                                                    }
                                                    if(s.loadedLanguages[rule]){
                                                        s.loadedLanguages[rule] = Object.assign(s.loadedLanguages[rule],fileData)
                                                    }else{
                                                        s.loadedLanguages[rule] = Object.assign(s.copySystemDefaultLanguage(),fileData)
                                                    }
                                                })
                                            })
                                        break;
                                    }
                                })
                            })
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
