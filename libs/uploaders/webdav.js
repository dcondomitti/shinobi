var fs = require('fs');
var webdav = require("webdav-fs");
module.exports = function(s,config,lang){
    // WebDAV
    var beforeAccountSaveForWebDav = function(d){
        //d = save event
        d.form.details.webdav_use_global=d.d.webdav_use_global
        d.form.details.use_webdav=d.d.use_webdav
    }
    var cloudDiskUseStartupForWebDav = function(group,userDetails){
        group.cloudDiskUse['webdav'].name = 'WebDAV'
        group.cloudDiskUse['webdav'].sizeLimitCheck = (userDetails.use_webdav_size_limit === '1')
        if(!userDetails.webdav_size_limit || userDetails.webdav_size_limit === ''){
            group.cloudDiskUse['webdav'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['webdav'].sizeLimit = parseFloat(userDetails.webdav_size_limit)
        }
    }
    var loadWebDavForUser = function(e){
        // e = user
        var userDetails = JSON.parse(e.details);
        if(userDetails.webdav_use_global === '1' && config.cloudUploaders && config.cloudUploaders.WebDAV){
            // {
            //     webdav_user: "",
            //     webdav_pass: "",
            //     webdav_url: "",
            //     webdav_dir: "",
            // }
            userDetails = Object.assign(userDetails,config.cloudUploaders.WebDAV)
        }
        //owncloud/webdav
        if(!s.group[e.ke].webdav &&
           userDetails.webdav_user&&
           userDetails.webdav_user!==''&&
           userDetails.webdav_pass&&
           userDetails.webdav_pass!==''&&
           userDetails.webdav_url&&
           userDetails.webdav_url!==''
          ){
            if(!userDetails.webdav_dir||userDetails.webdav_dir===''){
                userDetails.webdav_dir='/'
            }
            userDetails.webdav_dir = s.checkCorrectPathEnding(userDetails.webdav_dir)
            s.group[e.ke].webdav = webdav(
                userDetails.webdav_url,
                userDetails.webdav_user,
                userDetails.webdav_pass
            )
        }
    }
    var unloadWebDavForUser = function(user){
        s.group[user.ke].webdav = null
    }
    var deleteVideoFromWebDav = function(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        if(!videoDetails.location){
            var prefix = s.addUserPassToUrl(s.checkCorrectPathEnding(s.group[e.ke].init.webdav_url),s.group[e.ke].init.webdav_user,s.group[e.ke].init.webdav_pass)
            videoDetails.location = video.href.replace(prefix,'')
        }
        s.group[e.ke].webdav.unlink(videoDetails.location, function(err) {
            if (err) console.log(videoDetails.location,err)
            callback()
        })
    }
    var uploadVideoToWebDav = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - webdav
       var wfs = s.group[e.ke].webdav
       if(wfs && s.group[e.ke].init.use_webdav !== '0' && s.group[e.ke].init.webdav_save === "1"){
           var webdavUploadDir = s.group[e.ke].init.webdav_dir+e.ke+'/'+e.mid+'/'
           var startWebDavUpload = function(){
               s.group[e.ke].mon[e.id].webdavDirExist = true
               var wfsWriteStream =
               fs.createReadStream(k.dir + k.filename).pipe(wfs.createWriteStream(webdavUploadDir + k.filename))
               if(s.group[e.ke].init.webdav_log === '1'){
                   var webdavRemoteUrl = s.addUserPassToUrl(s.checkCorrectPathEnding(s.group[e.ke].init.webdav_url),s.group[e.ke].init.webdav_user,s.group[e.ke].init.webdav_pass) + s.group[e.ke].init.webdav_dir + e.ke + '/'+e.mid+'/'+k.filename
                   var save = [
                       e.mid,
                       e.ke,
                       k.startTime,
                       1,
                       s.s({
                           type : 'webdav',
                           location : webdavUploadDir + k.filename
                       }),
                       k.filesize,
                       k.endTime,
                       webdavRemoteUrl
                   ]
                   s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
                   s.setCloudDiskUsedForGroup(e,{
                       amount : k.filesizeMB,
                       storageType : 'webdav'
                   })
                   s.purgeCloudDiskForGroup(e,'webdav')
               }
           }
           if(s.group[e.ke].mon[e.id].webdavDirExist !== true){
               //check if webdav dir exist
               var parentPoint = 0
               var webDavParentz = webdavUploadDir.split('/')
               var webDavParents = []
               webDavParentz.forEach(function(v){
                   if(v && v !== '')webDavParents.push(v)
               })
               var stitchPieces = './'
               var lastParentCheck = function(){
                   ++parentPoint
                   if(parentPoint === webDavParents.length){
                       startWebDavUpload()
                   }
                   checkPathPiece(webDavParents[parentPoint])
               }
               var checkPathPiece = function(pathPiece){
                   if(pathPiece && pathPiece !== ''){
                       stitchPieces += pathPiece + '/'
                       wfs.stat(stitchPieces, function(error, stats) {
                           if(error){
                               reply = {
                                   status : error.status,
                                   msg : lang.WebdavErrorTextTryCreatingDir,
                                   dir : stitchPieces,
                               }
                               s.userLog(e,{type:lang['Webdav Error'],msg:reply})
                               wfs.mkdir(stitchPieces, function(error) {
                                   if(error){
                                       reply = {
                                           status : error.status,
                                           msg : lang.WebdavErrorTextCreatingDir,
                                           dir : stitchPieces,
                                       }
                                       s.userLog(e,{type:lang['Webdav Error'],msg:reply})
                                   }else{
                                       lastParentCheck()
                                   }
                               })
                           }else{
                               lastParentCheck()
                           }
                       })
                   }else{
                       ++parentPoint
                   }
               }
               checkPathPiece(webDavParents[0])
           }else{
               startWebDavUpload()
           }
       }
    }
    //webdav
    s.addCloudUploader({
        name: 'webdav',
        loadGroupAppExtender: loadWebDavForUser,
        unloadGroupAppExtender: unloadWebDavForUser,
        insertCompletedVideoExtender: uploadVideoToWebDav,
        deleteVideoFromCloudExtensions: deleteVideoFromWebDav,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForWebDav,
        beforeAccountSave: beforeAccountSaveForWebDav,
        onAccountSave: cloudDiskUseStartupForWebDav,
    })
}
