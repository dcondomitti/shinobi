module.exports = function(s,config){
    //sql/database connection with knex
    s.databaseOptions = {
      client: config.databaseType,
      connection: config.db,
    }
    if(s.databaseOptions.client.indexOf('sqlite')>-1){
        s.databaseOptions.client = 'sqlite3';
        s.databaseOptions.useNullAsDefault = true;
    }
    if(s.databaseOptions.client === 'sqlite3' && s.databaseOptions.connection.filename === undefined){
        s.databaseOptions.connection.filename = s.mainDirectory+"/shinobi.sqlite"
    }
    s.mergeQueryValues = function(query,values){
        if(!values){values=[]}
        var valuesNotFunction = true;
        if(typeof values === 'function'){
            var values = [];
            valuesNotFunction = false;
        }
        if(values&&valuesNotFunction){
            var splitQuery = query.split('?')
            var newQuery = ''
            splitQuery.forEach(function(v,n){
                newQuery += v
                var value = values[n]
                if(value){
                    if(isNaN(value) || value instanceof Date){
                        newQuery += "'"+value+"'"
                    }else{
                        newQuery += value
                    }
                }
            })
        }else{
            newQuery = query
        }
        return newQuery
    }
    s.stringToSqlTime = function(value){
        newValue = new Date(value.replace('T',' '))
        return newValue
    }
    s.sqlQuery = function(query,values,onMoveOn,hideLog){
        if(!values){values=[]}
        if(typeof values === 'function'){
            var onMoveOn = values;
            var values = [];
        }
        if(!onMoveOn){onMoveOn=function(){}}
        var mergedQuery = s.mergeQueryValues(query,values)
        s.debugLog('s.sqlQuery QUERY',mergedQuery)
        if(!s.databaseEngine || !s.databaseEngine.raw){
            s.connectDatabase()
        }
        return s.databaseEngine
        .raw(query,values)
        .asCallback(function(err,r){
            if(err && !hideLog){
                console.log('s.sqlQuery QUERY ERRORED',query)
                console.log('s.sqlQuery ERROR',err)
            }
            if(onMoveOn && typeof onMoveOn === 'function'){
                switch(s.databaseOptions.client){
                    case'sqlite3':
                        if(!r)r=[]
                    break;
                    default:
                        if(r)r=r[0]
                    break;
                }
                onMoveOn(err,r)
            }
        })
    }
    s.connectDatabase = function(){
        s.databaseEngine = require('knex')(s.databaseOptions)
    }
    s.preQueries = function(){
        //add Cloud Videos table, will remove in future
        s.sqlQuery('CREATE TABLE IF NOT EXISTS `Cloud Videos` (`mid` varchar(50) NOT NULL,`ke` varchar(50) DEFAULT NULL,`href` text NOT NULL,`size` float DEFAULT NULL,`time` timestamp NULL DEFAULT NULL,`end` timestamp NULL DEFAULT NULL,`status` int(1) DEFAULT \'0\' COMMENT \'0:Complete,1:Read,2:Archive\',`details` text) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',[],function(err){
            // if(err)console.log(err)
        },true)
        //add monitorStates to Preset ENUM
        s.sqlQuery('ALTER TABLE `Presets` CHANGE COLUMN `type` `type` VARCHAR(50) NULL DEFAULT NULL AFTER `details`;',[],function(err){
            // if(err)console.log(err)
        },true)
        //create Files table
        s.sqlQuery('CREATE TABLE IF NOT EXISTS `Files` (`ke` varchar(50) NOT NULL,`mid` varchar(50) NOT NULL,`name` tinytext NOT NULL,`size` float NOT NULL DEFAULT \'0\',`details` text NOT NULL,`status` int(1) NOT NULL DEFAULT \'0\') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',[],function(err){
            // if(err)console.log(err)
            //add time column to Files table
            s.sqlQuery('ALTER TABLE `Files`	ADD COLUMN `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `status`;',[],function(err){
                // if(err)console.log(err)
            },true)
        },true)
        delete(s.preQueries)
    }
}
