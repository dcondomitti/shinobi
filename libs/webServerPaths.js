var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var os = require('os');
var moment = require('moment');
var request = require('request');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({})
var ejs = require('ejs');
var CircularJSON = require('circular-json');
module.exports = function(s,config,lang,app){
    if(config.productType==='Pro'){
        var LdapAuth = require('ldapauth-fork');
    }
    //get page URL
    if(!config.baseURL){
        config.baseURL = ""
    }else if(config.baseURL !== ''){
        config.baseURL = s.checkCorrectPathEnding(config.baseURL)
    }
    //Render Configurations - Web Paths
    if(config.webPaths === undefined){config.webPaths={}}
        //main access URI
        if(config.webPaths.home === undefined){config.webPaths.home='/'}
        //Super User URI
        if(config.webPaths.super === undefined){config.webPaths.super='/super'}
        //Admin URI
        if(config.webPaths.admin === undefined){config.webPaths.admin='/admin'}
        //API Prefix
        if(config.webPaths.apiPrefix === undefined){config.webPaths.apiPrefix='/'}else{config.webPaths.apiPrefix = s.checkCorrectPathEnding(config.webPaths.apiPrefix)}
    //Render Configurations - Page Render Paths
    if(config.renderPaths === undefined){config.renderPaths={}}
        //login page
        if(config.renderPaths.index === undefined){config.renderPaths.index='pages/index'}
        //dashboard page
        if(config.renderPaths.home === undefined){config.renderPaths.home='pages/home'}
        //sub-account administration page
        if(config.renderPaths.admin === undefined){config.renderPaths.admin='pages/admin'}
        //superuser page
        if(config.renderPaths.super === undefined){config.renderPaths.super='pages/super'}
        //2-Factor Auth page
        if(config.renderPaths.factorAuth === undefined){config.renderPaths.factorAuth='pages/factor'}
        //Streamer v1 (Dashcam Prototype) page
        if(config.renderPaths.streamer === undefined){config.renderPaths.streamer='pages/streamer'}
        //Streamer v2 (Dashcam) page
        if(config.renderPaths.dashcam === undefined){config.renderPaths.dashcam='pages/dashcam'}
        //embeddable widget page
        if(config.renderPaths.embed === undefined){config.renderPaths.embed='pages/embed'}
        //mjpeg full screen page
        if(config.renderPaths.mjpeg === undefined){config.renderPaths.mjpeg='pages/mjpeg'}
        //gridstack only page
        if(config.renderPaths.grid === undefined){config.renderPaths.grid='pages/grid'}
        //slick.js (cycle) page
        if(config.renderPaths.cycle === undefined){config.renderPaths.cycle='pages/cycle'}

    ////Pages
    app.enable('trust proxy');
    app.use('/libs',express.static(s.mainDirectory + '/web/libs'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.set('views', s.mainDirectory + '/web');
    app.set('view engine','ejs');
    //add template handler
    if(config.renderPaths.handler!==undefined){require(s.mainDirectory+'/web/'+config.renderPaths.handler+'.js').addHandlers(s,app,io)}

    //logout
    app.get(config.webPaths.apiPrefix+':auth/logout/:ke/:id', function (req,res){
        if(s.group[req.params.ke]&&s.group[req.params.ke].users[req.params.auth]){
            delete(s.api[req.params.auth]);
            delete(s.group[req.params.ke].users[req.params.auth]);
            s.sqlQuery("UPDATE Users SET auth=? WHERE auth=? AND ke=? AND uid=?",['',req.params.auth,req.params.ke,req.params.id])
            res.end(s.s({ok:true,msg:'You have been logged out, session key is now inactive.'}))
        }else{
            res.end(s.s({ok:false,msg:'This group key does not exist or this user is not logged in.'}))
        }
    });
    //main page
    app.get(config.webPaths.home, function (req,res){
        res.render(config.renderPaths.index,{lang:lang,config:config,screen:'dashboard',originalURL:s.getOriginalUrl(req)},function(err,html){
            if(err){
                s.systemLog(err)
            }
            res.end(html)
        })
    });
    //admin page
    app.get(config.webPaths.admin, function (req,res){
        res.render(config.renderPaths.index,{lang:lang,config:config,screen:'admin',originalURL:s.getOriginalUrl(req)},function(err,html){
            if(err){
                s.systemLog(err)
            }
            res.end(html)
        })
    });
    //super page
    app.get(config.webPaths.super, function (req,res){

        res.render(config.renderPaths.index,{lang:lang,config:config,screen:'super',originalURL:s.getOriginalUrl(req)},function(err,html){
            if(err){
                s.systemLog(err)
            }
            res.end(html)
        })
    });
    //update server
    app.get(config.webPaths.apiPrefix+':auth/update/:key', function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        req.fn=function(user){
            if(!config.updateKey){
                req.ret.msg=user.lang.updateKeyText1;
                return;
            }
            if(req.params.key===config.updateKey){
                req.ret.ok=true;
                exec('chmod +x '+s.mainDirectory+'/UPDATE.sh&&'+s.mainDirectory+'/UPDATE.sh',{detached: true})
            }else{
                req.ret.msg=user.lang.updateKeyText2;
            }
            res.end(s.s(req.ret));
        }
        s.auth(req.params,req.fn,res,req);
    });
    //get user details by API key
    app.get(config.webPaths.apiPrefix+':auth/userInfo/:ke',function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            req.ret.ok=true
            req.ret.user=user
            res.end(s.s(req.ret));
        },res,req);
    })
    //register function
    app.post(config.webPaths.apiPrefix+':auth/register/:ke/:uid',function (req,res){
        req.resp={ok:false};
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            if(user.details.sub){
                res.end(user.lang['Not Permitted'])
                return
            }
            s.sqlQuery('SELECT * FROM Users WHERE uid=? AND ke=? AND details NOT LIKE ? LIMIT 1',[req.params.uid,req.params.ke,'%"sub"%'],function(err,u) {
                if(u&&u[0]){
                    if(req.body.mail!==''&&req.body.pass!==''){
                        if(req.body.pass===req.body.password_again){
                            s.sqlQuery('SELECT * FROM Users WHERE mail=?',[req.body.mail],function(err,r) {
                                if(r&&r[0]){//found one exist
                                    req.resp.msg='Email address is in use.';
                                }else{//create new
                                    req.resp.msg='New Account Created';req.resp.ok=true;
                                    req.gid=s.gid();
                                    req.body.details='{"sub":"1","allmonitors":"1"}';
                                    s.sqlQuery('INSERT INTO Users (ke,uid,mail,pass,details) VALUES (?,?,?,?,?)',[req.params.ke,req.gid,req.body.mail,s.createHash(req.body.pass),req.body.details])
                                    s.tx({f:'add_sub_account',details:req.body.details,ke:req.params.ke,uid:req.gid,mail:req.body.mail},'ADM_'+req.params.ke);
                                }
                                res.end(s.s(req.resp));
                            })
                        }else{
                            req.resp.msg=user.lang['Passwords Don\'t Match'];
                        }
                    }else{
                        req.resp.msg=user.lang['Fields cannot be empty'];
                    }
                }else{
                    req.resp.msg=user.lang['Not an Administrator Account'];
                }
                if(req.resp.msg){
                    res.end(s.s(req.resp));
                }
            })
        },res,req);
    })
    //login function
    s.deleteFactorAuth=function(r){
        delete(s.factorAuth[r.ke][r.uid])
        if(Object.keys(s.factorAuth[r.ke]).length===0){
            delete(s.factorAuth[r.ke])
        }
    }
    app.post([config.webPaths.home,s.checkCorrectPathEnding(config.webPaths.home)+':screen'],function (req,res){
        req.ip=req.headers['cf-connecting-ip']||req.headers["CF-Connecting-IP"]||req.headers["'x-forwarded-for"]||req.connection.remoteAddress;
        if(req.query.json === 'true'){
            res.header("Access-Control-Allow-Origin",req.headers.origin);
        }
        // brute check
        if(s.failedLoginAttempts[req.body.mail] && s.failedLoginAttempts[req.body.mail].failCount >= 5){
            if(req.query.json=='true'){
                res.end(s.s({ok:false}))
            }else{
                res.render(config.renderPaths.index,{
                    failedLogin:true,
                    message:lang.failedLoginText1,
                    lang:lang,
                    config:config,
                    screen:req.params.screen,
                    originalURL:s.getOriginalUrl(req)
                },function(err,html){
                    if(err){
                        s.systemLog(err)
                    }
                    res.end(html);
                });
            }
            return false
        }
        //
        req.renderFunction=function(focus,data){
            if(s.failedLoginAttempts[req.body.mail]){
                clearTimeout(s.failedLoginAttempts[req.body.mail].timeout)
                delete(s.failedLoginAttempts[req.body.mail])
            }
            if(req.query.json=='true'){
                delete(data.config)
                data.ok=true;
                res.setHeader('Content-Type', 'application/json');
                res.end(s.s(data))
            }else{
                data.originalURL = s.getOriginalUrl(req)
                data.screen=req.params.screen
                res.render(focus,data,function(err,html){
                    if(err){
                        s.systemLog(err)
                    }
                    res.end(html)
                });
            }
        }
        req.failed=function(board){
            // brute protector
            if(!s.failedLoginAttempts[req.body.mail]){
                s.failedLoginAttempts[req.body.mail] = {
                    failCount : 0,
                    ips : {}
                }
            }
            ++s.failedLoginAttempts[req.body.mail].failCount
            if(!s.failedLoginAttempts[req.body.mail].ips[req.ip]){
                s.failedLoginAttempts[req.body.mail].ips[req.ip] = 0
            }
            ++s.failedLoginAttempts[req.body.mail].ips[req.ip]
            clearTimeout(s.failedLoginAttempts[req.body.mail].timeout)
            s.failedLoginAttempts[req.body.mail].timeout = setTimeout(function(){
                delete(s.failedLoginAttempts[req.body.mail])
            },1000 * 60 * 15)
            // check if JSON
            if(req.query.json=='true'){
                res.setHeader('Content-Type', 'application/json');
                res.end(s.s({ok:false}))
            }else{
                res.render(config.renderPaths.index,{
                    failedLogin:true,
                    message:lang.failedLoginText2,
                    lang:lang,
                    config:config,
                    screen:req.params.screen,
                    originalURL:s.getOriginalUrl(req)
                },function(err,html){
                    if(err){
                        s.systemLog(err)
                    }
                    res.end(html);
                });
            }
            req.logTo={ke:'$',mid:'$USER'}
            req.logData={type:lang['Authentication Failed'],msg:{for:board,mail:req.body.mail,ip:req.ip}}
            if(board==='super'){
                s.log(req.logTo,req.logData)
            }else{
                s.sqlQuery('SELECT ke,uid,details FROM Users WHERE mail=?',[req.body.mail],function(err,r) {
                    if(r&&r[0]){
                        r=r[0]
                        r.details=JSON.parse(r.details);
                        r.lang=s.getLanguageFile(r.details.lang)
                        req.logData.id=r.uid
                        req.logData.type=r.lang['Authentication Failed']
                        req.logTo.ke=r.ke
                    }
                    s.log(req.logTo,req.logData)
                })
            }
        }
        req.fn=function(r){
            switch(req.body.function){
                case'cam':
                    s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND type=?',[r.ke,"dashcam"],function(err,rr){
                        req.resp.mons=rr;
                        req.renderFunction(config.renderPaths.dashcam,{$user:req.resp,lang:r.lang,define:s.getDefinitonFile(r.details.lang)});
                    })
                break;
                case'streamer':
                    s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND type=?',[r.ke,"socket"],function(err,rr){
                        req.resp.mons=rr;
                        req.renderFunction(config.renderPaths.streamer,{$user:req.resp,lang:r.lang,define:s.getDefinitonFile(r.details.lang)});
                    })
                break;
                case'admin':
                    if(!r.details.sub){
                        s.sqlQuery('SELECT uid,mail,details FROM Users WHERE ke=? AND details LIKE \'%"sub"%\'',[r.ke],function(err,rr) {
                            s.sqlQuery('SELECT * FROM Monitors WHERE ke=?',[r.ke],function(err,rrr) {
                                req.renderFunction(config.renderPaths.admin,{$user:req.resp,$subs:rr,$mons:rrr,lang:r.lang,define:s.getDefinitonFile(r.details.lang)});
                            })
                        })
                    }else{
                        //not admin user
                        req.renderFunction(config.renderPaths.home,{$user:req.resp,config:config,lang:r.lang,define:s.getDefinitonFile(r.details.lang),addStorage:s.dir.addStorage,fs:fs,__dirname:s.mainDirectory});
                    }
                break;
                default:
                    req.renderFunction(config.renderPaths.home,{$user:req.resp,config:config,lang:r.lang,define:s.getDefinitonFile(r.details.lang),addStorage:s.dir.addStorage,fs:fs,__dirname:s.mainDirectory});
                break;
            }
            s.log({ke:r.ke,mid:'$USER'},{type:r.lang['New Authentication Token'],msg:{for:req.body.function,mail:r.mail,id:r.uid,ip:req.ip}})
        //    res.end();
        }
        if(req.body.mail&&req.body.pass){
            req.default=function(){
                s.sqlQuery('SELECT * FROM Users WHERE mail=? AND pass=?',[req.body.mail,s.createHash(req.body.pass)],function(err,r) {
                    req.resp={ok:false};
                    if(!err&&r&&r[0]){
                        r=r[0];r.auth=s.md5(s.gid());
                        s.sqlQuery("UPDATE Users SET auth=? WHERE ke=? AND uid=?",[r.auth,r.ke,r.uid])
                        req.resp={ok:true,auth_token:r.auth,ke:r.ke,uid:r.uid,mail:r.mail,details:r.details};
                        r.details=JSON.parse(r.details);
                        r.lang=s.getLanguageFile(r.details.lang)
                        req.factorAuth=function(cb){
                            if(r.details.factorAuth==="1"){
                                if(!r.details.acceptedMachines||!(r.details.acceptedMachines instanceof Object)){
                                    r.details.acceptedMachines={}
                                }
                                if(!r.details.acceptedMachines[req.body.machineID]){
                                    req.complete=function(){
                                        s.factorAuth[r.ke][r.uid].function = req.body.function
                                        s.factorAuth[r.ke][r.uid].info = req.resp
                                        clearTimeout(s.factorAuth[r.ke][r.uid].expireAuth)
                                        s.factorAuth[r.ke][r.uid].expireAuth=setTimeout(function(){
                                            s.deleteFactorAuth(r)
                                        },1000*60*15)
                                        req.renderFunction(config.renderPaths.factorAuth,{$user:req.resp,lang:r.lang})
                                    }
                                    if(!s.factorAuth[r.ke]){s.factorAuth[r.ke]={}}
                                    if(!s.factorAuth[r.ke][r.uid]){
                                        s.factorAuth[r.ke][r.uid]={key:s.nid(),user:r}
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
                                            });
                                        }
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
                                        req.complete()
                                    }else{
                                        req.complete()
                                    }
                                }else{
                                   req.fn(r)
                                }
                            }else{
                               req.fn(r)
                            }
                        }
                        if(r.details.sub){
                            s.sqlQuery('SELECT details FROM Users WHERE ke=? AND details NOT LIKE ?',[r.ke,'%"sub"%'],function(err,rr) {
                                rr=rr[0];
                                rr.details=JSON.parse(rr.details);
                                r.details.mon_groups=rr.details.mon_groups;
                                req.resp.details=JSON.stringify(r.details);
                                req.factorAuth()
                            })
                        }else{
                            req.factorAuth()
                        }
                    }else{
                        req.failed(req.body.function)
                    }
                })
            }
            if(LdapAuth&&req.body.function==='ldap'&&req.body.key!==''){
                s.sqlQuery('SELECT * FROM Users WHERE  ke=? AND details NOT LIKE ?',[req.body.key,'%"sub"%'],function(err,r) {
                    if(r&&r[0]){
                        r=r[0]
                        r.details=JSON.parse(r.details)
                        r.lang=s.getLanguageFile(r.details.lang)
                        if(r.details.use_ldap!=='0'&&r.details.ldap_enable==='1'&&r.details.ldap_url&&r.details.ldap_url!==''){
                            req.mailArray={}
                            req.body.mail.split(',').forEach(function(v){
                                v=v.split('=')
                                req.mailArray[v[0]]=v[1]
                            })
                            if(!r.details.ldap_bindDN||r.details.ldap_bindDN===''){
                                r.details.ldap_bindDN=req.body.mail
                            }
                            if(!r.details.ldap_bindCredentials||r.details.ldap_bindCredentials===''){
                                r.details.ldap_bindCredentials=req.body.pass
                            }
                            if(!r.details.ldap_searchFilter||r.details.ldap_searchFilter===''){
                                r.details.ldap_searchFilter=req.body.mail
                                if(req.mailArray.cn){
                                    r.details.ldap_searchFilter='cn='+req.mailArray.cn
                                }
                                if(req.mailArray.uid){
                                    r.details.ldap_searchFilter='uid='+req.mailArray.uid
                                }
                            }else{
                                r.details.ldap_searchFilter=r.details.ldap_searchFilter.replace('{{username}}',req.body.mail)
                            }
                            if(!r.details.ldap_searchBase||r.details.ldap_searchBase===''){
                                r.details.ldap_searchBase='dc=test,dc=com'
                            }
                            req.auth = new LdapAuth({
                                url:r.details.ldap_url,
                                bindDN:r.details.ldap_bindDN,
                                bindCredentials:r.details.ldap_bindCredentials,
                                searchBase:r.details.ldap_searchBase,
                                searchFilter:'('+r.details.ldap_searchFilter+')',
                                reconnect:true
                            });
                            req.auth.on('error', function (err) {
                                console.error('LdapAuth: ', err);
                            });

                            req.auth.authenticate(req.body.mail, req.body.pass, function(err, user) {
                                if(user){
                                    //found user
                                    if(!user.uid){
                                        user.uid=s.gid()
                                    }
                                    req.resp={
                                        ke:req.body.key,
                                        uid:user.uid,
                                        auth:s.createHash(s.gid()),
                                        mail:user.mail,
                                        pass:s.createHash(req.body.pass),
                                        details:JSON.stringify({
                                            sub:'1',
                                            ldap:'1',
                                            allmonitors:'1',
                                            filter: {}
                                        })
                                    }
                                    user.post=[]
                                    Object.keys(req.resp).forEach(function(v){
                                        user.post.push(req.resp[v])
                                    })
                                    s.log({ke:req.body.key,mid:'$USER'},{type:r.lang['LDAP Success'],msg:{user:user}})
                                    s.sqlQuery('SELECT * FROM Users WHERE  ke=? AND mail=?',[req.body.key,user.cn],function(err,rr){
                                        if(rr&&rr[0]){
                                            //already registered
                                            rr=rr[0]
                                            req.resp=rr;
                                            rr.details=JSON.parse(rr.details)
                                            req.resp.lang=s.getLanguageFile(rr.details.lang)
                                            s.log({ke:req.body.key,mid:'$USER'},{type:r.lang['LDAP User Authenticated'],msg:{user:user,shinobiUID:rr.uid}})
                                            s.sqlQuery("UPDATE Users SET auth=? WHERE ke=? AND uid=?",[req.resp.auth,req.resp.ke,rr.uid])
                                        }else{
                                            //new ldap login
                                            s.log({ke:req.body.key,mid:'$USER'},{type:r.lang['LDAP User is New'],msg:{info:r.lang['Creating New Account'],user:user}})
                                            req.resp.lang=r.lang
                                            s.sqlQuery('INSERT INTO Users (ke,uid,auth,mail,pass,details) VALUES (?,?,?,?,?,?)',user.post)
                                        }
                                        req.resp.details=JSON.stringify(req.resp.details)
                                        req.resp.auth_token=req.resp.auth
                                        req.resp.ok=true
                                        req.fn(req.resp)
                                    })
                                    return
                                }
                                s.log({ke:req.body.key,mid:'$USER'},{type:r.lang['LDAP Failed'],msg:{err:err}})
                                //no user
                                req.default()
                            });

                            req.auth.close(function(err) {

                            })
                        }else{
                            req.default()
                        }
                    }else{
                        req.default()
                    }
                })
            }else{
                if(req.body.function==='super'){
                    if(!fs.existsSync(s.location.super)){
                        res.end(lang.superAdminText)
                        return
                    }
                    req.ok=s.superAuth({mail:req.body.mail,pass:req.body.pass,users:true,md5:true},function(data){
                        s.sqlQuery('SELECT * FROM Logs WHERE ke=? ORDER BY `time` DESC LIMIT 30',['$'],function(err,r) {
                            if(!r){
                                r=[]
                            }
                            data.Logs=r;
                            fs.readFile(s.location.config,'utf8',function(err,file){
                                data.plainConfig=JSON.parse(file)
                                req.renderFunction(config.renderPaths.super,data);
                            })
                        })
                    })
                    if(req.ok===false){
                        req.failed(req.body.function)
                    }
                }else{
                    req.default()
                }
            }
        }else{
            if(req.body.machineID&&req.body.factorAuthKey){
                if(s.factorAuth[req.body.ke]&&s.factorAuth[req.body.ke][req.body.id]&&s.factorAuth[req.body.ke][req.body.id].key===req.body.factorAuthKey){
                    if(s.factorAuth[req.body.ke][req.body.id].key===req.body.factorAuthKey){
                        if(req.body.remember==="1"){
                            req.details=JSON.parse(s.factorAuth[req.body.ke][req.body.id].info.details)
                            req.lang=s.getLanguageFile(req.details.lang)
                            if(!req.details.acceptedMachines||!(req.details.acceptedMachines instanceof Object)){
                                req.details.acceptedMachines={}
                            }
                            if(!req.details.acceptedMachines[req.body.machineID]){
                                req.details.acceptedMachines[req.body.machineID]={}
                                s.sqlQuery("UPDATE Users SET details=? WHERE ke=? AND uid=?",[s.s(req.details),req.body.ke,req.body.id])
                            }
                        }
                        req.body.function = s.factorAuth[req.body.ke][req.body.id].function
                        req.resp = s.factorAuth[req.body.ke][req.body.id].info
                        req.fn(s.factorAuth[req.body.ke][req.body.id].user)
                    }else{
                        req.renderFunction(config.renderPaths.factorAuth,{$user:s.factorAuth[req.body.ke][req.body.id].info,lang:req.lang});
                        res.end();
                    }
                }else{
                    req.failed(lang['2-Factor Authentication'])
                }
            }else{
                req.failed(lang['2-Factor Authentication'])
            }
        }
    });
    // Brute Protection Lock Reset by API
    app.get([config.webPaths.apiPrefix+':auth/resetBruteProtection/:ke'], function (req,res){
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            if(s.failedLoginAttempts[user.mail]){
                clearTimeout(s.failedLoginAttempts[user.mail].timeout)
                delete(s.failedLoginAttempts[user.mail])
            }
            res.end(s.s({ok:true}))
        })
    })
    // Get HLS stream (m3u8)
    app.get([config.webPaths.apiPrefix+':auth/hls/:ke/:id/:file',config.webPaths.apiPrefix+':auth/hls/:ke/:id/:channel/:file'], function (req,res){
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        req.fn=function(user){
            s.checkChildProxy(req.params,function(){
                req.dir=s.dir.streams+req.params.ke+'/'+req.params.id+'/'
                if(req.params.channel){
                    req.dir+='channel'+(parseInt(req.params.channel)+config.pipeAddition)+'/'+req.params.file;
                }else{
                    req.dir+=req.params.file;
                }
                res.on('finish',function(){res.end();});
                if (fs.existsSync(req.dir)){
                    fs.createReadStream(req.dir).pipe(res);
                }else{
                    res.end(lang['File Not Found'])
                }
            },res,req)
        }
        s.auth(req.params,req.fn,res,req);
    });
    //Get JPEG snap
    app.get(config.webPaths.apiPrefix+':auth/jpeg/:ke/:id/s.jpg', function(req,res){
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            s.checkChildProxy(req.params,function(){
                if(user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors&&user.details.monitors.indexOf(req.params.id)===-1){
                    res.end(user.lang['Not Permitted'])
                    return
                }
                req.dir=s.dir.streams+req.params.ke+'/'+req.params.id+'/s.jpg';
                    res.writeHead(200, {
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                    });
                res.on('finish',function(){res.end();});
                if (fs.existsSync(req.dir)){
                    fs.createReadStream(req.dir).pipe(res);
                }else{
                    fs.createReadStream(config.defaultMjpeg).pipe(res);
                }
            },res,req);
        },res,req);
    });
    //Get FLV stream
    app.get([config.webPaths.apiPrefix+':auth/flv/:ke/:id/s.flv',config.webPaths.apiPrefix+':auth/flv/:ke/:id/:channel/s.flv'], function(req,res) {
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            s.checkChildProxy(req.params,function(){
                var Emitter,chunkChannel
                if(!req.params.channel){
                    Emitter = s.group[req.params.ke].mon[req.params.id].emitter
                    chunkChannel = 'MAIN'
                }else{
                    Emitter = s.group[req.params.ke].mon[req.params.id].emitterChannel[parseInt(req.params.channel)+config.pipeAddition]
                    chunkChannel = parseInt(req.params.channel)+config.pipeAddition
                }
                if(s.group[req.params.ke].mon[req.params.id].firstStreamChunk[chunkChannel]){
                    //variable name of contentWriter
                    var contentWriter
                    //set headers
                    res.setHeader('Content-Type', 'video/x-flv');
                    res.setHeader('Access-Control-Allow-Origin','*');
                    //write first frame on stream
                    res.write(s.group[req.params.ke].mon[req.params.id].firstStreamChunk[chunkChannel])
                    //write new frames as they happen
                    Emitter.on('data',contentWriter=function(buffer){
                        res.write(buffer)
                    })
                    //remove contentWriter when client leaves
                    res.on('close', function () {
                        Emitter.removeListener('data',contentWriter)
                    })
                }else{
                    res.setHeader('Content-Type', 'application/json');
                    res.end(s.s({ok:false,msg:'FLV not started or not ready'}))
                }
            },res,req)
        },res,req)
    })
    //Get H.265/h265 HEVC stream
    app.get([config.webPaths.apiPrefix+':auth/h265/:ke/:id/s.hevc',config.webPaths.apiPrefix+':auth/h265/:ke/:id/:channel/s.hevc'], function(req,res) {
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            s.checkChildProxy(req.params,function(){
                var Emitter,chunkChannel
                if(!req.params.channel){
                    Emitter = s.group[req.params.ke].mon[req.params.id].emitter
                    chunkChannel = 'MAIN'
                }else{
                    Emitter = s.group[req.params.ke].mon[req.params.id].emitterChannel[parseInt(req.params.channel)+config.pipeAddition]
                    chunkChannel = parseInt(req.params.channel)+config.pipeAddition
                }
                //variable name of contentWriter
                var contentWriter
                //set headers
                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Access-Control-Allow-Origin','*');
                //write new frames as they happen
                Emitter.on('data',contentWriter=function(buffer){
                    res.write(buffer)
                })
                //remove contentWriter when client leaves
                res.on('close', function () {
                    Emitter.removeListener('data',contentWriter)
                })
            },res,req)
        },res,req)
    })
    //montage - stand alone squished view with gridstackjs
    app.get([
        config.webPaths.apiPrefix+':auth/grid/:ke',
        config.webPaths.apiPrefix+':auth/grid/:ke/:group',
        config.webPaths.apiPrefix+':auth/cycle/:ke',
        config.webPaths.apiPrefix+':auth/cycle/:ke/:group'
    ], function(req,res) {
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            if(user.permissions.get_monitors==="0"){
                res.end(user.lang['Not Permitted'])
                return
            }

            req.params.protocol=req.protocol;
            req.sql='SELECT * FROM Monitors WHERE mode!=? AND mode!=? AND ke=?';req.ar=['stop','idle',req.params.ke];
            if(!req.params.id){
                if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                    try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                    req.or=[];
                    user.details.monitors.forEach(function(v,n){
                        req.or.push('mid=?');req.ar.push(v)
                    })
                    req.sql+=' AND ('+req.or.join(' OR ')+')'
                }
            }else{
                if(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                }else{
                    res.end(user.lang['There are no monitors that you can view with this account.']);
                    return;
                }
            }
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(req.params.group){
                    var filteredByGroupCheck = {};
                    var filteredByGroup = [];
                    r.forEach(function(v,n){
                        var details = JSON.parse(r[n].details);
                        try{
                            req.params.group.split('|').forEach(function(group){
                                var groups = JSON.parse(details.groups);
                                if(groups.indexOf(group) > -1 && !filteredByGroupCheck[v.mid]){
                                    filteredByGroupCheck[v.mid] = true;
                                    filteredByGroup.push(v)
                                }
                            })
                        }catch(err){

                        }
                    })
                    r = filteredByGroup;
                }
                r.forEach(function(v,n){
                    if(s.group[v.ke]&&s.group[v.ke].mon[v.mid]&&s.group[v.ke].mon[v.mid].watch){
                        r[n].currentlyWatching=Object.keys(s.group[v.ke].mon[v.mid].watch).length
                    }
                    r[n].subStream={}
                    var details = JSON.parse(r[n].details)
                    if(details.snap==='1'){
                        r[n].subStream.jpeg = '/'+req.params.auth+'/jpeg/'+v.ke+'/'+v.mid+'/s.jpg'
                    }
                    if(details.stream_channels&&details.stream_channels!==''){
                        try{
                            details.stream_channels=JSON.parse(details.stream_channels)
                            r[n].channels=[]
                            details.stream_channels.forEach(function(b,m){
                                var streamURL
                                switch(b.stream_type){
                                    case'mjpeg':
                                        streamURL='/'+req.params.auth+'/mjpeg/'+v.ke+'/'+v.mid+'/'+m
                                    break;
                                    case'hls':
                                        streamURL='/'+req.params.auth+'/hls/'+v.ke+'/'+v.mid+'/'+m+'/s.m3u8'
                                    break;
                                    case'h264':
                                        streamURL='/'+req.params.auth+'/h264/'+v.ke+'/'+v.mid+'/'+m
                                    break;
                                    case'flv':
                                        streamURL='/'+req.params.auth+'/flv/'+v.ke+'/'+v.mid+'/'+m+'/s.flv'
                                    break;
                                    case'mp4':
                                        streamURL='/'+req.params.auth+'/mp4/'+v.ke+'/'+v.mid+'/'+m+'/s.mp4'
                                    break;
                                }
                                r[n].channels.push(streamURL)
                            })
                        }catch(err){
                            s.log(req.params,{type:'Broken Monitor Object',msg:'Stream Channels Field is damaged. Skipping.'})
                        }
                    }
                })
                var page = config.renderPaths.grid
                if(req.path.indexOf('/cycle/') > -1){
                    page = config.renderPaths.cycle
                }
                res.render(page,{
                    data:Object.assign(req.params,req.query),
                    baseUrl:req.protocol+'://'+req.hostname,
                    config:config,
                    lang:user.lang,
                    $user:user,
                    monitors:r,
                    originalURL:s.getOriginalUrl(req),
                    query:req.query
                });
            })
        },res,req)
    });
    //MJPEG feed
    // if query string `full=true` is not present then it will load the MJPEG data directly and not the iframe ready page.
    app.get([config.webPaths.apiPrefix+':auth/mjpeg/:ke/:id',config.webPaths.apiPrefix+':auth/mjpeg/:ke/:id/:channel'], function(req,res) {
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        if(req.query.full=='true'){
            res.render(config.renderPaths.mjpeg,{url:'/'+req.params.auth+'/mjpeg/'+req.params.ke+'/'+req.params.id,originalURL:s.getOriginalUrl(req)});
            res.end()
        }else{
            s.auth(req.params,function(user){
                s.checkChildProxy(req.params,function(){
                    if(s.group[req.params.ke]&&s.group[req.params.ke].mon[req.params.id]){
                        if(user.permissions.watch_stream==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
                            res.end(user.lang['Not Permitted'])
                            return
                        }

                        var Emitter
                        if(!req.params.channel){
                            Emitter = s.group[req.params.ke].mon[req.params.id].emitter
                        }else{
                            Emitter = s.group[req.params.ke].mon[req.params.id].emitterChannel[parseInt(req.params.channel)+config.pipeAddition]
                        }
                        res.writeHead(200, {
                        'Content-Type': 'multipart/x-mixed-replace; boundary=shinobi',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Pragma': 'no-cache'
                        });
                        var contentWriter,content = fs.readFileSync(config.defaultMjpeg,'binary');
                        res.write("--shinobi\r\n");
                        res.write("Content-Type: image/jpeg\r\n");
                        res.write("Content-Length: " + content.length + "\r\n");
                        res.write("\r\n");
                        res.write(content,'binary');
                        res.write("\r\n");
                        Emitter.on('data',contentWriter=function(d){
                            content = d;
                            res.write(content,'binary');
                        })
                        res.on('close', function () {
                            Emitter.removeListener('data',contentWriter)
                        });
                    }else{
                        res.end();
                    }
                },res,req);
            },res,req);
        }
    });
    //embed monitor
    app.get([config.webPaths.apiPrefix+':auth/embed/:ke/:id',config.webPaths.apiPrefix+':auth/embed/:ke/:id/:addon'], function (req,res){
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        req.params.protocol=req.protocol;
        s.auth(req.params,function(user){
            if(user.permissions.watch_stream==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
                res.end(user.lang['Not Permitted'])
                return
            }
            if(s.group[req.params.ke]&&s.group[req.params.ke].mon[req.params.id]){
                if(s.group[req.params.ke].mon[req.params.id].started===1){
                    req.params.uid=user.uid;
                    res.render(config.renderPaths.embed,{data:req.params,baseUrl:req.protocol+'://'+req.hostname,config:config,lang:user.lang,mon:CircularJSON.parse(CircularJSON.stringify(s.group[req.params.ke].mon_conf[req.params.id])),originalURL:s.getOriginalUrl(req)});
                    res.end()
                }else{
                    res.end(user.lang['Cannot watch a monitor that isn\'t running.'])
                }
            }else{
                res.end(user.lang['No Monitor Exists with this ID.'])
            }
        },res,req);
    });
    // Get TV Channels (Monitor Streams) json
    app.get([config.webPaths.apiPrefix+':auth/tvChannels/:ke',config.webPaths.apiPrefix+':auth/tvChannels/:ke/:id','/get.php'], function (req,res){
        req.ret={ok:false};
        if(req.query.username&&req.query.password){
            req.params.username = req.query.username
            req.params.password = req.query.password
        }
        var output = ['h264','hls','mp4']
        if(req.query.output&&req.query.output!==''){
            output = req.query.output.split(',')
            output.forEach(function(type,n){
                if(type==='ts'){
                    output[n]='h264'
                    if(output.indexOf('hls')===-1){
                        output.push('hls')
                    }
                }
            })
        }
        var isM3u8 = false;
        if(req.query.type==='m3u8'||req.query.type==='m3u_plus'){
            //is m3u8
            isM3u8 = true;
        }else{
            res.setHeader('Content-Type', 'application/json');
        }
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        req.fn=function(user){
            if(user.permissions.get_monitors==="0"){
                res.end(s.s([]))
                return
            }
            if(!req.params.ke){
                req.params.ke = user.ke;
            }
            if(req.query.id&&!req.params.id){
                req.params.id = req.query.id;
            }
            req.sql='SELECT * FROM Monitors WHERE mode!=? AND ke=?';req.ar=['stop',req.params.ke];
            if(!req.params.id){
                if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                    try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                    req.or=[];
                    user.details.monitors.forEach(function(v,n){
                        req.or.push('mid=?');req.ar.push(v)
                    })
                    req.sql+=' AND ('+req.or.join(' OR ')+')'
                }
            }else{
                if(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                }else{
                    res.end('[]');
                    return;
                }
            }
            s.sqlQuery(req.sql,req.ar,function(err,r){
                var tvChannelMonitors = [];
                r.forEach(function(v,n){
                    var buildStreamURL = function(channelRow,type,channelNumber){
                        var streamURL
                        if(channelNumber){channelNumber = '/'+channelNumber}else{channelNumber=''}
                        switch(type){
                            case'mjpeg':
                                streamURL='/'+req.params.auth+'/mjpeg/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'hls':
                                streamURL='/'+req.params.auth+'/hls/'+v.ke+'/'+v.mid+channelNumber+'/s.m3u8'
                            break;
                            case'h264':
                                streamURL='/'+req.params.auth+'/h264/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'flv':
                                streamURL='/'+req.params.auth+'/flv/'+v.ke+'/'+v.mid+channelNumber+'/s.flv'
                            break;
                            case'mp4':
                                streamURL='/'+req.params.auth+'/mp4/'+v.ke+'/'+v.mid+channelNumber+'/s.ts'
                            break;
                        }
                        if(streamURL){
                            if(!channelRow.streamsSortedByType[type]){
                                channelRow.streamsSortedByType[type]=[]
                            }
                            channelRow.streamsSortedByType[type].push(streamURL)
                            channelRow.streams.push(streamURL)
                        }
                        return streamURL
                    }
                    var details = JSON.parse(r[n].details);
                    if(!details.tv_channel_id||details.tv_channel_id==='')details.tv_channel_id = 'temp_'+s.gid(5)
                    var channelRow = {
                        ke:v.ke,
                        mid:v.mid,
                        type:v.type,
                        groupTitle:details.tv_channel_group_title,
                        channel:details.tv_channel_id,
                    };
                    if(details.snap==='1'){
                        channelRow.snapshot = '/'+req.params.auth+'/jpeg/'+v.ke+'/'+v.mid+'/s.jpg'
                    }
                    channelRow.streams=[]
                    channelRow.streamsSortedByType={}
                    buildStreamURL(channelRow,details.stream_type)
                    if(details.stream_channels&&details.stream_channels!==''){
                        details.stream_channels=JSON.parse(details.stream_channels)
                        details.stream_channels.forEach(function(b,m){
                            buildStreamURL(channelRow,b.stream_type,m.toString())
                        })
                    }
                    if(details.tv_channel==='1'){
                        tvChannelMonitors.push(channelRow)
                    }
                })
                if(isM3u8){
                    var m3u8 = '#EXTM3U'+'\n'
                    tvChannelMonitors.forEach(function(channelRow,n){
                      output.forEach(function(type){
                        if(channelRow.streamsSortedByType[type]){
                            if(req.query.type==='m3u_plus'){
                                m3u8 +='#EXTINF-1 tvg-id="'+channelRow.mid+'" tvg-name="'+channelRow.channel+'" tvg-logo="'+req.protocol+'://'+req.headers.host+channelRow.snapshot+'" group-title="'+channelRow.groupTitle+'",'+channelRow.channel+'\n'
                            }else{
                                m3u8 +='#EXTINF:-1,'+channelRow.channel+' ('+type.toUpperCase()+') \n'
                            }
                            m3u8 += req.protocol+'://'+req.headers.host+channelRow.streamsSortedByType[type][0]+'\n'
                        }
                      })
                    })
                    res.end(m3u8)
                }else{
                    if(tvChannelMonitors.length===1){tvChannelMonitors=tvChannelMonitors[0];}
                    res.end(s.s(tvChannelMonitors));
                }
            })
        }
        s.auth(req.params,req.fn,res,req);
    });
    // Get monitors json
    app.get([config.webPaths.apiPrefix+':auth/monitor/:ke',config.webPaths.apiPrefix+':auth/monitor/:ke/:id'], function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        req.fn=function(user){
        if(user.permissions.get_monitors==="0"){
            res.end(s.s([]))
            return
        }
            req.sql='SELECT * FROM Monitors WHERE ke=?';req.ar=[req.params.ke];
            if(!req.params.id){
                if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                    try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                    req.or=[];
                    user.details.monitors.forEach(function(v,n){
                        req.or.push('mid=?');req.ar.push(v)
                    })
                    req.sql+=' AND ('+req.or.join(' OR ')+')'
                }
            }else{
                if(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                }else{
                    res.end('[]');
                    return;
                }
            }
            s.sqlQuery(req.sql,req.ar,function(err,r){
                r.forEach(function(v,n){
                    if(s.group[v.ke]&&s.group[v.ke].mon[v.mid]&&s.group[v.ke].mon[v.mid].watch){
                        r[n].currentlyWatching=Object.keys(s.group[v.ke].mon[v.mid].watch).length
                    }
                    if(s.group[v.ke]&&s.group[v.ke].mon[v.mid]&&s.group[v.ke].mon[v.mid].watch){
                        r[n].status = s.group[v.ke].mon[v.mid].monitorStatus
                    }
                    var buildStreamURL = function(type,channelNumber){
                        var streamURL
                        if(channelNumber){channelNumber = '/'+channelNumber}else{channelNumber=''}
                        switch(type){
                            case'mjpeg':
                                streamURL='/'+req.params.auth+'/mjpeg/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'hls':
                                streamURL='/'+req.params.auth+'/hls/'+v.ke+'/'+v.mid+channelNumber+'/s.m3u8'
                            break;
                            case'h264':
                                streamURL='/'+req.params.auth+'/h264/'+v.ke+'/'+v.mid+channelNumber
                            break;
                            case'flv':
                                streamURL='/'+req.params.auth+'/flv/'+v.ke+'/'+v.mid+channelNumber+'/s.flv'
                            break;
                            case'mp4':
                                streamURL='/'+req.params.auth+'/mp4/'+v.ke+'/'+v.mid+channelNumber+'/s.mp4'
                            break;
                        }
                        if(streamURL){
                            if(!r[n].streamsSortedByType[type]){
                                r[n].streamsSortedByType[type]=[]
                            }
                            r[n].streamsSortedByType[type].push(streamURL)
                            r[n].streams.push(streamURL)
                        }
                        return streamURL
                    }
                    var details = JSON.parse(r[n].details);
                    if(!details.tv_channel_id||details.tv_channel_id==='')details.tv_channel_id = 'temp_'+s.gid(5)
                    if(details.snap==='1'){
                        r[n].snapshot = '/'+req.params.auth+'/jpeg/'+v.ke+'/'+v.mid+'/s.jpg'
                    }
                    r[n].streams=[]
                    r[n].streamsSortedByType={}
                    buildStreamURL(details.stream_type)
                    if(details.stream_channels&&details.stream_channels!==''){
                        details.stream_channels=JSON.parse(details.stream_channels)
                        details.stream_channels.forEach(function(b,m){
                            buildStreamURL(b.stream_type,m.toString())
                        })
                    }
                })
                if(r.length===1){r=r[0];}
                res.end(s.s(r));
            })
        }
        s.auth(req.params,req.fn,res,req);
    });
    // Get videos json
    app.get([
        config.webPaths.apiPrefix+':auth/videos/:ke',
        config.webPaths.apiPrefix+':auth/videos/:ke/:id',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id'
    ], function (req,res){
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            var hasRestrictions = user.details.sub && user.details.allmonitors !== '1'
            if(
                user.permissions.watch_videos==="0" ||
                hasRestrictions && (!user.details.video_view || user.details.video_view.indexOf(req.params.id)===-1)
            ){
                res.end(s.s([]))
                return
            }
            var origURL = req.originalUrl.split('/')
            var videoParam = origURL[origURL.indexOf(req.params.auth) + 1]
            var videoSet = 'Videos'
            switch(videoParam){
                case'cloudVideos':
                    videoSet = 'Cloud Videos'
                break;
            }
            req.sql='SELECT * FROM `'+videoSet+'` WHERE ke=?';req.ar=[req.params.ke];
            req.count_sql='SELECT COUNT(*) FROM `'+videoSet+'` WHERE ke=?';req.count_ar=[req.params.ke];
            if(req.query.archived=='1'){
                req.sql+=' AND details LIKE \'%"archived":"1"\''
                req.count_sql+=' AND details LIKE \'%"archived":"1"\''
            }
            if(!req.params.id){
                if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                    try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                    req.or=[];
                    user.details.monitors.forEach(function(v,n){
                        req.or.push('mid=?');req.ar.push(v)
                    })
                    req.sql+=' AND ('+req.or.join(' OR ')+')'
                    req.count_sql+=' AND ('+req.or.join(' OR ')+')'
                }
            }else{
                if(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                    req.count_sql+=' and mid=?';req.count_ar.push(req.params.id)
                }else{
                    res.end('[]');
                    return;
                }
            }
            if(req.query.start||req.query.end){
                if(req.query.start && req.query.start !== ''){
                    req.query.start = s.stringToSqlTime(req.query.start)
                }
                if(req.query.end && req.query.end !== ''){
                    req.query.end = s.stringToSqlTime(req.query.end)
                }
                if(!req.query.startOperator||req.query.startOperator==''){
                    req.query.startOperator='>='
                }
                if(!req.query.endOperator||req.query.endOperator==''){
                    req.query.endOperator='<='
                }
                switch(true){
                    case(req.query.start&&req.query.start!==''&&req.query.end&&req.query.end!==''):
                        req.sql+=' AND `time` '+req.query.startOperator+' ? AND `end` '+req.query.endOperator+' ?';
                        req.count_sql+=' AND `time` '+req.query.startOperator+' ? AND `end` '+req.query.endOperator+' ?';
                        req.ar.push(req.query.start)
                        req.ar.push(req.query.end)
                        req.count_ar.push(req.query.start)
                        req.count_ar.push(req.query.end)
                    break;
                    case(req.query.start&&req.query.start!==''):
                        req.sql+=' AND `time` '+req.query.startOperator+' ?';
                        req.count_sql+=' AND `time` '+req.query.startOperator+' ?';
                        req.ar.push(req.query.start)
                        req.count_ar.push(req.query.start)
                    break;
                    case(req.query.end&&req.query.end!==''):
                        req.sql+=' AND `end` '+req.query.endOperator+' ?';
                        req.count_sql+=' AND `end` '+req.query.endOperator+' ?';
                        req.ar.push(req.query.end)
                        req.count_ar.push(req.query.end)
                    break;
                }
            }
            req.sql+=' ORDER BY `time` DESC';
            if(!req.query.limit||req.query.limit==''){
                req.query.limit='100'
            }
            if(req.query.limit!=='0'){
                req.sql+=' LIMIT '+req.query.limit
            }
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(!r){
                    res.end(s.s({total:0,limit:req.query.limit,skip:0,videos:[]}));
                    return
                }
                s.sqlQuery(req.count_sql,req.count_ar,function(err,count){
                    s.video('linkBuild',r,{
                        auth : req.params.auth,
                        videoParam : videoParam,
                        hideRemote : config.hideCloudSaveUrls
                    })
                    if(req.query.limit.indexOf(',')>-1){
                        req.skip=parseInt(req.query.limit.split(',')[0])
                        req.query.limit=parseInt(req.query.limit.split(',')[1])
                    }else{
                        req.skip=0
                        req.query.limit=parseInt(req.query.limit)
                    }
                    res.end(s.s({isUTC:config.useUTC,total:count[0]['COUNT(*)'],limit:req.query.limit,skip:req.skip,videos:r}));
                })
            })
        },res,req);
    });
    // Get events json (motion logs)
    app.get([config.webPaths.apiPrefix+':auth/events/:ke',config.webPaths.apiPrefix+':auth/events/:ke/:id',config.webPaths.apiPrefix+':auth/events/:ke/:id/:limit',config.webPaths.apiPrefix+':auth/events/:ke/:id/:limit/:start',config.webPaths.apiPrefix+':auth/events/:ke/:id/:limit/:start/:end'], function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            if(user.permissions.watch_videos==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.video_view.indexOf(req.params.id)===-1){
                res.end(s.s([]))
                return
            }
            req.sql='SELECT * FROM Events WHERE ke=?';req.ar=[req.params.ke];
            if(!req.params.id){
                if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                    try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                    req.or=[];
                    user.details.monitors.forEach(function(v,n){
                        req.or.push('mid=?');req.ar.push(v)
                    })
                    req.sql+=' AND ('+req.or.join(' OR ')+')'
                }
            }else{
                if(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                }else{
                    res.end('[]');
                    return;
                }
            }
            if(req.params.start&&req.params.start!==''){
                req.params.start = s.stringToSqlTime(req.params.start)
                if(req.params.end&&req.params.end!==''){
                    req.params.end = s.stringToSqlTime(req.params.end)
                    req.sql+=' AND `time` >= ? AND `time` <= ?';
                    req.ar.push(decodeURIComponent(req.params.start))
                    req.ar.push(decodeURIComponent(req.params.end))
                }else{
                    req.sql+=' AND `time` >= ?';
                    req.ar.push(decodeURIComponent(req.params.start))
                }
            }
            if(!req.params.limit||req.params.limit==''){req.params.limit=100}
            req.sql+=' ORDER BY `time` DESC LIMIT '+req.params.limit+'';
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(err){
                    err.sql=req.sql;
                    res.end(s.s(err));
                    return
                }
                if(!r){r=[]}
                r.forEach(function(v,n){
                    r[n].details=JSON.parse(v.details);
                })
                res.end(s.s(r));
            })
        },res,req);
    });
    // Get logs json
    app.get([config.webPaths.apiPrefix+':auth/logs/:ke',config.webPaths.apiPrefix+':auth/logs/:ke/:id'], function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            if(user.permissions.get_logs==="0" || user.details.sub && user.details.view_logs !== '1'){
                res.end(s.s([]))
                return
            }
            req.sql='SELECT * FROM Logs WHERE ke=?';req.ar=[req.params.ke];
            if(!req.params.id){
                if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                    try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                    req.or=[];
                    user.details.monitors.forEach(function(v,n){
                        req.or.push('mid=?');req.ar.push(v)
                    })
                    req.sql+=' AND ('+req.or.join(' OR ')+')'
                }
            }else{
                if(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1||req.params.id.indexOf('$')>-1){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                }else{
                    res.end('[]');
                    return;
                }
            }
            if(req.query.start||req.query.end){
                if(!req.query.startOperator||req.query.startOperator==''){
                    req.query.startOperator='>='
                }
                if(!req.query.endOperator||req.query.endOperator==''){
                    req.query.endOperator='<='
                }
                if(req.query.start && req.query.start !== '' && req.query.end && req.query.end !== ''){
                    req.query.start = s.stringToSqlTime(req.query.start)
                    req.query.end = s.stringToSqlTime(req.query.end)
                    req.sql+=' AND `time` '+req.query.startOperator+' ? AND `time` '+req.query.endOperator+' ?';
                    req.ar.push(req.query.start)
                    req.ar.push(req.query.end)
                }else if(req.query.start && req.query.start !== ''){
                    req.query.start = s.stringToSqlTime(req.query.start)
                    req.sql+=' AND `time` '+req.query.startOperator+' ?';
                    req.ar.push(req.query.start)
                }
            }
            if(!req.query.limit||req.query.limit==''){req.query.limit=50}
            req.sql+=' ORDER BY `time` DESC LIMIT '+req.query.limit+'';
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(err){
                    err.sql=req.sql;
                    res.end(s.s(err));
                    return
                }
                if(!r){r=[]}
                r.forEach(function(v,n){
                    r[n].info=JSON.parse(v.info)
                })
                res.end(s.s(r));
            })
        },res,req);
    });
    // Get monitors online json
    app.get(config.webPaths.apiPrefix+':auth/smonitor/:ke', function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        req.fn=function(user){
            if(user.permissions.get_monitors==="0"){
                res.end(s.s([]))
                return
            }
            req.sql='SELECT * FROM Monitors WHERE ke=?';req.ar=[req.params.ke];
            if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                req.or=[];
                user.details.monitors.forEach(function(v,n){
                    req.or.push('mid=?');req.ar.push(v)
                })
                req.sql+=' AND ('+req.or.join(' OR ')+')'
            }
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(r&&r[0]){
                    req.ar=[];
                    r.forEach(function(v){
                        if(s.group[req.params.ke]&&s.group[req.params.ke].mon[v.mid]&&s.group[req.params.ke].mon[v.mid].started===1){
                            req.ar.push(v)
                        }
                    })
                }else{
                    req.ar=[];
                }
                res.end(s.s(req.ar));
            })
        }
        s.auth(req.params,req.fn,res,req);
    });
    // Monitor Add,Edit,Delete
    app.all([config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id',config.webPaths.apiPrefix+':auth/configureMonitor/:ke/:id/:f'], function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            var hasRestrictions = user.details.sub && user.details.allmonitors !== '1'
            if(req.params.f !== 'delete'){
                if(!req.body.data&&!req.query.data){
                    req.ret.msg='No Monitor Data found.'
                    res.end(s.s(req.ret))
                    return
                }
                try{
                    if(req.query.data){
                        req.monitor=JSON.parse(req.query.data)
                    }else{
                        req.monitor=JSON.parse(req.body.data)
                    }
                }catch(er){
                    if(!req.monitor){
                        req.ret.msg=user.lang.monitorEditText1;
                        res.end(s.s(req.ret))
                    }
                    return
                }
                if(!user.details.sub ||
                   user.details.allmonitors === '1' ||
                   hasRestrictions && user.details.monitor_edit.indexOf(req.monitor.mid) >- 1 ||
                   hasRestrictions && user.details.monitor_create === '1'){
                        if(req.monitor&&req.monitor.mid&&req.monitor.name){
                            req.set=[],req.ar=[];
                            req.monitor.mid=req.params.id.replace(/[^\w\s]/gi,'').replace(/ /g,'');
                            try{
                                JSON.parse(req.monitor.details)
                            }catch(er){
                                if(!req.monitor.details||!req.monitor.details.stream_type){
                                    req.ret.msg=user.lang.monitorEditText2;
                                    res.end(s.s(req.ret))
                                    return
                                }else{
                                    req.monitor.details=JSON.stringify(req.monitor.details)
                                }
                            }
                            req.monitor.ke=req.params.ke
                            req.logObject={details:JSON.parse(req.monitor.details),ke:req.params.ke,mid:req.params.id}
                            s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND mid=?',[req.monitor.ke,req.monitor.mid],function(er,r){
                                req.tx={f:'monitor_edit',mid:req.monitor.mid,ke:req.monitor.ke,mon:req.monitor};
                                if(r&&r[0]){
                                    req.tx.new=false;
                                    Object.keys(req.monitor).forEach(function(v){
                                        if(req.monitor[v]&&req.monitor[v]!==''){
                                            req.set.push(v+'=?'),req.ar.push(req.monitor[v]);
                                        }
                                    })
                                    req.set=req.set.join(',');
                                    req.ar.push(req.monitor.ke),req.ar.push(req.monitor.mid);
                                    s.log(req.monitor,{type:'Monitor Updated',msg:'by user : '+user.uid});
                                    req.ret.msg=user.lang['Monitor Updated by user']+' : '+user.uid;
                                    s.sqlQuery('UPDATE Monitors SET '+req.set+' WHERE ke=? AND mid=?',req.ar)
                                    req.finish=1;
                                }else{
                                    if(!s.group[req.monitor.ke].init.max_camera||s.group[req.monitor.ke].init.max_camera==''||Object.keys(s.group[req.monitor.ke].mon).length <= parseInt(s.group[req.monitor.ke].init.max_camera)){
                                        req.tx.new=true;
                                        req.st=[];
                                        Object.keys(req.monitor).forEach(function(v){
                                            if(req.monitor[v]&&req.monitor[v]!==''){
                                                req.set.push(v),req.st.push('?'),req.ar.push(req.monitor[v]);
                                            }
                                        })
            //                                        req.set.push('ke'),req.st.push('?'),req.ar.push(req.monitor.ke);
                                        req.set=req.set.join(','),req.st=req.st.join(',');
                                        s.log(req.monitor,{type:'Monitor Added',msg:'by user : '+user.uid});
                                        req.ret.msg=user.lang['Monitor Added by user']+' : '+user.uid;
                                        s.sqlQuery('INSERT INTO Monitors ('+req.set+') VALUES ('+req.st+')',req.ar)
                                        req.finish=1;
                                    }else{
                                        req.tx.f='monitor_edit_failed';
                                        req.tx.ff='max_reached';
                                        req.ret.msg=user.lang.monitorEditFailedMaxReached;
                                    }
                                }
                                if(req.finish===1){
                                    req.monitor.details=JSON.parse(req.monitor.details)
                                    req.ret.ok=true;
                                    s.initiateMonitorObject({mid:req.monitor.mid,ke:req.monitor.ke});
                                    s.group[req.monitor.ke].mon_conf[req.monitor.mid]=s.cleanMonitorObject(req.monitor);
                                    if(req.monitor.mode==='stop'){
                                        s.camera('stop',req.monitor);
                                    }else{
                                        s.camera('stop',req.monitor);setTimeout(function(){s.camera(req.monitor.mode,req.monitor);},5000)
                                    };
                                    s.tx(req.tx,'STR_'+req.monitor.ke);
                                };
                                s.tx(req.tx,'GRP_'+req.monitor.ke);
                                res.end(s.s(req.ret))
                            })
                        }else{
                            req.ret.msg=user.lang.monitorEditText1;
                            res.end(s.s(req.ret))
                        }
                }else{
                        req.ret.msg=user.lang['Not Permitted'];
                        res.end(s.s(req.ret))
                }
            }else{
                if(!user.details.sub || user.details.allmonitors === '1' || user.details.monitor_edit.indexOf(req.params.id) > -1 || hasRestrictions && user.details.monitor_create === '1'){
                    s.log(s.group[req.params.ke].mon_conf[req.params.id],{type:'Monitor Deleted',msg:'by user : '+user.uid});
                    req.params.delete=1;s.camera('stop',req.params);
                    s.tx({f:'monitor_delete',uid:user.uid,mid:req.params.id,ke:req.params.ke},'GRP_'+req.params.ke);
                    s.sqlQuery('DELETE FROM Monitors WHERE ke=? AND mid=?',[req.params.ke,req.params.id])
    //                s.sqlQuery('DELETE FROM Files WHERE ke=? AND mid=?',[req.params.ke,req.params.id])
                    if(req.query.deleteFiles === 'true'){
                        //videos
                        s.dir.addStorage.forEach(function(v,n){
                            var videosDir = v.path+req.params.ke+'/'+req.params.id+'/'
                            fs.stat(videosDir,function(err,stat){
                                if(!err){
                                    s.file('deleteFolder',videosDir)
                                }
                            })
                        })
                        var videosDir = s.dir.videos+req.params.ke+'/'+req.params.id+'/'
                        fs.stat(videosDir,function(err,stat){
                            if(!err){
                                s.file('deleteFolder',videosDir)
                            }
                        })
                        //fileBin
                        var binDir = s.dir.fileBin+req.params.ke+'/'+req.params.id+'/'
                        fs.stat(binDir,function(err,stat){
                            if(!err){
                                s.file('deleteFolder',binDir)
                            }
                        })
                    }
                    req.ret.ok=true;
                    req.ret.msg='Monitor Deleted by user : '+user.uid
                    res.end(s.s(req.ret))
                }else{
                    req.ret.msg=user.lang['Not Permitted'];
                    res.end(s.s(req.ret))
                }
            }
        })
    })
    app.get([config.webPaths.apiPrefix+':auth/monitor/:ke/:id/:f',config.webPaths.apiPrefix+':auth/monitor/:ke/:id/:f/:ff',config.webPaths.apiPrefix+':auth/monitor/:ke/:id/:f/:ff/:fff'], function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            if(user.permissions.control_monitors==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitor_edit.indexOf(req.params.id)===-1){
                res.end(user.lang['Not Permitted'])
                return
            }
            if(req.params.f===''){req.ret.msg=user.lang.monitorGetText1;res.end(s.s(req.ret));return}
            if(req.params.f!=='stop'&&req.params.f!=='start'&&req.params.f!=='record'){
                req.ret.msg='Mode not recognized.';
                res.end(s.s(req.ret));
                return;
            }
            s.sqlQuery('SELECT * FROM Monitors WHERE ke=? AND mid=?',[req.params.ke,req.params.id],function(err,r){
                if(r&&r[0]){
                    r=r[0];
                    if(req.query.reset==='1'||(s.group[r.ke]&&s.group[r.ke].mon_conf[r.mid].mode!==req.params.f)||req.query.fps&&(!s.group[r.ke].mon[r.mid].currentState||!s.group[r.ke].mon[r.mid].currentState.trigger_on)){
                        if(req.query.reset!=='1'||!s.group[r.ke].mon[r.mid].trigger_timer){
                            if(!s.group[r.ke].mon[r.mid].currentState)s.group[r.ke].mon[r.mid].currentState={}
                            s.group[r.ke].mon[r.mid].currentState.mode=r.mode.toString()
                            s.group[r.ke].mon[r.mid].currentState.fps=r.fps.toString()
                            if(!s.group[r.ke].mon[r.mid].currentState.trigger_on){
                               s.group[r.ke].mon[r.mid].currentState.trigger_on=true
                            }else{
                                s.group[r.ke].mon[r.mid].currentState.trigger_on=false
                            }
                            r.mode=req.params.f;
                            try{r.details=JSON.parse(r.details);}catch(er){}
                            if(req.query.fps){
                                r.fps=parseFloat(r.details.detector_trigger_record_fps)
                                s.group[r.ke].mon[r.mid].currentState.detector_trigger_record_fps=r.fps
                            }
                            r.id=r.mid;
                            s.sqlQuery('UPDATE Monitors SET mode=? WHERE ke=? AND mid=?',[r.mode,r.ke,r.mid]);
                            s.group[r.ke].mon_conf[r.mid]=r;
                            s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'GRP_'+r.ke);
                            s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'STR_'+r.ke);
                            s.camera('stop',s.cleanMonitorObject(r));
                            if(req.params.f!=='stop'){
                                s.camera(req.params.f,s.cleanMonitorObject(r));
                            }
                            req.ret.msg=user.lang['Monitor mode changed']+' : '+req.params.f;
                        }else{
                            req.ret.msg=user.lang['Reset Timer'];
                        }
                        req.ret.cmd_at=s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss');
                        req.ret.ok=true;
                        if(req.params.ff&&req.params.f!=='stop'){
                            req.params.ff=parseFloat(req.params.ff);
                            clearTimeout(s.group[r.ke].mon[r.mid].trigger_timer)
                            switch(req.params.fff){
                                case'day':case'days':
                                    req.timeout=req.params.ff*1000*60*60*24
                                break;
                                case'hr':case'hour':case'hours':
                                    req.timeout=req.params.ff*1000*60*60
                                break;
                                case'min':case'minute':case'minutes':
                                    req.timeout=req.params.ff*1000*60
                                break;
                                default://seconds
                                    req.timeout=req.params.ff*1000
                                break;
                            }
                            s.group[r.ke].mon[r.mid].trigger_timer=setTimeout(function(){
                                delete(s.group[r.ke].mon[r.mid].trigger_timer)
                                s.sqlQuery('UPDATE Monitors SET mode=? WHERE ke=? AND mid=?',[s.group[r.ke].mon[r.mid].currentState.mode,r.ke,r.mid]);
                                r.neglectTriggerTimer=1;
                                r.mode=s.group[r.ke].mon[r.mid].currentState.mode;
                                r.fps=s.group[r.ke].mon[r.mid].currentState.fps;
                                s.camera('stop',s.cleanMonitorObject(r),function(){
                                    if(s.group[r.ke].mon[r.mid].currentState.mode!=='stop'){
                                        s.camera(s.group[r.ke].mon[r.mid].currentState.mode,s.cleanMonitorObject(r));
                                    }
                                    s.group[r.ke].mon_conf[r.mid]=r;
                                });
                                s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'GRP_'+r.ke);
                                s.tx({f:'monitor_edit',mid:r.mid,ke:r.ke,mon:r},'STR_'+r.ke);
                            },req.timeout);
    //                        req.ret.end_at=s.formattedTime(new Date,'YYYY-MM-DD HH:mm:ss').add(req.timeout,'milliseconds');
                        }
                     }else{
                        req.ret.msg=user.lang['Monitor mode is already']+' : '+req.params.f;
                    }
                }else{
                    req.ret.msg=user.lang['Monitor or Key does not exist.'];
                }
                res.end(s.s(req.ret));
            })
        },res,req);
    })
    //get file from fileBin bin
    app.get([config.webPaths.apiPrefix+':auth/fileBin/:ke',config.webPaths.apiPrefix+':auth/fileBin/:ke/:id'],function (req,res){
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        req.fn=function(user){
            req.sql='SELECT * FROM Files WHERE ke=?';req.ar=[req.params.ke];
            if(user.details.sub&&user.details.monitors&&user.details.allmonitors!=='1'){
                try{user.details.monitors=JSON.parse(user.details.monitors);}catch(er){}
                req.or=[];
                user.details.monitors.forEach(function(v,n){
                    req.or.push('mid=?');req.ar.push(v)
                })
                req.sql+=' AND ('+req.or.join(' OR ')+')'
            }else{
                if(req.params.id&&(!user.details.sub||user.details.allmonitors!=='0'||user.details.monitors.indexOf(req.params.id)>-1)){
                    req.sql+=' and mid=?';req.ar.push(req.params.id)
                }
            }
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(!r){
                    r=[]
                }else{
                    r.forEach(function(v){
                        v.details=JSON.parse(v.details)
                        v.href='/'+req.params.auth+'/fileBin/'+req.params.ke+'/'+req.params.id+'/'+v.details.year+'/'+v.details.month+'/'+v.details.day+'/'+v.name;
                    })
                }
                res.end(s.s(r));
            })
        }
        s.auth(req.params,req.fn,res,req);
    });
    //get file from fileBin bin
    app.get(config.webPaths.apiPrefix+':auth/fileBin/:ke/:id/:year/:month/:day/:file', function (req,res){
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        req.fn=function(user){
            req.failed=function(){
                res.end(user.lang['File Not Found'])
            }
            if (!s.group[req.params.ke].fileBin[req.params.id+'/'+req.params.file]){
                s.sqlQuery('SELECT * FROM Files WHERE ke=? AND mid=? AND name=?',[req.params.ke,req.params.id,req.params.file],function(err,r){
                    if(r&&r[0]){
                        r=r[0]
                        r.details=JSON.parse(r.details)
                        req.dir=s.dir.fileBin+req.params.ke+'/'+req.params.id+'/'+r.details.year+'/'+r.details.month+'/'+r.details.day+'/'+req.params.file;
                        if(fs.existsSync(req.dir)){
                            res.on('finish',function(){res.end();});
                            fs.createReadStream(req.dir).pipe(res);
                        }else{
                            req.failed()
                        }
                    }else{
                        req.failed()
                    }
                })
            }else{
                res.end(user.lang['Please Wait for Completion'])
            }
        }
        s.auth(req.params,req.fn,res,req);
    });
    //zip videos and get link from fileBin
    app.get(config.webPaths.apiPrefix+':auth/zipVideos/:ke', function (req,res){
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        var failed = function(resp){
            res.setHeader('Content-Type', 'application/json');
            res.end(s.s(resp))
        }
        if(req.query.videos && req.query.videos !== ''){
            s.auth(req.params,function(user){
                var videosSelected = JSON.parse(req.query.videos)
                var where = []
                var values = []
                videosSelected.forEach(function(video){
                    where.push("(ke=? AND mid=? AND `time`=?)")
                    if(!video.ke)video.ke = req.params.ke
                    values.push(video.ke)
                    values.push(video.mid)
                    var time = s.nameToTime(video.filename)
                    if(req.query.isUTC === 'true'){
                        time = s.utcToLocal(time)
                    }
                    time = new Date(time)
                    values.push(time)
                })
                s.sqlQuery('SELECT * FROM Videos WHERE '+where.join(' OR '),values,function(err,r){
                    var resp = {ok:false}
                    if(r && r[0]){
                        resp.ok = true
                        var zipDownload = null
                        var tempFiles = []
                        var fileId = s.gid()
                        var fileBinDir = s.dir.fileBin+req.params.ke+'/'
                        var tempScript = s.dir.streams+req.params.ke+'/'+fileId+'.sh'
                        var zippedFilename = s.formattedTime()+'-'+fileId+'-Shinobi_Recordings.zip'
                        var zippedFile = fileBinDir+zippedFilename
                        var script = 'cd '+fileBinDir+' && zip -9 -r '+zippedFile
                        res.on('close', () => {
                            if(zipDownload && zipDownload.destroy){
                                zipDownload.destroy()
                            }
                            fs.unlink(zippedFile);
                        })
                        if(!fs.existsSync(fileBinDir)){
                            fs.mkdirSync(fileBinDir);
                        }
                        r.forEach(function(video){
                            timeFormatted = s.formattedTime(video.time)
                            video.filename = timeFormatted+'.'+video.ext
                            var dir = s.video('getDir',video)+video.filename
                            var tempVideoFile = timeFormatted+' - '+video.mid+'.'+video.ext
                            fs.writeFileSync(fileBinDir+tempVideoFile, fs.readFileSync(dir))
                            tempFiles.push(fileBinDir+tempVideoFile)
                            script += ' "'+tempVideoFile+'"'
                        })
                        fs.writeFileSync(tempScript,script,'utf8')
                        var zipCreate = spawn('sh',(tempScript).split(' '),{detached: true})
                        zipCreate.stderr.on('data',function(data){
                            s.log({ke:req.params.ke,mid:'$USER'},{title:'Zip Create Error',msg:data.toString()})
                        })
                        zipCreate.on('exit',function(data){
                            fs.unlinkSync(tempScript)
                            tempFiles.forEach(function(file){
                                fs.unlink(file,function(){})
                            })
                            res.setHeader('Content-Disposition', 'attachment; filename="'+zippedFilename+'"')
                            var zipDownload = fs.createReadStream(zippedFile)
                            zipDownload.pipe(res)
                            zipDownload.on('error', function (error) {
                                s.log({ke:req.params.ke,mid:'$USER'},{title:'Zip Download Error',msg:error.toString()})
                                if(zipDownload && zipDownload.destroy){
                                    zipDownload.destroy()
                                }
                            });
                            zipDownload.on('close', function () {
                                res.end()
                                zipDownload.destroy();
                                fs.unlinkSync(zippedFile);
                            });
                        })
                    }else{
                        failed({ok:false,msg:'No Videos Found'})
                    }
                })
            },res,req);
        }else{
            failed({ok:false,msg:'"videos" query variable is missing from request.'})
        }
    });
    // Get cloud video file (proxy)
    app.get(config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id/:file', function (req,res){
        s.auth(req.params,function(user){
            if(user.permissions.watch_videos==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
                res.end(user.lang['Not Permitted'])
                return
            }
            var time = s.nameToTime(req.params.file)
            if(req.query.isUTC === 'true'){
                time = s.utcToLocal(time)
            }
            time = new Date(time)
            s.sqlQuery('SELECT * FROM `Cloud Videos` WHERE ke=? AND mid=? AND `time`=? LIMIT 1',[req.params.ke,req.params.id,time],function(err,r){
                if(r&&r[0]){
                    r = r[0]
                    req.pipe(request(r.href)).pipe(res)
                }else{
                    res.end(user.lang['File Not Found in Database'])
                }
            })
        },res,req);
    });
    // Get video file
    app.get(config.webPaths.apiPrefix+':auth/videos/:ke/:id/:file', function (req,res){
        s.auth(req.params,function(user){
            if(user.permissions.watch_videos==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.monitors.indexOf(req.params.id)===-1){
                res.end(user.lang['Not Permitted'])
                return
            }
            var time = s.nameToTime(req.params.file)
            if(req.query.isUTC === 'true'){
                time = s.utcToLocal(time)
            }
            time = new Date(time)
            s.sqlQuery('SELECT * FROM Videos WHERE ke=? AND mid=? AND `time`=? LIMIT 1',[req.params.ke,req.params.id,time],function(err,r){
                if(r&&r[0]){
                    req.dir=s.video('getDir',r[0])+req.params.file
                    if (fs.existsSync(req.dir)){
                        req.ext=req.params.file.split('.')[1];
                        var total = fs.statSync(req.dir).size;
                        if (req.headers['range']) {
                            var range = req.headers.range;
                            var parts = range.replace(/bytes=/, "").split("-");
                            var partialstart = parts[0];
                            var partialend = parts[1];

                            var start = parseInt(partialstart, 10);
                            var end = partialend ? parseInt(partialend, 10) : total-1;
                            var chunksize = (end-start)+1;
                            var file = fs.createReadStream(req.dir, {start: start, end: end});
                            req.headerWrite={ 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/'+req.ext }
                            req.writeCode=206
                        } else {
                            req.headerWrite={ 'Content-Length': total, 'Content-Type': 'video/'+req.ext};
                            var file=fs.createReadStream(req.dir)
                            req.writeCode=200
                        }
                        if(req.query.downloadName){
                            req.headerWrite['content-disposition']='attachment; filename="'+req.query.downloadName+'"';
                        }
                        res.writeHead(req.writeCode,req.headerWrite);
                        file.on('close',function(){
                            res.end();
                        })
                        file.pipe(res);
                    }else{
                        res.end(user.lang['File Not Found in Filesystem'])
                    }
                }else{
                    res.end(user.lang['File Not Found in Database'])
                }
            })
        },res,req);
    });
    //motion trigger
    app.get(config.webPaths.apiPrefix+':auth/motion/:ke/:id', function (req,res){
        s.auth(req.params,function(user){
            if(req.query.data){
                try{
                    var d={id:req.params.id,ke:req.params.ke,details:JSON.parse(req.query.data)};
                }catch(err){
                    res.end('Data Broken',err);
                    return;
                }
            }else{
                res.end('No Data');
                return;
            }
            if(!d.ke||!d.id||!s.group[d.ke]){
                res.end(user.lang['No Group with this key exists']);
                return;
            }
            s.triggerEvent(d)
            res.end(user.lang['Trigger Successful'])
        },res,req);
    })
    //hookTester trigger
    app.get(config.webPaths.apiPrefix+':auth/hookTester/:ke/:id', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        s.auth(req.params,function(user){
            s.log(req.params,{type:'Test',msg:'Hook Test'})
            res.end(s.s({ok:true}))
        },res,req);
    })
    //control trigger
    app.get(config.webPaths.apiPrefix+':auth/control/:ke/:id/:direction', function (req,res){
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            s.camera('control',req.params,function(resp){
                res.end(s.s(resp))
            });
        },res,req);
    })
    //modify video file
    app.get([
        config.webPaths.apiPrefix+':auth/videos/:ke/:id/:file/:mode',
        config.webPaths.apiPrefix+':auth/videos/:ke/:id/:file/:mode/:f',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id/:file/:mode',
        config.webPaths.apiPrefix+':auth/cloudVideos/:ke/:id/:file/:mode/:f'
    ], function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            if(user.permissions.watch_videos==="0"||user.details.sub&&user.details.allmonitors!=='1'&&user.details.video_delete.indexOf(req.params.id)===-1){
                res.end(user.lang['Not Permitted'])
                return
            }
            var time = s.nameToTime(req.params.file)
            if(req.query.isUTC === 'true'){
                time = s.utcToLocal(time)
            }
            time = new Date(time)
            var origURL = req.originalUrl.split('/')
            var videoParam = origURL[origURL.indexOf(req.params.auth) + 1]
            var videoSet = 'Videos'
            switch(videoParam){
                case'cloudVideos':
                    videoSet = 'Cloud Videos'
                break;
            }
            req.sql='SELECT * FROM `'+videoSet+'` WHERE ke=? AND mid=? AND `time`=?';
            req.ar=[req.params.ke,req.params.id,time];
            s.sqlQuery(req.sql,req.ar,function(err,r){
                if(r&&r[0]){
                    r=r[0];r.filename=s.formattedTime(r.time)+'.'+r.ext;
                    switch(req.params.mode){
                        case'fix':
                            req.ret.ok=true;
                            s.video('fix',r)
                        break;
                        case'status':
                            r.f = 'video_edit'
                            switch(videoParam){
                                case'cloudVideos':
                                    r.f += '_cloud'
                                break;
                            }
                            r.status = parseInt(req.params.f)
                            if(isNaN(req.params.f)||req.params.f===0){
                                req.ret.msg='Not a valid value.';
                            }else{
                                req.ret.ok=true;
                                s.sqlQuery('UPDATE `'+videoSet+'` SET status=? WHERE ke=? AND mid=? AND `time`=?',[req.params.f,req.params.ke,req.params.id,time])
                                s.tx(r,'GRP_'+r.ke);
                            }
                        break;
                        case'delete':
                            req.ret.ok=true;
                            switch(videoParam){
                                case'cloudVideos':
                                    s.video('deleteFromCloud',r)
                                break;
                                default:
                                    s.video('delete',r)
                                break;
                            }
                        break;
                        default:
                            req.ret.msg=user.lang.modifyVideoText1;
                        break;
                    }
                }else{
                    req.ret.msg=user.lang['No such file'];
                }
                res.end(s.s(req.ret));
            })
        },res,req);
    })
    //ffmpeg pushed stream in here to make a pipe
    app.all(['/streamIn/:ke/:id','/streamIn/:ke/:id/:feed'], function (req, res) {
        var checkOrigin = function(search){return req.headers.host.indexOf(search)>-1}
        if(checkOrigin('127.0.0.1')){
            if(!req.params.feed){req.params.feed='1'}
            if(!s.group[req.params.ke].mon[req.params.id].streamIn[req.params.feed]){
                s.group[req.params.ke].mon[req.params.id].streamIn[req.params.feed] = new events.EventEmitter().setMaxListeners(0)
            }
            //req.params.feed = Feed Number
            res.connection.setTimeout(0);
            req.on('data', function(buffer){
                s.group[req.params.ke].mon[req.params.id].streamIn[req.params.feed].emit('data',buffer)
            });
            req.on('end',function(){
    //            console.log('streamIn closed',req.params);
            });
        }else{
            res.end('Local connection is only allowed.')
        }
    })
    //MP4 Stream
    app.get([config.webPaths.apiPrefix+':auth/mp4/:ke/:id/:channel/s.mp4',config.webPaths.apiPrefix+':auth/mp4/:ke/:id/s.mp4',config.webPaths.apiPrefix+':auth/mp4/:ke/:id/:channel/s.ts',config.webPaths.apiPrefix+':auth/mp4/:ke/:id/s.ts'], function (req, res) {
        s.auth(req.params,function(user){
            if(!s.group[req.params.ke] || !s.group[req.params.ke].mon[req.params.id]){
                res.status(404);
                res.end('404 : Monitor not found');
                return
            }
            s.checkChildProxy(req.params,function(){
                    var Channel = 'MAIN'
                    if(req.params.channel){
                        Channel = parseInt(req.params.channel)+config.pipeAddition
                    }
                    var mp4frag = s.group[req.params.ke].mon[req.params.id].mp4frag[Channel];
                    var errorMessage = 'MP4 Stream is not enabled'
                    if(!mp4frag){
                        res.status(503);
                        res.end('503 : initialization : '+errorMessage);
                    }else{
                        var init = mp4frag.initialization;
                        if (!init) {
                            res.status(503);
                            res.end('404 : Not Found : '+errorMessage);
                        } else {
                            res.locals.mp4frag = mp4frag
                            res.set('Access-Control-Allow-Origin', '*')
                            res.set('Connection', 'close')
                            res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
                            res.set('Expires', '-1')
                            res.set('Pragma', 'no-cache')
                            res.set('Content-Type', 'video/mp4')
                            res.status(200);
                            res.write(init);
                            mp4frag.pipe(res);
                            res.on('close', () => {
                                mp4frag.unpipe(res);
                            });
                        }
                    }
            },res,req);
        },res,req);
    });
    //simulate RTSP over HTTP
    app.get([
        config.webPaths.apiPrefix+':auth/mpegts/:ke/:id/:feed/:file',
        config.webPaths.apiPrefix+':auth/mpegts/:ke/:id/:feed/',
        config.webPaths.apiPrefix+':auth/h264/:ke/:id/:feed/:file',
        config.webPaths.apiPrefix+':auth/h264/:ke/:id/:feed',
        config.webPaths.apiPrefix+':auth/h264/:ke/:id'
    ], function (req, res) {
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            s.checkChildProxy(req.params,function(){
                if(!req.query.feed){req.query.feed='1'}
                var Emitter
                if(!req.params.feed){
                    Emitter = s.group[req.params.ke].mon[req.params.id].streamIn[req.query.feed]
                }else{
                    Emitter = s.group[req.params.ke].mon[req.params.id].emitterChannel[parseInt(req.params.feed)+config.pipeAddition]
                }
                var contentWriter
                var date = new Date();
                res.writeHead(200, {
                    'Date': date.toUTCString(),
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Content-Type': 'video/mp4',
                    'Server': 'Shinobi H.264 Test Stream',
                });
                Emitter.on('data',contentWriter=function(buffer){
                    res.write(buffer)
                })
                res.on('close', function () {
                    Emitter.removeListener('data',contentWriter)
                })
            },res,req);
        },res,req);
    });
    //FFprobe by API
    app.get(config.webPaths.apiPrefix+':auth/probe/:ke',function (req,res){
        req.ret={ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            switch(req.query.action){
    //            case'stop':
    //                exec('kill -9 '+user.ffprobe.pid,{detatched: true})
    //            break;
                default:
                    if(!req.query.url){
                        req.ret.error = 'Missing URL'
                        res.end(s.s(req.ret));
                        return
                    }
                    if(user.ffprobe){
                        req.ret.error = 'Account is already probing'
                        res.end(s.s(req.ret));
                        return
                    }
                    user.ffprobe=1;
                    if(req.query.flags==='default'){
                        req.query.flags = '-v quiet -print_format json -show_format -show_streams'
                    }else{
                        if(!req.query.flags){
                            req.query.flags = ''
                        }
                    }
                    req.probeCommand = s.splitForFFPMEG(req.query.flags+' -i '+req.query.url).join(' ')
                    exec('ffprobe '+req.probeCommand+' | echo ',function(err,stdout,stderr){
                        delete(user.ffprobe)
                        if(err){
                           req.ret.error=(err)
                        }else{
                            req.ret.ok=true
                            req.ret.result = stdout+stderr
                        }
                        req.ret.probe = req.probeCommand
                        res.end(s.s(req.ret));
                    })
                break;
            }
        },res,req);
    })
    //ONVIF requesting with Shinobi API structure
    app.all([config.webPaths.apiPrefix+':auth/onvif/:ke/:id/:action',config.webPaths.apiPrefix+':auth/onvif/:ke/:id/:service/:action'],function (req,res){
        var response = {ok:false};
        res.setHeader('Content-Type', 'application/json');
        res.header("Access-Control-Allow-Origin",req.headers.origin);
        s.auth(req.params,function(user){
            var errorMessage = function(msg,error){
                response.ok = false
                response.msg = msg
                response.error = error
                res.end(s.s(response))
            }
            var actionCallback = function(onvifActionResponse){
                response.ok = true
                if(onvifActionResponse.data){
                    response.responseFromDevice = onvifActionResponse.data
                }else{
                    response.responseFromDevice = onvifActionResponse
                }
                if(onvifActionResponse.soap)response.soap = onvifActionResponse.soap
                res.end(s.s(response))
            }
            var isEmpty = function(obj) {
                for(var key in obj) {
                    if(obj.hasOwnProperty(key))
                        return false;
                }
                return true;
            }
            var doAction = function(Camera){
                var completeAction = function(command){
                    if(command.then){
                        command.then(actionCallback).catch(function(error){
                            errorMessage('Device responded with an error',error)
                        })
                    }else if(command){
                        response.ok = true
                        response.repsonseFromDevice = command
                        res.end(s.s(response))
                    }else{
                        response.error = 'Big Errors, Please report it to Shinobi Development'
                        res.end(s.s(response))
                    }
                }
                var action
                if(req.params.service){
                    if(Camera.services[req.params.service] === undefined){
                        return errorMessage('This is not an available service. Please use one of the following : '+Object.keys(Camera.services).join(', '))
                    }
                    if(Camera.services[req.params.service] === null){
                        return errorMessage('This service is not activated. Maybe you are not connected through ONVIF. You can test by attempting to use the "Control" feature with ONVIF in Shinobi.')
                    }
                    action = Camera.services[req.params.service][req.params.action]
                }else{
                    action = Camera[req.params.action]
                }
                if(!action || typeof action !== 'function'){
                    errorMessage(req.params.action+' is not an available ONVIF function. See https://github.com/futomi/node-onvif for functions.')
                }else{
                    var argNames = s.getFunctionParamNames(action)
                    var options
                    var command
                    if(argNames[0] === 'options' || argNames[0] === 'params'){
                        options = {}
                        if(req.query.options){
                            var jsonRevokedText = 'JSON not formated correctly'
                            try{
                                options = JSON.parse(req.query.options)
                            }catch(err){
                                return errorMessage(jsonRevokedText,err)
                            }
                        }else if(req.body.options){
                            try{
                                options = JSON.parse(req.body.options)
                            }catch(err){
                                return errorMessage(jsonRevokedText,err)
                            }
                        }else if(req.query.params){
                            try{
                                options = JSON.parse(req.query.params)
                            }catch(err){
                                return errorMessage(jsonRevokedText,err)
                            }
                        }else if(req.body.params){
                            try{
                                options = JSON.parse(req.body.params)
                            }catch(err){
                                return errorMessage(jsonRevokedText,err)
                            }
                        }
                    }
                    if(req.params.service){
                        command = Camera.services[req.params.service][req.params.action](options)
                    }else{
                        command = Camera[req.params.action](options)
                    }
                    completeAction(command)
                }
            }
            if(!s.group[req.params.ke].mon[req.params.id].onvifConnection){
                //prepeare onvif connection
                var controlURL
                var monitorConfig = s.group[req.params.ke].mon_conf[req.params.id]
                if(!monitorConfig.details.control_base_url||monitorConfig.details.control_base_url===''){
                    controlURL = s.buildMonitorUrl(monitorConfig, true)
                }else{
                    controlURL = monitorConfig.details.control_base_url
                }
                var controlURLOptions = s.camera('buildOptionsFromUrl',controlURL,monitorConfig)
                //create onvif connection
                s.group[req.params.ke].mon[req.params.id].onvifConnection = new onvif.OnvifDevice({
                    xaddr : 'http://' + controlURLOptions.host + ':' + controlURLOptions.port + '/onvif/device_service',
                    user : controlURLOptions.username,
                    pass : controlURLOptions.password
                })
                var device = s.group[req.params.ke].mon[req.params.id].onvifConnection
                device.init().then((info) => {
                    if(info)doAction(device)
                }).catch(function(error){
                    return errorMessage('Device responded with an error',error)
                })
            }else{
                doAction(s.group[req.params.ke].mon[req.params.id].onvifConnection)
            }
        },res,req);
    })
}
