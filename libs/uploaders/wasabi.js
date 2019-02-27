var fs = require('fs');
module.exports = function(s,config,lang){
    //Wasabi Hot Cloud Storage
    var beforeAccountSaveForWasabiHotCloudStorage = function(d){
        //d = save event
        d.form.details.whcs_use_global=d.d.whcs_use_global
        d.form.details.use_whcs=d.d.use_whcs
    }
    var cloudDiskUseStartupForWasabiHotCloudStorage = function(group,userDetails){
        group.cloudDiskUse['whcs'].name = 'Wasabi Hot Cloud Storage'
        group.cloudDiskUse['whcs'].sizeLimitCheck = (userDetails.use_whcs_size_limit === '1')
        if(!userDetails.whcs_size_limit || userDetails.whcs_size_limit === ''){
            group.cloudDiskUse['whcs'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['whcs'].sizeLimit = parseFloat(userDetails.whcs_size_limit)
        }
    }
    var loadWasabiHotCloudStorageForUser = function(e){
        // e = user
        var userDetails = JSON.parse(e.details)
        if(userDetails.whcs_use_global === '1' && config.cloudUploaders && config.cloudUploaders.WasabiHotCloudStorage){
            // {
            //     whcs_accessKeyId: "",
            //     whcs_secretAccessKey: "",
            //     whcs_region: "",
            //     whcs_bucket: "",
            //     whcs_dir: "",
            // }
            userDetails = Object.assign(userDetails,config.cloudUploaders.WasabiHotCloudStorage)
        }
        //Wasabi Hot Cloud Storage
        if(!s.group[e.ke].whcs &&
           userDetails.whcs !== '0' &&
           userDetails.whcs_accessKeyId !== ''&&
           userDetails.whcs_secretAccessKey &&
           userDetails.whcs_secretAccessKey !== ''&&
           userDetails.whcs_region &&
           userDetails.whcs_region !== ''&&
           userDetails.whcs_bucket !== ''
          ){
            if(!userDetails.whcs_dir || userDetails.whcs_dir === '/'){
                userDetails.whcs_dir = ''
            }
            if(userDetails.whcs_dir !== ''){
                userDetails.whcs_dir = s.checkCorrectPathEnding(userDetails.whcs_dir)
            }
            var AWS = new require("aws-sdk")
            s.group[e.ke].whcs = AWS
            var wasabiEndpoint = new AWS.Endpoint('s3.wasabisys.com')
            s.group[e.ke].whcs.config = new s.group[e.ke].whcs.Config({
                endpoint: wasabiEndpoint,
                accessKeyId: userDetails.whcs_accessKeyId,
                secretAccessKey: userDetails.whcs_secretAccessKey,
                region: userDetails.whcs_region
            })
            s.group[e.ke].whcs = new s.group[e.ke].whcs.S3();
        }
    }
    var unloadWasabiHotCloudStorageForUser = function(user){
        s.group[user.ke].whcs = null
    }
    var deleteVideoFromWasabiHotCloudStorage = function(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        if(!videoDetails.location){
            videoDetails.location = video.href.split('wasabisys.com')[1]
        }
        s.group[e.ke].whcs.deleteObject({
            Bucket: s.group[e.ke].init.whcs_bucket,
            Key: videoDetails.location,
        }, function(err, data) {
            if (err) console.log(err);
            callback()
        });
    }
    var uploadVideoToWasabiHotCloudStorage = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - Wasabi Hot Cloud Storage
        if(s.group[e.ke].whcs && s.group[e.ke].init.use_whcs !== '0' && s.group[e.ke].init.whcs_save === '1'){
            var ext = k.filename.split('.')
            ext = ext[ext.length - 1]
            var fileStream = fs.createReadStream(k.dir+k.filename);
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[e.ke].init.whcs_dir+e.ke+'/'+e.mid+'/'+k.filename
            s.group[e.ke].whcs.upload({
                Bucket: s.group[e.ke].init.whcs_bucket,
                Key: saveLocation,
                Body:fileStream,
                ACL:'public-read',
                ContentType:'video/'+ext
            },function(err,data){
                if(err){
                    s.userLog(e,{type:lang['Wasabi Hot Cloud Storage Upload Error'],msg:err})
                }
                if(s.group[e.ke].init.whcs_log === '1' && data && data.Location){
                    var save = [
                        e.mid,
                        e.ke,
                        k.startTime,
                        1,
                        s.s({
                            type : 'whcs',
                            location : saveLocation
                        }),
                        k.filesize,
                        k.endTime,
                        data.Location
                    ]
                    s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
                    s.setCloudDiskUsedForGroup(e,{
                        amount : k.filesizeMB,
                        storageType : 'whcs'
                    })
                    s.purgeCloudDiskForGroup(e,'whcs')
                }
            })
        }
    }
    //wasabi
    s.addCloudUploader({
        name: 'whcs',
        loadGroupAppExtender: loadWasabiHotCloudStorageForUser,
        unloadGroupAppExtender: unloadWasabiHotCloudStorageForUser,
        insertCompletedVideoExtender: uploadVideoToWasabiHotCloudStorage,
        deleteVideoFromCloudExtensions: deleteVideoFromWasabiHotCloudStorage,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForWasabiHotCloudStorage,
        beforeAccountSave: beforeAccountSaveForWasabiHotCloudStorage,
        onAccountSave: cloudDiskUseStartupForWasabiHotCloudStorage,
    })
}
