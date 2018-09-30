var Discord = require("discord.js")
module.exports = function(s,config,lang){
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
                        s.loadGroupApps({ke:groupKey})
                    }
                })
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
                        console.log(`${user.mail} : Discord Bot Logged in as ${s.group[user.ke].discordBot.user.tag}!`)
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
        }catch(err){
            console.log('Could not start Discord bot, please run "npm install discord.js" inside the Shinobi folder.')
            s.discordMsg = function(){}
        }
    }
}
