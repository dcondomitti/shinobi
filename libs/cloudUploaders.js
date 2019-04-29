var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var webdav = require("webdav-fs");
var ssh2SftpClient = require('node-ssh')
module.exports = function(s,config,lang){
    var addCloudUploader = function(opt){
        s.loadGroupAppExtender(opt.loadGroupAppExtender)
        s.unloadGroupAppExtender(opt.unloadGroupAppExtender)
        s.insertCompletedVideoExtender(opt.insertCompletedVideoExtender)
        s.deleteVideoFromCloudExtensions[opt.name] = opt.deleteVideoFromCloudExtensions
        s.cloudDiskUseStartupExtensions[opt.name] = opt.cloudDiskUseStartupExtensions
        s.beforeAccountSave(opt.beforeAccountSave)
        s.onAccountSave(opt.onAccountSave)
        s.cloudDisksLoader(opt.name)
    }
    var addSimpleUploader = function(opt){
        s.loadGroupAppExtender(opt.loadGroupAppExtender)
        s.unloadGroupAppExtender(opt.unloadGroupAppExtender)
        s.insertCompletedVideoExtender(opt.insertCompletedVideoExtender)
        s.beforeAccountSave(opt.beforeAccountSave)
        s.onAccountSave(opt.onAccountSave)
        s.onMonitorSave(opt.onMonitorSave)
    }
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
        var userDetails = JSON.parse(e.details)
        if(userDetails.aws_use_global === '1' && config.cloudUploaders && config.cloudUploaders.AmazonS3){
            // {
            //     aws_accessKeyId: "",
            //     aws_secretAccessKey: "",
            //     aws_region: "",
            //     aws_s3_bucket: "",
            //     aws_s3_dir: "",
            // }
            userDetails = Object.assign(userDetails,config.cloudUploaders.AmazonS3)
        }
        //Amazon S3
        if(!s.group[e.ke].aws &&
           !s.group[e.ke].aws_s3 &&
           userDetails.aws_s3 !== '0' &&
           userDetails.aws_accessKeyId !== ''&&
           userDetails.aws_secretAccessKey &&
           userDetails.aws_secretAccessKey !== ''&&
           userDetails.aws_region &&
           userDetails.aws_region !== ''&&
           userDetails.aws_s3_bucket !== ''
          ){
            if(!userDetails.aws_s3_dir || userDetails.aws_s3_dir === '/'){
                userDetails.aws_s3_dir = ''
            }
            if(userDetails.aws_s3_dir !== ''){
                userDetails.aws_s3_dir = s.checkCorrectPathEnding(userDetails.aws_s3_dir)
            }
            s.group[e.ke].aws = new require("aws-sdk")
            s.group[e.ke].aws.config = new s.group[e.ke].aws.Config({
                accessKeyId: userDetails.aws_accessKeyId,
                secretAccessKey: userDetails.aws_secretAccessKey,
                region: userDetails.aws_region
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
                s.group[e.ke].bb_b2_refreshTimer = setTimeout(createB2Connection,1000 * 60 * 60)
            }
        }catch(err){
            s.debugLog(err)
        }
    }
    var unloadBackblazeB2ForUser = function(user){
        s.group[user.ke].bb_b2 = null
        clearTimeout(s.group[user.ke].bb_b2_refreshTimer)
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
    //SFTP
    var sftpErr = function(err){
        // console.log(err)
        s.userLog({mid:'$USER',ke:e.ke},{type:lang['SFTP Error'],msg:err.data || err})
    }
    var beforeAccountSaveForSftp = function(d){
        //d = save event
        d.form.details.use_sftp = d.d.use_sftp
    }
    var loadSftpForUser = function(e){
        // e = user
        var userDetails = JSON.parse(e.details);
        //SFTP
        if(!s.group[e.ke].sftp &&
            !s.group[e.ke].sftp &&
            userDetails.sftp !== '0' &&
            userDetails.sftp_host &&
            userDetails.sftp_host !== ''&&
            userDetails.sftp_port &&
            userDetails.sftp_port !== ''
          ){
            if(!userDetails.sftp_dir || userDetails.sftp_dir === '/'){
                userDetails.sftp_dir = ''
            }
            if(userDetails.sftp_dir !== ''){
                userDetails.sftp_dir = s.checkCorrectPathEnding(userDetails.sftp_dir)
            }
            var sftp = new ssh2SftpClient()
            var connectionDetails = {
                host: userDetails.sftp_host,
                port: userDetails.sftp_port
            }
            if(!userDetails.sftp_port)connectionDetails.port = 22
            if(userDetails.sftp_username && userDetails.sftp_username !== '')connectionDetails.username = userDetails.sftp_username
            if(userDetails.sftp_password && userDetails.sftp_password !== '')connectionDetails.password = userDetails.sftp_password
            if(userDetails.sftp_privateKey && userDetails.sftp_privateKey !== '')connectionDetails.privateKey = userDetails.sftp_privateKey
            sftp.connect(connectionDetails).catch(sftpErr)
            s.group[e.ke].sftp = sftp
        }
    }
    var unloadSftpForUser = function(user){
        if(s.group[user.ke].sftp && s.group[user.ke].sftp.end)s.group[user.ke].sftp.end().then(function(){
            s.group[user.ke].sftp = null
        })
    }
    var uploadVideoToSftp = function(e,k){
        //e = video object
        //k = temporary values
        if(!k)k={};
        //cloud saver - SFTP
        if(s.group[e.ke].sftp && s.group[e.ke].init.use_sftp !== '0' && s.group[e.ke].init.sftp_save === '1'){
            var localPath = k.dir + k.filename
            var saveLocation = s.group[e.ke].init.sftp_dir + e.ke + '/' + e.mid + '/' + k.filename
            s.group[e.ke].sftp.putFile(localPath, saveLocation).catch(sftpErr)
        }
    }
    var createSftpDirectory = function(monitorConfig){
        var monitorSaveDirectory = s.group[monitorConfig.ke].init.sftp_dir + monitorConfig.ke + '/' + monitorConfig.mid
        s.group[monitorConfig.ke].sftp.mkdir(monitorSaveDirectory, true).catch(function(err){
            if(err.code !== 'ERR_ASSERTION'){
                sftpErr(err)
            }
        })
    }
    var onMonitorSaveForSftp = function(monitorConfig){
        if(s.group[monitorConfig.ke].sftp && s.group[monitorConfig.ke].init.use_sftp !== '0' && s.group[monitorConfig.ke].init.sftp_save === '1'){
            createSftpDirectory(monitorConfig)
        }
    }
    var onAccountSaveForSftp = function(group,userDetails,user){
        if(s.group[user.ke] && s.group[user.ke].sftp && s.group[user.ke].init.use_sftp !== '0' && s.group[user.ke].init.sftp_save === '1'){
            Object.keys(s.group[user.ke].mon_conf).forEach(function(monitorId){
                createSftpDirectory(s.group[user.ke].mon_conf[monitorId])
            })
        }
    }
    //add the extenders
    //webdav
    addCloudUploader({
        name: 'webdav',
        loadGroupAppExtender: loadWebDavForUser,
        unloadGroupAppExtender: unloadWebDavForUser,
        insertCompletedVideoExtender: uploadVideoToWebDav,
        deleteVideoFromCloudExtensions: deleteVideoFromWebDav,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForWebDav,
        beforeAccountSave: beforeAccountSaveForWebDav,
        onAccountSave: cloudDiskUseStartupForWebDav,
    })
    //amazon s3
    addCloudUploader({
        name: 's3',
        loadGroupAppExtender: loadAmazonS3ForUser,
        unloadGroupAppExtender: unloadAmazonS3ForUser,
        insertCompletedVideoExtender: uploadVideoToAmazonS3,
        deleteVideoFromCloudExtensions: deleteVideoFromAmazonS3,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForAmazonS3,
        beforeAccountSave: beforeAccountSaveForAmazonS3,
        onAccountSave: cloudDiskUseStartupForAmazonS3,
    })
    //backblaze b2
    addCloudUploader({
        name: 'b2',
        loadGroupAppExtender: loadBackblazeB2ForUser,
        unloadGroupAppExtender: unloadBackblazeB2ForUser,
        insertCompletedVideoExtender: uploadVideoToBackblazeB2,
        deleteVideoFromCloudExtensions: deleteVideoFromBackblazeB2,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForBackblazeB2,
        beforeAccountSave: beforeAccountSaveForBackblazeB2,
        onAccountSave: cloudDiskUseStartupForBackblazeB2,
    })
    //wasabi
    addCloudUploader({
        name: 'whcs',
        loadGroupAppExtender: loadWasabiHotCloudStorageForUser,
        unloadGroupAppExtender: unloadWasabiHotCloudStorageForUser,
        insertCompletedVideoExtender: uploadVideoToWasabiHotCloudStorage,
        deleteVideoFromCloudExtensions: deleteVideoFromWasabiHotCloudStorage,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForWasabiHotCloudStorage,
        beforeAccountSave: beforeAccountSaveForWasabiHotCloudStorage,
        onAccountSave: cloudDiskUseStartupForWasabiHotCloudStorage,
    })
    //SFTP (Simple Uploader)
    addSimpleUploader({
        name: 'sftp',
        loadGroupAppExtender: loadSftpForUser,
        unloadGroupAppExtender: unloadSftpForUser,
        insertCompletedVideoExtender: uploadVideoToSftp,
        beforeAccountSave: beforeAccountSaveForSftp,
        onAccountSave: onAccountSaveForSftp,
        onMonitorSave: onMonitorSaveForSftp,
    })
}
