var fs = require('fs');
var ssh2SftpClient = require('node-ssh')
module.exports = function(s,config,lang){
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
    //SFTP (Simple Uploader)
    s.addSimpleUploader({
        name: 'sftp',
        loadGroupAppExtender: loadSftpForUser,
        unloadGroupAppExtender: unloadSftpForUser,
        insertCompletedVideoExtender: uploadVideoToSftp,
        beforeAccountSave: beforeAccountSaveForSftp,
        onAccountSave: onAccountSaveForSftp,
        onMonitorSave: onMonitorSaveForSftp,
    })
}
