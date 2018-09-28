module.exports = function(s,config,lang,definitions){
    //load languages dynamically
    s.loadedLanguages={}
    s.loadedLanguages[config.language]=lang;
    s.getLanguageFile=function(rule){
        if(rule&&rule!==''){
            var file=s.loadedLanguages[file]
            if(!file){
                try{
                    s.loadedLanguages[rule]=require(location.languages+'/'+rule+'.json')
                    file=s.loadedLanguages[rule]
                }catch(err){
                    file=lang
                }
            }
        }else{
            file=lang
        }
        return file
    }
    //load defintions dynamically
    s.loadedDefinitons={}
    s.loadedDefinitons[config.language]=definitions;
    s.getDefinitonFile=function(rule){
        if(rule&&rule!==''){
            var file=s.loadedDefinitons[file]
            if(!file){
                try{
                    s.loadedDefinitons[rule]=require(location.definitions+'/'+rule+'.json')
                    file=s.loadedDefinitons[rule]
                }catch(err){
                    file=definitions
                }
            }
        }else{
            file=definitions
        }
        return file
    }
}
