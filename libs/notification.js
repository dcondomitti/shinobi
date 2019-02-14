var fs = require("fs")
var Discord = require("discord.js")
module.exports = function(s,config,lang){
    //discord bot
    if(config.discordBot === true){
        try{
            s.discordMsg = function(data,files,groupKey){
                if(!data)data = {};
                var bot = s.group[groupKey].discordBot
                if(!bot){
                    s.userLog({ke:groupKey,mid:'$USER'},{type:lang.DiscordFailedText,msg:lang.DiscordNotEnabledText})
                    return
                }
                var sendBody = Object.assign({
                    color: 3447003,
                    title: 'Alert from Shinobi',
                    description: "",
                    fields: [],
                    timestamp: new Date(),
                    footer: {
                      icon_url: config.iconURL,
                      text: "Shinobi Systems"
                    }
                },data)
                var discordChannel = bot.channels.get(s.group[groupKey].init.discordbot_channel)
                if(discordChannel && discordChannel.send){
                    discordChannel.send({
                        embed: sendBody,
                        files: files
                    }).catch(err => {
                        if(err){
                            s.userLog({ke:groupKey,mid:'$USER'},{type:lang.DiscordErrorText,msg:err})
                            s.group[groupKey].discordBot = null
                            s.loadGroupApps({ke:groupKey})
                        }
                    })
                }else{
                    s.userLog({
                        ke: groupKey,
                        mid: '$USER'
                    },{
                        type: lang.DiscordErrorText,
                        msg: 'Check the Channel ID'
                    })
                }
            }
            var onEventTriggerBeforeFilterForDiscord = function(d,filter){
                filter.discord = true
            }
            var onEventTriggerForDiscord = function(d,filter){
                // d = event object
                //discord bot
                if(filter.discord && d.mon.details.detector_discordbot === '1' && !s.group[d.ke].mon[d.id].detector_discordbot){
                    var detector_discordbot_timeout
                    if(!d.mon.details.detector_discordbot_timeout||d.mon.details.detector_discordbot_timeout===''){
                        detector_discordbot_timeout = 1000*60*10;
                    }else{
                        detector_discordbot_timeout = parseFloat(d.mon.details.detector_discordbot_timeout)*1000*60;
                    }
                    //lock mailer so you don't get emailed on EVERY trigger event.
                    s.group[d.ke].mon[d.id].detector_discordbot=setTimeout(function(){
                        //unlock so you can mail again.
                        clearTimeout(s.group[d.ke].mon[d.id].detector_discordbot);
                        delete(s.group[d.ke].mon[d.id].detector_discordbot);
                    },detector_discordbot_timeout);
                    var files = []
                    var sendAlert = function(){
                        s.discordMsg({
                            author: {
                              name: s.group[d.ke].mon_conf[d.id].name,
                              icon_url: config.iconURL
                            },
                            title: lang.Event+' - '+d.screenshotName,
                            description: lang.EventText1+' '+d.currentTimestamp,
                            fields: [],
                            timestamp: d.currentTime,
                            footer: {
                              icon_url: config.iconURL,
                              text: "Shinobi Systems"
                            }
                        },files,d.ke)
                    }
                    if(d.mon.details.detector_discordbot_send_video === '1'){
                        s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                            s.discordMsg({
                                author: {
                                  name: s.group[d.ke].mon_conf[d.id].name,
                                  icon_url: config.iconURL
                                },
                                title: filename,
                                fields: [],
                                timestamp: d.currentTime,
                                footer: {
                                  icon_url: config.iconURL,
                                  text: "Shinobi Systems"
                                }
                            },[
                                {
                                    attachment: mergedFilepath,
                                    name: filename
                                }
                            ],d.ke)
                        })
                    }
                    s.getRawSnapshotFromMonitor(d.mon,function(data){
                        if((data[data.length-2] === 0xFF && data[data.length-1] === 0xD9)){
                            d.screenshotBuffer = data
                            files.push({
                                attachment: d.screenshotBuffer,
                                name: d.screenshotName+'.jpg'
                            })
                        }
                        sendAlert()
                    })
                }
            }
            var onTwoFactorAuthCodeNotificationForDiscord = function(r){
                // r = user
                if(r.details.factor_discord === '1'){
                    s.discordMsg({
                        author: {
                          name: r.lang['2-Factor Authentication'],
                          icon_url: config.iconURL
                        },
                        title: r.lang['Enter this code to proceed'],
                        description: '**'+s.factorAuth[r.ke][r.uid].key+'** '+r.lang.FactorAuthText1,
                        fields: [],
                        timestamp: new Date(),
                        footer: {
                          icon_url: config.iconURL,
                          text: "Shinobi Systems"
                        }
                    },[],r.ke)
                }
            }
            var loadDiscordBotForUser = function(user){
                ar=JSON.parse(user.details);
                //discordbot
                if(!s.group[user.ke].discordBot &&
                   config.discordBot === true &&
                   ar.discordbot === '1' &&
                   ar.discordbot_token !== ''
                  ){
                    s.group[user.ke].discordBot = new Discord.Client()
                    s.group[user.ke].discordBot.on('ready', () => {
                        s.userLog({
                            ke: user.ke,
                            mid: '$USER'
                        },{
                            type: lang.DiscordLoggedIn,
                            msg: s.group[user.ke].discordBot.user.tag
                        })
                    })
                    s.group[user.ke].discordBot.login(ar.discordbot_token)
                }
            }
            var unloadDiscordBotForUser = function(user){
                if(s.group[user.ke].discordBot && s.group[user.ke].discordBot.destroy){
                    s.group[user.ke].discordBot.destroy()
                    delete(s.group[user.ke].discordBot)
                }
            }
            s.loadGroupAppExtender(loadDiscordBotForUser)
            s.unloadGroupAppExtender(unloadDiscordBotForUser)
            s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForDiscord)
            s.onEventTrigger(onEventTriggerForDiscord)
            s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForDiscord)
        }catch(err){
            console.log(err)
            console.log('Could not start Discord bot, please run "npm install discord.js" inside the Shinobi folder.')
            s.discordMsg = function(){}
        }
    }
    // mailing with nodemailer
    try{
        if(config.mail){
            if(config.mail.from === undefined){config.mail.from = '"ShinobiCCTV" <no-reply@shinobi.video>'}
            s.nodemailer = require('nodemailer').createTransport(config.mail);
        }
        var onDetectorNoTriggerTimeoutForEmail = function(e){
            //e = monitor object
            if(config.mail && e.details.detector_notrigger_mail === '1'){
                s.sqlQuery('SELECT mail FROM Users WHERE ke=? AND details NOT LIKE ?',[e.ke,'%"sub"%'],function(err,r){
                    r = r[0]
                        var mailOptions = {
                            from: config.mail.from, // sender address
                            to: r.mail, // list of receivers
                            subject: lang.NoMotionEmailText1+' '+e.name+' ('+e.id+')', // Subject line
                            html: '<i>'+lang.NoMotionEmailText2+' '+e.details.detector_notrigger_timeout+' '+lang.minutes+'.</i>',
                        }
                        mailOptions.html+='<div><b>'+lang['Monitor Name']+' </b> : '+e.name+'</div>'
                        mailOptions.html+='<div><b>'+lang['Monitor ID']+' </b> : '+e.id+'</div>'
                        s.nodemailer.sendMail(mailOptions, (error, info) => {
                            if (error) {
                               s.systemLog('detector:notrigger:sendMail',error)
                                s.tx({f:'error',ff:'detector_notrigger_mail',id:e.id,ke:e.ke,error:error},'GRP_'+e.ke);
                                return ;
                            }
                            s.tx({f:'detector_notrigger_mail',id:e.id,ke:e.ke,info:info},'GRP_'+e.ke);
                        })
                })
            }
        }
        var onTwoFactorAuthCodeNotificationForEmail = function(r){
            // r = user object
            if(r.details.factor_mail !== '0'){
                var mailOptions = {
                    from: config.mail.from,
                    to: r.mail,
                    subject: r.lang['2-Factor Authentication'],
                    html: r.lang['Enter this code to proceed']+' <b>'+s.factorAuth[r.ke][r.uid].key+'</b>. '+r.lang.FactorAuthText1,
                };
                s.nodemailer.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        s.systemLog(r.lang.MailError,error)
                        return
                    }
                })
            }
        }
        var onFilterEventForEmail = function(x,d){
            // x = filter function
            // d = filter event object
            if(x === 'email'){
                if(d.videos && d.videos.length > 0){
                    d.mailOptions = {
                        from: config.mail.from, // sender address
                        to: d.mail, // list of receivers
                        subject: lang['Filter Matches']+' : '+d.name, // Subject line
                        html: lang.FilterMatchesText1+' '+d.videos.length+' '+lang.FilterMatchesText2,
                    };
                    if(d.execute&&d.execute!==''){
                        d.mailOptions.html+='<div><b>'+lang.Executed+' :</b> '+d.execute+'</div>'
                    }
                    if(d.delete==='1'){
                        d.mailOptions.html+='<div><b>'+lang.Deleted+' :</b> '+lang.Yes+'</div>'
                    }
                    d.mailOptions.html+='<div><b>'+lang.Query+' :</b> '+d.query+'</div>'
                    d.mailOptions.html+='<div><b>'+lang['Filter ID']+' :</b> '+d.id+'</div>'
                    s.nodemailer.sendMail(d.mailOptions, (error, info) => {
                        if (error) {
                            s.tx({f:'error',ff:'filter_mail',ke:d.ke,error:error},'GRP_'+d.ke);
                            return ;
                        }
                        s.tx({f:'filter_mail',ke:d.ke,info:info},'GRP_'+d.ke);
                    })
                }
            }
        }
        var onEventTriggerBeforeFilterForEmail = function(d,filter){
            filter.mail = true
        }
        var onEventTriggerForEmail = function(d,filter){
            if(filter.mail && config.mail && !s.group[d.ke].mon[d.id].detector_mail && d.mon.details.detector_mail === '1'){
                s.sqlQuery('SELECT mail FROM Users WHERE ke=? AND details NOT LIKE ?',[d.ke,'%"sub"%'],function(err,r){
                    r=r[0];
                    var detector_mail_timeout
                    if(!d.mon.details.detector_mail_timeout||d.mon.details.detector_mail_timeout===''){
                        detector_mail_timeout = 1000*60*10;
                    }else{
                        detector_mail_timeout = parseFloat(d.mon.details.detector_mail_timeout)*1000*60;
                    }
                    //lock mailer so you don't get emailed on EVERY trigger event.
                    s.group[d.ke].mon[d.id].detector_mail=setTimeout(function(){
                        //unlock so you can mail again.
                        clearTimeout(s.group[d.ke].mon[d.id].detector_mail);
                        delete(s.group[d.ke].mon[d.id].detector_mail);
                    },detector_mail_timeout);
                    var files = []
                    var mailOptions = {
                        from: config.mail.from, // sender address
                        to: r.mail, // list of receivers
                        subject: lang.Event+' - '+d.screenshotName, // Subject line
                        html: '<i>'+lang.EventText1+' '+d.currentTimestamp+'.</i>',
                        attachments: files
                    }
                    var sendMail = function(){
                        Object.keys(d.details).forEach(function(v,n){
                            mailOptions.html+='<div><b>'+v+'</b> : '+d.details[v]+'</div>'
                        })
                        s.nodemailer.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                s.systemLog(lang.MailError,error)
                                return false;
                            }
                        })
                    }
                    if(d.mon.details.detector_mail_send_video === '1'){
                        s.mergeDetectorBufferChunks(d,function(mergedFilepath,filename){
                            s.nodemailer.sendMail({
                                from: config.mail.from,
                                to: r.mail,
                                subject: filename,
                                html: '',
                                attachments: [
                                    {
                                        filename: filename,
                                        content: fs.readFileSync(mergedFilepath)
                                    }
                                ]
                            }, (error, info) => {
                                if (error) {
                                    s.systemLog(lang.MailError,error)
                                    return false;
                                }
                            })
                        })
                    }
                    if(d.screenshotBuffer){
                        files.push({
                            filename: d.screenshotName+'.jpg',
                            content: d.screenshotBuffer
                        })
                        sendMail()
                    }else{
                        s.getRawSnapshotFromMonitor(d.mon,function(data){
                            d.screenshotBuffer = data
                            files.push({
                                filename: d.screenshotName+'.jpg',
                                content: data
                            })
                            sendMail()
                        })
                    }
                })
            }
        }
        s.onTwoFactorAuthCodeNotification(onTwoFactorAuthCodeNotificationForEmail)
        s.onEventTriggerBeforeFilter(onEventTriggerBeforeFilterForEmail)
        s.onEventTrigger(onEventTriggerForEmail)
        s.onFilterEvent(onFilterEventForEmail)
        s.onDetectorNoTriggerTimeout(onDetectorNoTriggerTimeoutForEmail)
    }catch(err){
        console.log(err)
    }
}
