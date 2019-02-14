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
    s.copySystemDefaultLanguage = function(){
        //en_CA
        return Object.assign(lang,{})
    }
    s.loadedLanguages={}
    s.loadedLanguages[config.language] = s.copySystemDefaultLanguage()
    s.getLanguageFile = function(rule){
        if(rule && rule !== ''){
            var file = s.loadedLanguages[file]
            if(!file){
                try{
                    s.loadedLanguages[rule] = require(s.location.languages+'/'+rule+'.json')
                    s.loadedLanguages[rule] = Object.assign(s.copySystemDefaultLanguage(),s.loadedLanguages[rule])
                    file = s.loadedLanguages[rule]
                }catch(err){
                    file = s.copySystemDefaultLanguage()
                }
            }
        }else{
            file = s.copySystemDefaultLanguage()
        }
        return file
    }
    //load defintions dynamically
    s.copySystemDefaultDefinitions = function(){
        //en_CA
        return Object.assign(definitions,{})
    }
    s.loadedDefinitons={}
    s.loadedDefinitons[config.language] = s.copySystemDefaultDefinitions()
    s.getDefinitonFile = function(rule){
        if(rule && rule !== ''){
            var file = s.loadedDefinitons[file]
            if(!file){
                try{
                    s.loadedDefinitons[rule] = require(s.location.definitions+'/'+rule+'.json')
                    s.loadedDefinitons[rule] = Object.assign(s.copySystemDefaultDefinitions(),s.loadedDefinitons[rule])
                    file = s.loadedDefinitons[rule]
                }catch(err){
                    file = s.copySystemDefaultDefinitions()
                }
            }
        }else{
            file = s.copySystemDefaultDefinitions()
        }
        return file
    }
    return lang
}
