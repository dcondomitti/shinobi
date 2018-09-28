var Discord = require("discord.js")
module.exports = function(s,config,lang,definitions){
    //discord bot
    if(config.discordBot === true){
        try{
            s.discordMsg = function(data,files,groupKey){
                if(!data)data = {};
                var bot = s.group[groupKey].discordBot
                if(!bot){
                    s.log({ke:groupKey,mid:'$USER'},{type:lang.DiscordFailedText,msg:lang.DiscordNotEnabledText})
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
                bot.channels.get(s.group[groupKey].init.discordbot_channel).send({
                    embed: sendBody,
                    files: files
                }).catch(err => {
                    if(err){
                        s.log({ke:groupKey,mid:'$USER'},{type:lang.DiscordErrorText,msg:err})
                        s.group[groupKey].discordBot = null
                        s.init('apps',{ke:groupKey})
                    }
                })
            }
        }catch(err){
            console.log('Could not start Discord bot, please run "npm install discord.js" inside the Shinobi folder.')
            s.discordMsg = function(){}
        }
    }
}
