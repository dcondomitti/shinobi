var fs = require('fs');
module.exports = function(s,config,lang){
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
    //amazon s3
    s.addCloudUploader({
        name: 's3',
        loadGroupAppExtender: loadAmazonS3ForUser,
        unloadGroupAppExtender: unloadAmazonS3ForUser,
        insertCompletedVideoExtender: uploadVideoToAmazonS3,
        deleteVideoFromCloudExtensions: deleteVideoFromAmazonS3,
        cloudDiskUseStartupExtensions: cloudDiskUseStartupForAmazonS3,
        beforeAccountSave: beforeAccountSaveForAmazonS3,
        onAccountSave: cloudDiskUseStartupForAmazonS3,
    })
}
