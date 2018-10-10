module.exports = function(s,config){
    if(!config.language){
        config.language='en_CA'
    }
    try{
        var lang = require(s.location.languages+'/'+config.language+'.json');
    }catch(er){
        console.error(er)
        console.log('There was an error loading your language file.')
        var lang = require(s.location.languages+'/en_CA.json');
    }
    s.location.definitions = s.mainDirectory+'/definitions'
    try{
        var definitions = require(s.location.definitions+'/'+config.language+'.json');
    }catch(er){
        console.error(er)
        console.log('There was an error loading your language file.')
        var definitions = require(s.location.definitions+'/en_CA.json');
    }
    //load languages dynamically
    s.loadedLanguages={}
    s.loadedLanguages[config.language]=lang;
    s.getLanguageFile = function(rule){
        if(rule && rule !== ''){
            var file = s.loadedLanguages[file]
            if(!file){
                try{
                    s.loadedLanguages[rule] = require(s.location.languages+'/'+rule+'.json')
                    s.loadedLanguages[rule] = Object.assign(lang,s.loadedLanguages[rule])
                    file = s.loadedLanguages[rule]
                }catch(err){
                    file = lang
                }
            }
        }else{
            file = lang
        }
        return file
    }
    //load defintions dynamically
    s.loadedDefinitons={}
    s.loadedDefinitons[config.language]=definitions;
    s.getDefinitonFile = function(rule){
        if(rule && rule !== ''){
            var file = s.loadedDefinitons[file]
            if(!file){
                try{
                    s.loadedDefinitons[rule] = require(s.location.definitions+'/'+rule+'.json')
                    s.loadedDefinitons[rule] = Object.assign(definitions,s.loadedDefinitons[rule])
                    file = s.loadedDefinitons[rule]
                }catch(err){
                    file = definitions
                }
            }
        }else{
            file = definitions
        }
        return file
    }
    return lang
}
