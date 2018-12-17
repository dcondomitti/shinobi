var fs = require('fs')
var request = require('request')
var execSync = require('child_process').execSync
module.exports = function(s,config,lang,io){
    var temp = {}
    var superUsers = require(s.location.super)
    var requestURL = 'http://'+config.bindip + ':' + config.port +'/'
    var requestSuperURL = 'http://localhost:' + config.port +'/super/' + superUsers[0].tokens[0] + '/'
    var getBaseURL = function(){
        return 'http://localhost:' + config.port +'/'
    }
    var buildRegularApiRequestURL = function(auth,path,groupKey){
        return getBaseURL() + auth + '/' + path + '/' + groupKey + '/'
    }
    var buildAdminRequestURL = function(auth,path,groupKey){
        return getBaseURL() + 'admin/' + auth + '/' + path + '/' + groupKey + '/'
    }
    var checkResult = function(functionName,expectedResult,testResult){
        if(expectedResult !== testResult){
            console.log(expectedResult,testResult)
            console.log('x ' + functionName + ' : Failed!')
            return false
        }else{
            console.log('✓ ' + functionName + ' : Success')
            return true
        }
    }
    var administratorAccountData = {
        "mail":"test@test1.com",
        "pass":"test1",
        "pass_again":"test1",
        "ke":"GroupKey123456",
        "details":{
            "factorAuth": "0",
            "size": "10000",
            "days": "5",
            "event_days": "10",
            "log_days": "10",
            "max_camera": "",
            "permissions": "all",
            "edit_size": "1",
            "edit_days": "1",
            "edit_event_days": "1",
            "edit_log_days": "1",
            "use_admin": "1",
            "use_aws_s3": "1",
            "use_webdav": "1",
            "use_discordbot": "1",
            "use_ldap": "1"
        }
    }
    var getAdministratorAccountData = function(){
        return Object.assign(administratorAccountData,{})
    }
    var sampleMonitorObject = require('./testMonitor-WatchOnly.json')
    var test = {
        "basic.js" : {
            checkRelativePath : function(next){
                var expectedResult = s.mainDirectory + '/'
                var testResult = s.checkRelativePath('')
                checkResult('Internal Function : checkRelativePath',expectedResult,testResult)
                next()
            },
            parseJSON : function(next){
                var expectedResult = {}
                var testResult = s.parseJSON('{}')
                checkResult('Internal Function : parseJSON',JSON.stringify(expectedResult),JSON.stringify(testResult))
                next()
            },
            stringJSON : function(next){
                var expectedResult = '{}'
                var testResult = s.stringJSON({})
                checkResult('Internal Function : stringJSON',expectedResult,testResult)
                next()
            },
            addUserPassToUrl : function(next){
                var expectedResult = 'http://user:pass@url.com'
                var testResult = s.addUserPassToUrl('http://url.com','user','pass')
                checkResult('Internal Function : addUserPassToUrl',expectedResult,testResult)
                next()
            },
            checkCorrectPathEnding : function(next){
                var expectedResult = '/'
                var testResult = s.checkCorrectPathEnding('')
                checkResult('Internal Function : checkCorrectPathEnding',expectedResult,testResult)
                next()
            },
            md5 : function(next){
                var expectedResult = '5f4dcc3b5aa765d61d8327deb882cf99'
                var testResult = s.md5('password')
                checkResult('Internal Function : md5',expectedResult,testResult)
                next()
            },
            sha256 : function(next){
                var expectedResult = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
                var testResult = require('crypto').createHash('sha256').update('test').digest("hex")
                checkResult('Internal Function : createHash/sha256',expectedResult,testResult)
                next()
            },
            nameToTime : function(next){
                var expectedResult = '2018-10-22 23:00:00'
                var testResult = s.nameToTime('2018-10-22T23-00-00.mp4')
                checkResult('Internal Function : nameToTime',expectedResult,testResult)
                next()
            },
            ipRange : function(next){
                var expectedResult = [
                    '192.168.1.1',
                    '192.168.1.2',
                    '192.168.1.3'
                ]
                var testResult = s.ipRange('192.168.1.1','192.168.1.3')
                checkResult('Internal Function : ipRange',JSON.stringify(expectedResult),JSON.stringify(testResult))
                next()
            },
            portRange : function(next){
                var expectedResult = [
                    8000,
                    8001,
                    8002,
                ]
                var testResult = s.portRange(8000,8002)
                checkResult('Internal Function : portRange',JSON.stringify(expectedResult),JSON.stringify(testResult))
                next()
            },
            getFunctionParamNames : function(next){
                var testing = function(arg1,arg2){}
                var expectedResult = [
                    'arg1',
                    'arg2',
                ]
                var testResult = s.getFunctionParamNames(testing)
                checkResult('Internal Function : getFunctionParamNames',JSON.stringify(expectedResult),JSON.stringify(testResult))
                next()
            }
        },
        "ffmpeg.js" : {
            splitForFFPMEG : function(next){
                var expectedResult = [
                    'flag1',
                    'flag2',
                    'fl ag3',
                ]
                var testResult = s.splitForFFPMEG('flag1  flag2    "fl ag3"')
                checkResult('Internal Function : splitForFFPMEG',JSON.stringify(expectedResult),JSON.stringify(testResult))
                next()
            },
            "ffmpeg" : function(next){
                //command string builder
                var x = {tmp : ''}
                s.checkDetails(sampleMonitorObject)
                sampleMonitorObject.url = s.buildMonitorUrl(sampleMonitorObject)
                var expectedResult = '-loglevel warning -progress pipe:5 -analyzeduration 1000000 -probesize 1000000 -stream_loop -1 -fflags +igndts -re -i "https://cdn.shinobi.video:/videos/bears.mp4" -f mp4 -an -c:v copy -movflags +frag_keyframe+empty_moov+default_base_moof -metadata title="Poseidon Stream" -reset_timestamps 1 pipe:1'
                s.ffmpegFunctions.buildMainInput(sampleMonitorObject,x)
                s.ffmpegFunctions.buildMainStream(sampleMonitorObject,x)
                s.ffmpegFunctions.buildMainRecording(sampleMonitorObject,x)
                s.ffmpegFunctions.buildMainDetector(sampleMonitorObject,x)
                s.ffmpegFunctions.assembleMainPieces(sampleMonitorObject,x)
                var testResult = x.ffmpegCommandString
                checkResult('Internal Function : ffmpeg',expectedResult,testResult)
                //check pipe builder
                var expectedResult = []
                var times = config.pipeAddition
                if(sampleMonitorObject.details.stream_channels){
                    times += sampleMonitorObject.details.stream_channels.length
                }
                for(var i=0; i < times; i++){
                    expectedResult.push('pipe')
                }
                s.ffmpegFunctions.createPipeArray(sampleMonitorObject,x)
                var testResult = x.stdioPipes
                checkResult('Internal Function : ffmpeg.createPipeArray',JSON.stringify(expectedResult),JSON.stringify(testResult))
                next()
            }
        },
        "webServer" : {
            "super/accounts/saveSettings" : function(next){
                console.log(requestSuperURL)
                var userData = {
                   "mail": "admin@shinobi.video1",
                   "pass": "password",
                   "pass_again": "password"
                }
                var builtURL = requestSuperURL + 'accounts/saveSettings?data=' + encodeURIComponent(s.s(userData))
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /accounts/saveSettings',true,response.ok)
                    next()
                })
            },
            "super/accounts/registerAdmin" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = requestSuperURL + 'accounts/registerAdmin?data=' + encodeURIComponent(s.s(userData))
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    administratorAccountData.uid = response.user.uid
                    checkResult('API : /accounts/registerAdmin',true,response.ok)
                    next()
                })
            },
            "super/accounts/deleteAdmin" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = requestSuperURL + 'accounts/deleteAdmin?account=' + encodeURIComponent(s.s({
                    "mail":"test@test1.com",
                    "ke":"GroupKey123456",
                    "uid":administratorAccountData.uid

                }))
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /accounts/deleteAdmin',true,response.ok)
                    next()
                })
            },
            "super/accounts/registerAdmin (Recreate)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = requestSuperURL + 'accounts/registerAdmin?data=' + encodeURIComponent(s.s(userData))
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    administratorAccountData.uid = response.user.uid
                    checkResult('API : /accounts/registerAdmin',true,response.ok)
                    next()
                })
            },
            "super/accounts/list" : function(next){
                var builtURL = requestSuperURL + 'accounts/list'
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok === true){
                        // administratorAccountData = response.users[0]
                    }
                    checkResult('API : /accounts/list',1,response.users.length)
                    next()
                })
            },
            "super/accounts/list/admin" : function(next){
                var builtURL = requestSuperURL + 'accounts/list/admin'
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /accounts/list/admin',1,response.users.length)
                    next()
                })
            },
            "super/accounts/list/sub" : function(next){
                var builtURL = requestSuperURL + 'accounts/list/sub'
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /accounts/list/sub',0,response.users.length)
                    next()
                })
            },
            "super/accounts/editAdmin" : function(next){
                var userData = getAdministratorAccountData()
                delete(userData.uid)
                var builtURL = requestSuperURL + 'accounts/editAdmin?data=' + encodeURIComponent(s.s(userData)) + "&account=" + encodeURIComponent(s.s({
                    "mail":"test@test1.com",
                    "ke":"GroupKey123456"
                }))
                request(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(response.msg)
                    checkResult('API : /accounts/editAdmin',true,response.ok)
                    next()
                })
            },
            "/ (Login via API)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = getBaseURL() + '?json=true'
                request.post(builtURL,{
                    form : {machineID: "testMachineId", mail: "test@test1.com", pass: "test1", function: "dash"}
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(response)
                    administratorAccountData.auth = response.$user.auth_token
                    checkResult('API : / (Login via API)',true,response.ok)
                    next()
                })
            },
            "/api/add" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'api',administratorAccountData.ke) + 'add'
                request.post(builtURL,{
                    form : {
                       "data": {
                          "ip": "0.0.0.0",
                          "details": {
                             "auth_socket": "1",
                             "get_monitors": "1",
                             "control_monitors": "1",
                             "get_logs": "1",
                             "watch_stream": "1",
                             "watch_snapshot": "1",
                             "watch_videos": "1",
                             "delete_videos": "1"
                          }
                       }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    temp.newApiKey = response.api.code
                    checkResult('API : /api/add',true,response.ok)
                    next()
                })
            },
            "Delete API Key" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'api',administratorAccountData.ke) + 'delete'
                request.post(builtURL,{
                    form : {
                       "data": {
                          "code": temp.newApiKey
                       }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /api/delete',true,response.ok)
                    next()
                })
            },
            "/admin/accounts/register" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildAdminRequestURL(administratorAccountData.auth,'accounts',administratorAccountData.ke) + 'register'
                request.post(builtURL,{
                    form : {
                        "data": {
                            "mail": "test@test2.com",
                            "pass": "test1",
                            "password_again": "test1"
                        }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    temp.subAccount = response.user
                    checkResult('API : /admin/accounts/register',true,response.ok)
                    next()
                })
            },
            "/admin/accounts/edit" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildAdminRequestURL(administratorAccountData.auth,'accounts',administratorAccountData.ke) + 'edit'
                request.post(builtURL,{
                    form : {
                        "data": {
                            "uid": temp.subAccount.uid,
                            "mail": temp.subAccount.mail,
                            "details": temp.subAccount.details
                        }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /admin/accounts/edit',true,response.ok)
                    next()
                })
            },
            "/admin/accounts/delete" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildAdminRequestURL(administratorAccountData.auth,'accounts',administratorAccountData.ke) + 'delete'
                request.post(builtURL,{
                    form : {
                        "data": {
                            "uid": temp.subAccount.uid,
                            "mail": temp.subAccount.mail,
                        }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    temp.subAccount = null
                    checkResult('API : /admin/accounts/delete',true,response.ok)
                    next()
                })
            },
            "/configureMonitor (Add)" : function(next){
                temp.monitorId = "10998"
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'configureMonitor',administratorAccountData.ke) + temp.monitorId
                request.post(builtURL,{
                    form : {
                        "data": {"mode":"start","mid":temp.monitorId,"name":"ReoLinkWireless","type":"mp4","protocol":"https","host":"cdn.shinobi.video","port":"443","path":"/videos/faces.mp4","ext":"mp4","fps":"3","width":"2048","height":"1536","details":"{\"notes\":\"\",\"dir\":\"\",\"auto_host_enable\":\"1\",\"auto_host\":\"rtsp://user:pass@192.168.1.40:554/\",\"rtsp_transport\":\"tcp\",\"muser\":\"user\",\"mpass\":\"pass\",\"port_force\":null,\"fatal_max\":\"0\",\"aduration\":\"1000000\",\"probesize\":\"1000000\",\"stream_loop\":\"1\",\"sfps\":\"\",\"accelerator\":\"0\",\"hwaccel\":\"cuvid\",\"hwaccel_vcodec\":\"h264_cuvid\",\"hwaccel_device\":\"\",\"stream_type\":\"mp4\",\"stream_flv_type\":\"http\",\"stream_flv_maxLatency\":\"\",\"stream_mjpeg_clients\":\"0\",\"stream_vcodec\":\"copy\",\"stream_acodec\":\"no\",\"hls_time\":\"2\",\"hls_list_size\":\"2\",\"preset_stream\":\"\",\"signal_check\":\"\",\"signal_check_log\":\"0\",\"stream_quality\":\"1\",\"stream_fps\":\"10\",\"stream_scale_x\":\"3072\",\"stream_scale_y\":\"1728\",\"rotate_stream\":null,\"svf\":\"\",\"tv_channel\":null,\"tv_channel_id\":\"\",\"tv_channel_group_title\":\"\",\"stream_timestamp\":null,\"stream_timestamp_font\":\"\",\"stream_timestamp_font_size\":\"\",\"stream_timestamp_color\":\"\",\"stream_timestamp_box_color\":\"\",\"stream_timestamp_x\":\"\",\"stream_timestamp_y\":\"\",\"stream_watermark\":\"0\",\"stream_watermark_location\":\"\",\"stream_watermark_position\":null,\"snap\":\"0\",\"snap_fps\":\"1\",\"snap_scale_x\":\"1920\",\"snap_scale_y\":\"1072\",\"snap_vf\":\"\",\"vcodec\":\"copy\",\"crf\":\"1\",\"preset_record\":\"\",\"acodec\":\"no\",\"dqf\":\"0\",\"cutoff\":\"\",\"rotate_record\":null,\"vf\":\"\",\"timestamp\":\"0\",\"timestamp_font\":\"\",\"timestamp_font_size\":\"\",\"timestamp_color\":\"\",\"timestamp_box_color\":\"\",\"timestamp_x\":\"\",\"timestamp_y\":\"\",\"watermark\":null,\"watermark_location\":\"\",\"watermark_position\":null,\"cust_input\":\"\",\"cust_snap\":\"\",\"cust_rtmp\":\"\",\"cust_rawh264\":\"\",\"cust_detect\":\"\",\"cust_stream\":\"\",\"cust_stream_server\":\"\",\"cust_record\":\"\",\"custom_output\":\"\",\"detector\":\"0\",\"detector_pam\":\"0\",\"detector_noise_filter\":null,\"detector_webhook\":\"0\",\"detector_webhook_url\":\"\",\"detector_command_enable\":\"0\",\"detector_command\":\"\",\"detector_command_timeout\":\"\",\"detector_lock_timeout\":\"\",\"detector_save\":\"0\",\"detector_frame_save\":\"0\",\"detector_mail\":\"0\",\"detector_mail_timeout\":\"\",\"detector_record_method\":\"sip\",\"detector_trigger\":\"1\",\"detector_trigger_record_fps\":\"\",\"detector_timeout\":\"10\",\"watchdog_reset\":\"0\",\"detector_delete_motionless_videos\":\"0\",\"detector_send_frames\":\"1\",\"detector_region_of_interest\":\"0\",\"detector_fps\":\"\",\"detector_scale_x\":\"640\",\"detector_scale_y\":\"480\",\"detector_use_motion\":\"1\",\"detector_use_detect_object\":\"0\",\"detector_frame\":\"0\",\"detector_sensitivity\":\"\",\"cords\":\"[]\",\"detector_buffer_vcodec\":\"auto\",\"detector_buffer_fps\":\"\",\"detector_buffer_hls_time\":\"\",\"detector_buffer_hls_list_size\":\"\",\"detector_buffer_start_number\":\"\",\"detector_buffer_live_start_index\":\"\",\"detector_lisence_plate\":\"0\",\"detector_lisence_plate_country\":\"us\",\"detector_notrigger\":\"0\",\"detector_notrigger_mail\":\"0\",\"detector_notrigger_timeout\":\"\",\"control\":\"0\",\"control_base_url\":\"\",\"control_url_method\":null,\"control_stop\":null,\"control_url_stop_timeout\":\"\",\"control_url_center\":\"\",\"control_url_left\":\"\",\"control_url_left_stop\":\"\",\"control_url_right\":\"\",\"control_url_right_stop\":\"\",\"control_url_up\":\"\",\"control_url_up_stop\":\"\",\"control_url_down\":\"\",\"control_url_down_stop\":\"\",\"control_url_enable_nv\":\"\",\"control_url_disable_nv\":\"\",\"control_url_zoom_out\":\"\",\"control_url_zoom_out_stop\":\"\",\"control_url_zoom_in\":\"\",\"control_url_zoom_in_stop\":\"\",\"groups\":\"\",\"loglevel\":\"quiet\",\"sqllog\":\"0\",\"detector_cascades\":\"\",\"stream_channels\":\"\",\"input_maps\":\"\",\"input_map_choices\":\"\"}","shto":"[]","shfr":"[]"}
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /configureMonitor (Add)',true,response.ok)
                    next()
                })
            },
            "/configureMonitor (Add Second)" : function(next){
                temp.monitorId2 = "10999"
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'configureMonitor',administratorAccountData.ke) + temp.monitorId2
                request.post(builtURL,{
                    form : {
                        "data": {"mode":"start","mid":temp.monitorId2,"name":"ReoLinkWireless","type":"mp4","protocol":"https","host":"cdn.shinobi.video","port":"443","path":"/videos/faces.mp4","ext":"mp4","fps":"3","width":"2048","height":"1536","details":"{\"notes\":\"\",\"dir\":\"\",\"auto_host_enable\":\"1\",\"auto_host\":\"rtsp://user:pass@192.168.1.40:554/\",\"rtsp_transport\":\"tcp\",\"muser\":\"user\",\"mpass\":\"pass\",\"port_force\":null,\"fatal_max\":\"0\",\"aduration\":\"1000000\",\"probesize\":\"1000000\",\"stream_loop\":\"1\",\"sfps\":\"\",\"accelerator\":\"0\",\"hwaccel\":\"cuvid\",\"hwaccel_vcodec\":\"h264_cuvid\",\"hwaccel_device\":\"\",\"stream_type\":\"hls\",\"stream_flv_type\":\"http\",\"stream_flv_maxLatency\":\"\",\"stream_mjpeg_clients\":\"0\",\"stream_vcodec\":\"copy\",\"stream_acodec\":\"no\",\"hls_time\":\"2\",\"hls_list_size\":\"2\",\"preset_stream\":\"\",\"signal_check\":\"\",\"signal_check_log\":\"0\",\"stream_quality\":\"1\",\"stream_fps\":\"10\",\"stream_scale_x\":\"3072\",\"stream_scale_y\":\"1728\",\"rotate_stream\":null,\"svf\":\"\",\"tv_channel\":null,\"tv_channel_id\":\"\",\"tv_channel_group_title\":\"\",\"stream_timestamp\":null,\"stream_timestamp_font\":\"\",\"stream_timestamp_font_size\":\"\",\"stream_timestamp_color\":\"\",\"stream_timestamp_box_color\":\"\",\"stream_timestamp_x\":\"\",\"stream_timestamp_y\":\"\",\"stream_watermark\":\"0\",\"stream_watermark_location\":\"\",\"stream_watermark_position\":null,\"snap\":\"0\",\"snap_fps\":\"1\",\"snap_scale_x\":\"1920\",\"snap_scale_y\":\"1072\",\"snap_vf\":\"\",\"vcodec\":\"copy\",\"crf\":\"1\",\"preset_record\":\"\",\"acodec\":\"no\",\"dqf\":\"0\",\"cutoff\":\"\",\"rotate_record\":null,\"vf\":\"\",\"timestamp\":\"0\",\"timestamp_font\":\"\",\"timestamp_font_size\":\"\",\"timestamp_color\":\"\",\"timestamp_box_color\":\"\",\"timestamp_x\":\"\",\"timestamp_y\":\"\",\"watermark\":null,\"watermark_location\":\"\",\"watermark_position\":null,\"cust_input\":\"\",\"cust_snap\":\"\",\"cust_rtmp\":\"\",\"cust_rawh264\":\"\",\"cust_detect\":\"\",\"cust_stream\":\"\",\"cust_stream_server\":\"\",\"cust_record\":\"\",\"custom_output\":\"\",\"detector\":\"0\",\"detector_pam\":\"0\",\"detector_noise_filter\":null,\"detector_webhook\":\"0\",\"detector_webhook_url\":\"\",\"detector_command_enable\":\"0\",\"detector_command\":\"\",\"detector_command_timeout\":\"\",\"detector_lock_timeout\":\"\",\"detector_save\":\"0\",\"detector_frame_save\":\"0\",\"detector_mail\":\"0\",\"detector_mail_timeout\":\"\",\"detector_record_method\":\"sip\",\"detector_trigger\":\"1\",\"detector_trigger_record_fps\":\"\",\"detector_timeout\":\"10\",\"watchdog_reset\":\"0\",\"detector_delete_motionless_videos\":\"0\",\"detector_send_frames\":\"1\",\"detector_region_of_interest\":\"0\",\"detector_fps\":\"\",\"detector_scale_x\":\"640\",\"detector_scale_y\":\"480\",\"detector_use_motion\":\"1\",\"detector_use_detect_object\":\"0\",\"detector_frame\":\"0\",\"detector_sensitivity\":\"\",\"cords\":\"[]\",\"detector_buffer_vcodec\":\"auto\",\"detector_buffer_fps\":\"\",\"detector_buffer_hls_time\":\"\",\"detector_buffer_hls_list_size\":\"\",\"detector_buffer_start_number\":\"\",\"detector_buffer_live_start_index\":\"\",\"detector_lisence_plate\":\"0\",\"detector_lisence_plate_country\":\"us\",\"detector_notrigger\":\"0\",\"detector_notrigger_mail\":\"0\",\"detector_notrigger_timeout\":\"\",\"control\":\"0\",\"control_base_url\":\"\",\"control_url_method\":null,\"control_stop\":null,\"control_url_stop_timeout\":\"\",\"control_url_center\":\"\",\"control_url_left\":\"\",\"control_url_left_stop\":\"\",\"control_url_right\":\"\",\"control_url_right_stop\":\"\",\"control_url_up\":\"\",\"control_url_up_stop\":\"\",\"control_url_down\":\"\",\"control_url_down_stop\":\"\",\"control_url_enable_nv\":\"\",\"control_url_disable_nv\":\"\",\"control_url_zoom_out\":\"\",\"control_url_zoom_out_stop\":\"\",\"control_url_zoom_in\":\"\",\"control_url_zoom_in_stop\":\"\",\"groups\":\"\",\"loglevel\":\"quiet\",\"sqllog\":\"0\",\"detector_cascades\":\"\",\"stream_channels\":\"\",\"input_maps\":\"\",\"input_map_choices\":\"\"}","shto":"[]","shfr":"[]"}
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /configureMonitor (Add Second)',true,response.ok)
                    next()
                })
            },
            "/configureMonitor (Edit)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'configureMonitor',administratorAccountData.ke) + temp.monitorId
                request.post(builtURL,{
                    form : {
                        "data": {"mode":"start","mid":temp.monitorId,"name":"ReoLinkWireless","type":"mp4","protocol":"https","host":"cdn.shinobi.video","port":"443","path":"/videos/faces.mp4","ext":"mp4","fps":"3","width":"2048","height":"1536","details":"{\"notes\":\"\",\"dir\":\"\",\"auto_host_enable\":\"1\",\"auto_host\":\"rtsp://user:pass@192.168.1.40:554/\",\"rtsp_transport\":\"tcp\",\"muser\":\"user\",\"mpass\":\"pass\",\"port_force\":null,\"fatal_max\":\"0\",\"aduration\":\"1000000\",\"probesize\":\"1000000\",\"stream_loop\":\"1\",\"sfps\":\"\",\"accelerator\":\"0\",\"hwaccel\":\"cuvid\",\"hwaccel_vcodec\":\"h264_cuvid\",\"hwaccel_device\":\"\",\"stream_type\":\"mp4\",\"stream_flv_type\":\"http\",\"stream_flv_maxLatency\":\"\",\"stream_mjpeg_clients\":\"0\",\"stream_vcodec\":\"copy\",\"stream_acodec\":\"no\",\"hls_time\":\"2\",\"hls_list_size\":\"2\",\"preset_stream\":\"\",\"signal_check\":\"\",\"signal_check_log\":\"0\",\"stream_quality\":\"1\",\"stream_fps\":\"10\",\"stream_scale_x\":\"3072\",\"stream_scale_y\":\"1728\",\"rotate_stream\":null,\"svf\":\"\",\"tv_channel\":null,\"tv_channel_id\":\"\",\"tv_channel_group_title\":\"\",\"stream_timestamp\":null,\"stream_timestamp_font\":\"\",\"stream_timestamp_font_size\":\"\",\"stream_timestamp_color\":\"\",\"stream_timestamp_box_color\":\"\",\"stream_timestamp_x\":\"\",\"stream_timestamp_y\":\"\",\"stream_watermark\":\"0\",\"stream_watermark_location\":\"\",\"stream_watermark_position\":null,\"snap\":\"0\",\"snap_fps\":\"1\",\"snap_scale_x\":\"1920\",\"snap_scale_y\":\"1072\",\"snap_vf\":\"\",\"vcodec\":\"copy\",\"crf\":\"1\",\"preset_record\":\"\",\"acodec\":\"no\",\"dqf\":\"0\",\"cutoff\":\"\",\"rotate_record\":null,\"vf\":\"\",\"timestamp\":\"0\",\"timestamp_font\":\"\",\"timestamp_font_size\":\"\",\"timestamp_color\":\"\",\"timestamp_box_color\":\"\",\"timestamp_x\":\"\",\"timestamp_y\":\"\",\"watermark\":null,\"watermark_location\":\"\",\"watermark_position\":null,\"cust_input\":\"\",\"cust_snap\":\"\",\"cust_rtmp\":\"\",\"cust_rawh264\":\"\",\"cust_detect\":\"\",\"cust_stream\":\"\",\"cust_stream_server\":\"\",\"cust_record\":\"\",\"custom_output\":\"\",\"detector\":\"0\",\"detector_pam\":\"0\",\"detector_noise_filter\":null,\"detector_webhook\":\"0\",\"detector_webhook_url\":\"\",\"detector_command_enable\":\"0\",\"detector_command\":\"\",\"detector_command_timeout\":\"\",\"detector_lock_timeout\":\"\",\"detector_save\":\"0\",\"detector_frame_save\":\"0\",\"detector_mail\":\"0\",\"detector_mail_timeout\":\"\",\"detector_record_method\":\"sip\",\"detector_trigger\":\"1\",\"detector_trigger_record_fps\":\"\",\"detector_timeout\":\"10\",\"watchdog_reset\":\"0\",\"detector_delete_motionless_videos\":\"0\",\"detector_send_frames\":\"1\",\"detector_region_of_interest\":\"0\",\"detector_fps\":\"\",\"detector_scale_x\":\"640\",\"detector_scale_y\":\"480\",\"detector_use_motion\":\"1\",\"detector_use_detect_object\":\"0\",\"detector_frame\":\"0\",\"detector_sensitivity\":\"\",\"cords\":\"[]\",\"detector_buffer_vcodec\":\"auto\",\"detector_buffer_fps\":\"\",\"detector_buffer_hls_time\":\"\",\"detector_buffer_hls_list_size\":\"\",\"detector_buffer_start_number\":\"\",\"detector_buffer_live_start_index\":\"\",\"detector_lisence_plate\":\"0\",\"detector_lisence_plate_country\":\"us\",\"detector_notrigger\":\"0\",\"detector_notrigger_mail\":\"0\",\"detector_notrigger_timeout\":\"\",\"control\":\"0\",\"control_base_url\":\"\",\"control_url_method\":null,\"control_stop\":null,\"control_url_stop_timeout\":\"\",\"control_url_center\":\"\",\"control_url_left\":\"\",\"control_url_left_stop\":\"\",\"control_url_right\":\"\",\"control_url_right_stop\":\"\",\"control_url_up\":\"\",\"control_url_up_stop\":\"\",\"control_url_down\":\"\",\"control_url_down_stop\":\"\",\"control_url_enable_nv\":\"\",\"control_url_disable_nv\":\"\",\"control_url_zoom_out\":\"\",\"control_url_zoom_out_stop\":\"\",\"control_url_zoom_in\":\"\",\"control_url_zoom_in_stop\":\"\",\"groups\":\"\",\"loglevel\":\"quiet\",\"sqllog\":\"0\",\"detector_cascades\":\"\",\"stream_channels\":\"\",\"input_maps\":\"\",\"input_map_choices\":\"\"}","shto":"[]","shfr":"[]"}
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /configureMonitor (Edit)',true,response.ok)
                    next()
                })
            },
            "/monitor/[MONITOR_ID] (Get)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitor',administratorAccountData.ke) + temp.monitorId
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /monitor/[MONITOR_ID] (Get)',temp.monitorId,response.mid)
                    next()
                })
            },
            "/monitor/[MONITOR_ID]/[MODE] (Mode Switch to Disabled)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitor',administratorAccountData.ke) + temp.monitorId + '/stop'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /monitor/[MONITOR_ID] (Mode Switch to Disabled)',true,response.ok)
                    next()
                })
            },
            "/monitor/[MONITOR_ID]/[MODE] (Mode Switch to Watch-Only)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitor',administratorAccountData.ke) + temp.monitorId + '/start'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /monitor/[MONITOR_ID] (Mode Switch to Watch-Only)',true,response.ok)
                    next()
                })
            },
            "/monitor/[MONITOR_ID]/[MODE] (Mode Switch to Record)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitor',administratorAccountData.ke) + temp.monitorId + '/record'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    checkResult('API : /monitor/[MONITOR_ID] (Mode Switch to Record)',true,response.ok)
                    next()
                })
            },
            "/monitor (Get All)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitor',administratorAccountData.ke)
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(!checkResult('API : /monitor (Get All)',2,response.length)){
                        console.log(Object.keys(response))
                    }
                    next()
                })
            },
            "/configureMonitor (Delete)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'configureMonitor',administratorAccountData.ke) + temp.monitorId2 + '/delete'
                request.post(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /configureMonitor (Delete)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Insert (Disable + Detector Off)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'DisableWithDetectorOff/insert'
                request.post(builtURL,{
                    form: {
                        data: {
                            "monitors": [
                                {
                                    "mode":"stop",
                                    "mid":temp.monitorId,
                                    "details": {
                                        "detector": "0"
                                    }
                                }
                            ]
                        }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Insert (Disable + Detector Off)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Insert (Enable + Detector On)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'EnableWithDetectorOn/insert'
                request.post(builtURL,{
                    form: {
                        data: {
                            "monitors": [
                                {
                                    "mode":"start",
                                    "mid":temp.monitorId,
                                    "details": {
                                        "detector": "1"
                                    }
                                }
                            ]
                        }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Insert (Enable + Detector On)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Insert (Continuous Recording)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'RecordOnly/insert'
                request.post(builtURL,{
                    form: {
                        data: {
                            "monitors": [
                                {
                                    "mode":"record",
                                    "mid":temp.monitorId,
                                    "details": {
                                        "detector": "0"
                                    }
                                }
                            ]
                        }
                    }
                },function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Insert (Continuous Recording)',true,response.ok)
                    next()
                })
            },
            "/monitorStates List" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke)
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates List',true,response.ok)
                    next()
                })
            },
            "/monitorStates Run Action (Disable + Detector Off)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'DisableWithDetectorOff'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Run Action (Disable + Detector Off)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Run Action (Enable + Detector On)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'EnableWithDetectorOn'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Run Action (Enable + Detector On)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Run Action (Continuous Recording)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'RecordOnly'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Run Action (Continuous Recording)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Delete (Disable + Detector Off)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'DisableWithDetectorOff/delete'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Delete (Disable + Detector Off)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Delete (Enable + Detector On)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'EnableWithDetectorOn/delete'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Delete (Enable + Detector On)',true,response.ok)
                    next()
                })
            },
            "/monitorStates Delete (Continuous Recording)" : function(next){
                var userData = getAdministratorAccountData()
                var builtURL = buildRegularApiRequestURL(administratorAccountData.auth,'monitorStates',administratorAccountData.ke) + 'RecordOnly/delete'
                request.get(builtURL,function(err, httpResponse, body){
                    var response = s.parseJSON(body)
                    if(response.ok !== true)console.log(builtURL,response)
                    checkResult('API : /monitorStates Delete (Continuous Recording)',true,response.ok)
                    next()
                })
            },
        }
    }
    console.log('----- Function Test Starting')
    var completedGroups = 0
    var testGroupKeys = Object.keys(test)
    var testGroupRunLoop = function(callback){
        var tableName = testGroupKeys[completedGroups]
        var testers = test[testGroupKeys[completedGroups]]
        if(tableName){
            console.log('--- Testing ' + tableName + '...')
            // test functions >
            var completedFunctions = 0
            var testFunctionsKeys = Object.keys(testers)
            var testFunctionRunLoop = function(innerCallback){
                var functioName = testFunctionsKeys[completedFunctions]
                var theFunction = testers[testFunctionsKeys[completedFunctions]]
                if(functioName){
                    theFunction(function(){
                        ++completedFunctions
                        testFunctionRunLoop(innerCallback)
                    })
                }else{
                    innerCallback()
                }
            }
            testFunctionRunLoop(function(){
                console.log('-- Completed ' + tableName + '...')
                ++completedGroups
                testGroupRunLoop(callback)
            })
            // test functions />
        }else{
            callback()
        }
    }
    testGroupRunLoop(function(){
        console.log('---- Function Test Ended')
    })
}
