module.exports = function(s,config,lang){
    //Authenticator functions
    s.api = {}
    s.failedLoginAttempts = {}
    //auth handler
    //params = parameters
    //cb = callback
    //res = response, only needed for express (http server)
    //request = request, only needed for express (http server)
    s.checkChildProxy = function(params,cb,res,req){
        if(s.group[params.ke] && s.group[params.ke].mon[params.id] && s.group[params.ke].mon[params.id].childNode){
            var url = 'http://' + s.group[params.ke].mon[params.id].childNode// + req.originalUrl
            proxy.web(req, res, { target: url })
        }else{
            cb()
        }
    }
    //auth handler
    //params = parameters
    //cb = callback
    //res = response, only needed for express (http server)
    //request = request, only needed for express (http server)
    s.auth = function(params,cb,res,req){
        if(req){
            //express (http server) use of auth function
            params.ip=req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            var failed=function(){
                if(!req.ret){req.ret={ok:false}}
                req.ret.msg=lang['Not Authorized'];
                res.end(s.s(req.ret));
            }
        }else{
            //socket.io use of auth function
            var failed=function(){
                //maybe log
            }
        }
        var clearAfterTime=function(){
            //remove temp key from memory
            clearTimeout(s.api[params.auth].timeout)
            s.api[params.auth].timeout=setTimeout(function(){
                delete(s.api[params.auth])
            },1000*60*5)
        }
        //check IP address of connecting user
        var finish=function(user){
            if(s.api[params.auth].ip.indexOf('0.0.0.0')>-1||s.api[params.auth].ip.indexOf(params.ip)>-1){
                cb(user);
            }else{
                failed();
            }
        }
        //check if auth key is user's temporary session key
        if(s.group[params.ke]&&s.group[params.ke].users&&s.group[params.ke].users[params.auth]){
            s.group[params.ke].users[params.auth].permissions={};
            cb(s.group[params.ke].users[params.auth]);
        }else{
            //check if key is already in memory to save query time
            if(s.api[params.auth]&&s.api[params.auth].details){
                finish(s.api[params.auth]);
                if(s.api[params.auth].timeout){
                   clearAfterTime()
                }
            }else{
                //no key in memory, query db to see if key exists
                //check if using username and password in plain text or md5
                if(params.username&&params.username!==''&&params.password&&params.password!==''){
                    s.sqlQuery('SELECT * FROM Users WHERE mail=? AND (pass=? OR pass=?)',[params.username,params.password,s.createHash(params.password)],function(err,r){
                        if(r&&r[0]){
                            r=r[0];
                            r.ip='0.0.0.0';
                            r.auth = s.gid(20);
                            params.auth = r.auth;
                            r.details=JSON.parse(r.details);
                            r.permissions = {};
                            s.api[r.auth]=r;
                            clearAfterTime();
                            finish(r);
                        }else{
                            failed();
                        }
                    })
                }else{
                    //not using plain login
                    s.sqlQuery('SELECT * FROM API WHERE code=? AND ke=?',[params.auth,params.ke],function(err,r){
                        if(r&&r[0]){
                            r=r[0];
                            s.api[params.auth]={ip:r.ip,uid:r.uid,ke:r.ke,permissions:JSON.parse(r.details),details:{}};
                            s.sqlQuery('SELECT mail,details FROM Users WHERE uid=? AND ke=?',[r.uid,r.ke],function(err,rr){
                                if(rr&&rr[0]){
                                    rr=rr[0];
                                    try{
                                        s.api[params.auth].mail=rr.mail
                                        s.api[params.auth].details=JSON.parse(rr.details)
                                        s.api[params.auth].lang=s.getLanguageFile(s.api[params.auth].details.lang)
                                    }catch(er){}
                                }
                                finish(s.api[params.auth]);
                            })
                        }else{
                            s.sqlQuery('SELECT * FROM Users WHERE auth=? AND ke=?',[params.auth,params.ke],function(err,r){
                                if(r&&r[0]){
                                    r=r[0];
                                    r.ip='0.0.0.0'
                                    s.api[params.auth]=r
                                    s.api[params.auth].details=JSON.parse(r.details)
                                    s.api[params.auth].permissions={}
                                    clearAfterTime()
                                    finish(r)
                                }else{
                                    failed();
                                }
                            })
                        }
                    })
                }
            }
        }
    }
    //super user authentication handler
    s.superAuth=function(x,callback){
        req={};
        req.super=require(s.location.super);
        req.super.forEach(function(v,n){
            if(
                x.mail.toLowerCase() === v.mail.toLowerCase() &&
                (x.pass === v.pass || v.pass === s.createHash(x.pass) || v.pass === s.md5(x.pass))
            ){
                req.found=1;
                if(x.users===true){
                    s.sqlQuery('SELECT * FROM Users WHERE details NOT LIKE ?',['%"sub"%'],function(err,r) {
                        callback({$user:v,users:r,config:config,lang:lang})
                    })
                }else{
                    callback({$user:v,config:config,lang:lang})
                }
            }
        })
        if(req.found!==1){
            return false;
        }else{
            return true;
        }
    }
}
