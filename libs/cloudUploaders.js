var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
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
        var ar = JSON.parse(e.details);
        if(ar.webdav_use_global === '1' && config.cloudUploaders && config.cloudUploaders.WebDAV){
            // {
            //     webdav_user: "",
            //     webdav_pass: "",
            //     webdav_url: "",
            //     webdav_dir: "",
            // }
            ar = Object.assign(ar,config.cloudUploaders.WebDAV)
        }
        //owncloud/webdav
        if(!s.group[e.ke].webdav &&
           ar.webdav_user&&
           ar.webdav_user!==''&&
           ar.webdav_pass&&
           ar.webdav_pass!==''&&
           ar.webdav_url&&
           ar.webdav_url!==''
          ){
            if(!ar.webdav_dir||ar.webdav_dir===''){
                ar.webdav_dir='/'
            }
            ar.webdav_dir = s.checkCorrectPathEnding(ar.webdav_dir)
            s.group[e.ke].webdav = webdav(
                ar.webdav_url,
                ar.webdav_user,
                ar.webdav_pass
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
    //Amazon S3
    var beforeAccountSaveForAmazonS3 = function(d){
        //d = save event
        d.form.details.aws_use_global=d.d.aws_use_global
        d.form.details.use_aws_s3=d.d.use_aws_s3
    }
    var cloudDiskUseStartupForAmazonS3 = function(group,userDetails){
        group.cloudDiskUse['s3'].name = 'Amazon S3'
        group.cloudDiskUse['s3'].sizeLimitCheck = (userDetails.use_aws_s3_size_limit === '1')
        if(!userDetails.aws_s3_size_limit || userDetails.aws_s3_size_limit === ''){
            group.cloudDiskUse['s3'].sizeLimit = 10000
        }else{
            group.cloudDiskUse['s3'].sizeLimit = parseFloat(userDetails.aws_s3_size_limit)
        }
    }
    var loadAmazonS3ForUser = function(e){
        // e = user
        var ar = JSON.parse(e.details)
        if(ar.aws_use_global === '1' && config.cloudUploaders && config.cloudUploaders.AmazonS3){
            // {
            //     aws_accessKeyId: "",
            //     aws_secretAccessKey: "",
            //     aws_region: "",
            //     aws_s3_bucket: "",
            //     aws_s3_dir: "",
            // }
            ar = Object.assign(ar,config.cloudUploaders.AmazonS3)
        }
        //Amazon S3
        if(!s.group[e.ke].aws &&
           !s.group[e.ke].aws_s3 &&
           ar.aws_s3 !== '0' &&
           ar.aws_accessKeyId !== ''&&
           ar.aws_secretAccessKey &&
           ar.aws_secretAccessKey !== ''&&
           ar.aws_region &&
           ar.aws_region !== ''&&
           ar.aws_s3_bucket !== ''
          ){
            if(!ar.aws_s3_dir || ar.aws_s3_dir === '/'){
                ar.aws_s3_dir = ''
            }
            if(ar.aws_s3_dir !== ''){
                ar.aws_s3_dir = s.checkCorrectPathEnding(ar.aws_s3_dir)
            }
            s.group[e.ke].aws = new require("aws-sdk")
            s.group[e.ke].aws.config = new s.group[e.ke].aws.Config({
                accessKeyId: ar.aws_accessKeyId,
                secretAccessKey: ar.aws_secretAccessKey,
                region: ar.aws_region
            })
            s.group[e.ke].aws_s3 = new s.group[e.ke].aws.S3();
        }
    }
    var unloadAmazonS3ForUser = function(user){
        s.group[user.ke].aws = null
        s.group[user.ke].aws_s3 = null
    }
    var deleteVideoFromAmazonS3 = function(e,video,callback){
        // e = user
        try{
            var videoDetails = JSON.parse(video.details)
        }catch(err){
            var videoDetails = video.details
        }
        if(!videoDetails.location){
            videoDetails.location = video.href.split('.amazonaws.com')[1]
        }
        s.group[e.ke].aws_s3.deleteObject({
            Bucket: s.group[e.ke].init.aws_s3_bucket,
            Key: videoDetails.location,
        }, function(err, data) {
            if (err) console.log(err);
            callback()
        });
    }
    var uploadVideoToAmazonS3 = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - amazon s3
        if(s.group[e.ke].aws_s3 && s.group[e.ke].init.use_aws_s3 !== '0' && s.group[e.ke].init.aws_s3_save === '1'){
            var ext = k.filename.split('.')
            ext = ext[ext.length - 1]
            var fileStream = fs.createReadStream(k.dir+k.filename);
            fileStream.on('error', function (err) {
                console.error(err)
            })
            var saveLocation = s.group[e.ke].init.aws_s3_dir+e.ke+'/'+e.mid+'/'+k.filename
            s.group[e.ke].aws_s3.upload({
                Bucket: s.group[e.ke].init.aws_s3_bucket,
                Key: saveLocation,
                Body:fileStream,
                ACL:'public-read',
                ContentType:'video/'+ext
            },function(err,data){
                if(err){
                    s.userLog(e,{type:lang['Amazon S3 Upload Error'],msg:err})
                }
                if(s.group[e.ke].init.aws_s3_log === '1' && data && data.Location){
                    var save = [
                        e.mid,
                        e.ke,
                        k.startTime,
                        1,
                        s.s({
                            type : 's3',
                            location : saveLocation
                        }),
                        k.filesize,
                        k.endTime,
                        data.Location
                    ]
                    s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
                    s.setCloudDiskUsedForGroup(e,{
                        amount : k.filesizeMB,
                        storageType : 's3'
                    })
                    s.purgeCloudDiskForGroup(e,'s3')
                }
            })
        }
    }
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
        var ar = JSON.parse(e.details);
        try{
            if(ar.b2_use_global === '1' && config.cloudUploaders && config.cloudUploaders.BackblazeB2){
                // {
                //     bb_b2_accountId: "",
                //     bb_b2_applicationKey: "",
                //     bb_b2_bucket: "",
                //     bb_b2_dir: "",
                // }
                ar = Object.assign(ar,config.cloudUploaders.BackblazeB2)
            }
            if(!s.group[e.ke].bb_b2 &&
               ar.bb_b2_accountId &&
               ar.bb_b2_accountId !=='' &&
               ar.bb_b2_applicationKey &&
               ar.bb_b2_applicationKey !=='' &&
               ar.bb_b2_bucket &&
               ar.bb_b2_bucket !== ''
              ){
                var B2 = require('backblaze-b2')
                if(!ar.bb_b2_dir || ar.bb_b2_dir === '/'){
                  ar.bb_b2_dir = ''
                }
                if(ar.bb_b2_dir !== ''){
                  ar.bb_b2_dir = s.checkCorrectPathEnding(ar.bb_b2_dir)
                }
                var b2 = new B2({
                    accountId: ar.bb_b2_accountId,
                    applicationKey: ar.bb_b2_applicationKey
                })
                s.group[e.ke].bb_b2 = b2
                var backblazeErr = function(err){
                    // console.log(err)
                    s.userLog({mid:'$USER',ke:e.ke},{type:lang['Backblaze Error'],msg:err.data})
                }
                b2.authorize().then(function(resp){
                    s.group[e.ke].bb_b2_downloadUrl = resp.data.downloadUrl
                    b2.listBuckets().then(function(resp){
                        var buckets = resp.data.buckets
                        var bucketN = -2
                        buckets.forEach(function(item,n){
                            if(item.bucketName === ar.bb_b2_bucket){
                                bucketN = n
                            }
                        })
                        if(bucketN > -1){
                            s.group[e.ke].bb_b2_bucketId = buckets[bucketN].bucketId
                        }else{
                            b2.createBucket(
                                ar.bb_b2_bucket,
                                'allPublic'
                            ).then(function(resp){
                                s.group[e.ke].bb_b2_bucketId = resp.data.bucketId
                            }).catch(backblazeErr)
                        }
                    }).catch(backblazeErr)
                }).catch(backblazeErr)
            }
        }catch(err){
            s.debugLog(err)
        }
    }
    var unloadBackblazeB2ForUser = function(user){
        s.group[user.ke].bb_b2 = null
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
    //SFTP
    // var beforeAccountSaveForSftp = function(d){
    //     //d = save event
    //     d.form.details.use_sftp = d.d.use_sftp
    // }
    // var cloudDiskUseStartupForSftp = function(group,userDetails){
    //     group.cloudDiskUse['sftp'].name = 'SFTP'
    //     group.cloudDiskUse['sftp'].sizeLimitCheck = (userDetails.use_aws_s3_size_limit === '1')
    //     if(!userDetails.aws_s3_size_limit || userDetails.aws_s3_size_limit === ''){
    //         group.cloudDiskUse['sftp'].sizeLimit = 10000
    //     }else{
    //         group.cloudDiskUse['sftp'].sizeLimit = parseFloat(userDetails.aws_s3_size_limit)
    //     }
    // }
    // var loadSftpForUser = function(e){
    //     // e = user
    //     var ar = JSON.parse(e.details);
    //     //SFTP
    //     if(!s.group[e.ke].sftp &&
    //        !s.group[e.ke].sftp &&
    //        ar.sftp !== '0' &&
    //        ar.sftp_accessKeyId !== ''&&
    //        ar.sftp_secretAccessKey &&
    //        ar.sftp_secretAccessKey !== ''&&
    //        ar.sftp_region &&
    //        ar.sftp_region !== ''&&
    //        ar.sftp_bucket !== ''
    //       ){
    //         if(!ar.sftp_dir || ar.sftp_dir === '/'){
    //             ar.sftp_dir = ''
    //         }
    //         if(ar.sftp_dir !== ''){
    //             ar.sftp_dir = s.checkCorrectPathEnding(ar.sftp_dir)
    //         }
    //         s.group[e.ke].sftp = new s.group[e.ke].sftp.S3();
    //         s.group[e.ke].sftp = new require('ssh2-sftp-client')();
    //         var connectionDetails = {
    //             host: ar.sftp_host,
    //             port: ar.sftp_port
    //         }
    //         if(!ar.sftp_port)ar.sftp_port = 22
    //         if(ar.sftp_username)connectionDetails.username = ar.sftp_username
    //         if(ar.sftp_password)connectionDetails.password = ar.sftp_password
    //         if(ar.sftp_privateKey)connectionDetails.privateKey = ar.sftp_privateKey
    //         sftp.connect(connectionDetails).then(() => {
    //             return sftp.list('/pathname');
    //         }).then((data) => {
    //             console.log(data, 'the data info');
    //         }).catch((err) => {
    //             console.log(err, 'catch error');
    //         });
    //     }
    // }
    // var unloadSftpForUser = function(user){
    //     s.group[user.ke].sftp = null
    // }
    // var deleteVideoFromSftp = function(e,video,callback){
    //     // e = user
    //     try{
    //         var videoDetails = JSON.parse(video.details)
    //     }catch(err){
    //         var videoDetails = video.details
    //     }
    //     s.group[e.ke].sftp.deleteObject({
    //         Bucket: s.group[e.ke].init.sftp_bucket,
    //         Key: videoDetails.location,
    //     }, function(err, data) {
    //         if (err) console.log(err);
    //         callback()
    //     });
    // }
    // var uploadVideoToSftp = function(e,k){
    //     //e = video object
    //     //k = temporary values
    //     if(!k)k={};
    //     //cloud saver - SFTP
    //     if(s.group[e.ke].sftp && s.group[e.ke].init.use_sftp !== '0' && s.group[e.ke].init.sftp_save === '1'){
    //         var fileStream = fs.createReadStream(k.dir+k.filename);
    //         fileStream.on('error', function (err) {
    //             console.error(err)
    //         })
    //         var saveLocation = s.group[e.ke].init.sftp_dir+e.ke+'/'+e.mid+'/'+k.filename
    //         s.group[e.ke].sftp.upload({
    //             Bucket: s.group[e.ke].init.sftp_bucket,
    //             Key: saveLocation,
    //             Body:fileStream,
    //             ACL:'public-read'
    //         },function(err,data){
    //             if(err){
    //                 s.userLog(e,{type:lang['SFTP Upload Error'],msg:err})
    //             }
    //             if(s.group[e.ke].init.sftp_log === '1' && data && data.Location){
    //                 var save = [
    //                     e.mid,
    //                     e.ke,
    //                     k.startTime,
    //                     1,
    //                     s.s({
    //                         type : 'sftp',
    //                         location : saveLocation
    //                     }),
    //                     k.filesize,
    //                     k.endTime,
    //                     data.Location
    //                 ]
    //                 s.sqlQuery('INSERT INTO `Cloud Videos` (mid,ke,time,status,details,size,end,href) VALUES (?,?,?,?,?,?,?,?)',save)
    //                 s.setCloudDiskUsedForGroup(e,{
    //                     amount : k.filesizeMB,
    //                     storageType : 'sftp'
    //                 })
    //                 s.purgeCloudDiskForGroup(e,'sftp')
    //             }
    //         })
    //     }
    // }
    //add the extenders
    //webdav
    s.loadGroupAppExtender(loadWebDavForUser)
    s.unloadGroupAppExtender(unloadWebDavForUser)
    s.insertCompletedVideoExtender(uploadVideoToWebDav)
    s.deleteVideoFromCloudExtensions['webdav'] = deleteVideoFromWebDav
    s.cloudDiskUseStartupExtensions['webdav'] = cloudDiskUseStartupForWebDav
    s.beforeAccountSave(beforeAccountSaveForWebDav)
    s.onAccountSave(cloudDiskUseStartupForWebDav)
    s.cloudDisksLoader('webdav')
    //amazon s3
    s.loadGroupAppExtender(loadAmazonS3ForUser)
    s.unloadGroupAppExtender(unloadAmazonS3ForUser)
    s.insertCompletedVideoExtender(uploadVideoToAmazonS3)
    s.deleteVideoFromCloudExtensions['s3'] = deleteVideoFromAmazonS3
    s.cloudDiskUseStartupExtensions['s3'] = cloudDiskUseStartupForAmazonS3
    s.beforeAccountSave(beforeAccountSaveForAmazonS3)
    s.onAccountSave(cloudDiskUseStartupForAmazonS3)
    s.cloudDisksLoader('s3')
    //backblaze b2
    s.loadGroupAppExtender(loadBackblazeB2ForUser)
    s.unloadGroupAppExtender(unloadBackblazeB2ForUser)
    s.insertCompletedVideoExtender(uploadVideoToBackblazeB2)
    s.deleteVideoFromCloudExtensions['b2'] = deleteVideoFromBackblazeB2
    s.cloudDiskUseStartupExtensions['b2'] = cloudDiskUseStartupForBackblazeB2
    s.beforeAccountSave(beforeAccountSaveForBackblazeB2)
    s.onAccountSave(cloudDiskUseStartupForBackblazeB2)
    s.cloudDisksLoader('b2')
    //SFTP
    // s.loadGroupAppExtender(loadSftpForUser)
    // s.unloadGroupAppExtender(unloadSftpForUser)
    // s.insertCompletedVideoExtender(uploadVideoToSftp)
    // s.deleteVideoFromCloudExtensions['sftp'] = deleteVideoFromSftp
    // s.cloudDiskUseStartupExtensions['sftp'] = cloudDiskUseStartupForSftp
    // s.beforeAccountSave(beforeAccountSaveForSftp)
    // s.onAccountSave(cloudDiskUseStartupForSftp)
    // s.cloudDisksLoader('sftp')
}
