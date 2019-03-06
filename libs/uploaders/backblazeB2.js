var fs = require('fs');
module.exports = function(s,config,lang){
    //Backblaze B2
    var beforeAccountSaveForBackblazeB2 = function(d){
        //d = save event
        d.form.details.b2_use_global=d.d.b2_use_global
        d.form.details.use_bb_b2=d.d.use_bb_b2
    }
    var cloudDiskUseStartupForBackblazeB2 = function(group,userDetails){
        group.cloudDiskUse['b2'].name = 'Backblaze B2'
        group.cloudDiskUse['b2'].sizeLimitCheck = (userDetails.use_bb_b2_size_limit === '1')
        if(!userDetails.bb_b2_size_limit || userDetails.bb_b2_size_limit === ''){
            group.cloudDiskUse['b2'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['b2'].sizeLimit = parseFloat(userDetails.bb_b2_size_limit)
        }
    }
    var loadBackblazeB2ForUser = function(e){
        var userDetails = JSON.parse(e.details);
        try{
            if(userDetails.b2_use_global === '1' && config.cloudUploaders && config.cloudUploaders.BackblazeB2){
                // {
                //     bb_b2_accountId: "",
                //     bb_b2_applicationKey: "",
                //     bb_b2_bucket: "",
                //     bb_b2_dir: "",
                // }
                userDetails = Object.assign(userDetails,config.cloudUploaders.BackblazeB2)
            }
            if(!s.group[e.ke].bb_b2 &&
               userDetails.bb_b2_accountId &&
               userDetails.bb_b2_accountId !=='' &&
               userDetails.bb_b2_applicationKey &&
               userDetails.bb_b2_applicationKey !=='' &&
               userDetails.bb_b2_bucket &&
               userDetails.bb_b2_bucket !== ''
              ){
                var B2 = require('backblaze-b2')
                if(!userDetails.bb_b2_dir || userDetails.bb_b2_dir === '/'){
                  userDetails.bb_b2_dir = ''
                }
                if(userDetails.bb_b2_dir !== ''){
                  userDetails.bb_b2_dir = s.checkCorrectPathEnding(userDetails.bb_b2_dir)
                }
                var backblazeErr = function(err){
                    // console.log(err)
                    s.userLog({mid:'$USER',ke:e.ke},{type:lang['Backblaze Error'],msg:err.data || err})
                }
                var createB2Connection = function(){
                    var b2 = new B2({
                        accountId: userDetails.bb_b2_accountId,
                        applicationKey: userDetails.bb_b2_applicationKey
                    })
                    b2.authorize().then(function(resp){
                        s.group[e.ke].bb_b2_downloadUrl = resp.data.downloadUrl
                        b2.listBuckets().then(function(resp){
                            var buckets = resp.data.buckets
                            var bucketN = -2
                            buckets.forEach(function(item,n){
                                if(item.bucketName === userDetails.bb_b2_bucket){
                                    bucketN = n
                                }
                            })
                            if(bucketN > -1){
                                s.group[e.ke].bb_b2_bucketId = buckets[bucketN].bucketId
                            }else{
                                b2.createBucket(
                                    userDetails.bb_b2_bucket,
                                    'allPublic'
                                ).then(function(resp){
                                    s.group[e.ke].bb_b2_bucketId = resp.data.bucketId
                                }).catch(backblazeErr)
                            }
                        }).catch(backblazeErr)
                    }).catch(backblazeErr)
                    s.group[e.ke].bb_b2 = b2
                }
                createB2Connection()
                s.group[e.ke].bb_b2_refreshTimer = setInterval(createB2Connection,1000 * 60 * 60)
            }
        }catch(err){
            s.debugLog(err)
        }
    }
    var unloadBackblazeB2ForUser = function(user){
        s.group[user.ke].bb_b2 = null
        clearInterval(s.group[user.ke].bb_b2_refreshTimer)
    }
    var deleteVideoFromBackblazeB2 = function(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        s.group[e.ke].bb_b2.deleteFileVersion({
            fileId: videoDetails.fileId,
            fileName: videoDetails.fileName
        }).then(function(resp){
            // console.log('deleteFileVersion',resp.data)
        }).catch(function(err){
            console.log('deleteFileVersion',err)
        })
    }
    var uploadVideoToBackblazeB2 = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - Backblaze B2
        if(s.group[e.ke].bb_b2 && s.group[e.ke].init.use_bb_b2 !== '0' && s.group[e.ke].init.bb_b2_save === '1'){
            var backblazeErr = function(err){
                // console.log(err)
                s.userLog({mid:'$USER',ke:e.ke},{type:lang['Backblaze Error'],msg:err.data})
            }
            fs.readFile(k.dir+k.filename,function(err,data){
                var backblazeSavePath = s.group[e.ke].init.bb_b2_dir+e.ke+'/'+e.mid+'/'+k.filename
                var getUploadUrl = function(bucketId,callback){
                    s.group[e.ke].bb_b2.getUploadUrl(bucketId).then(function(resp){
                        callback(resp.data)
                    }).catch(backblazeErr)
                }
                getUploadUrl(s.group[e.ke].bb_b2_bucketId,function(req){
                    s.group[e.ke].bb_b2.uploadFile({
                        uploadUrl: req.uploadUrl,
                        uploadAuthToken: req.authorizationToken,
                        filename: backblazeSavePath,
                        data: data,
                        onUploadProgress: null
                    }).then(function(resp){
                        if(s.group[e.ke].init.bb_b2_log === '1' && resp.data.fileId){
                            var backblazeDownloadUrl = s.group[e.ke].bb_b2_downloadUrl + '/file/' + s.group[e.ke].init.bb_b2_bucket + '/' + backblazeSavePath
                            var save = [
                                e.mid,
                                e.ke,
                                k.startTime,
                                1,
                                s.s({
                                    type : 'b2',
                                    bucketId : resp.data.bucketId,
                                    fileId : resp.data.fileId,
                                    fileName : resp.data.fileName
                                }),
                                k.filesize,
                                k.endTime,
                                backblazeDownloadUrl
                            ]
                            s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
                            s.setCloudDiskUsedForGroup(e,{
                                amount : k.filesizeMB,
                                storageType : 'b2'
                            })
                            s.purgeCloudDiskForGroup(e,'b2')
                        }
                    }).catch(backblazeErr)
                })
            })
        }
    }
    //backblaze b2
    s.addCloudUploader({
        name: 'b2',
        loadGroupAppExtender: loadBackblazeB2ForUser,
        unloadGroupAppExtender: unloadBackblazeB2ForUser,
        insertCompletedVideoExtender: uploadVideoToBackblazeB2,
        deleteVideoFromCloudExtensions: deleteVideoFromBackblazeB2,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForBackblazeB2,
        beforeAccountSave: beforeAccountSaveForBackblazeB2,
        onAccountSave: cloudDiskUseStartupForBackblazeB2,
    })
}
