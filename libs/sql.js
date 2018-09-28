var knex = require('knex');
module.exports = function(s,config){
    //sql/database connection with knex
    var databaseOptions = {
      client: config.databaseType,
      connection: config.db,
    }
    if(databaseOptions.client.indexOf('sqlite')>-1){
        databaseOptions.client = 'sqlite3';
        databaseOptions.useNullAsDefault = true;
    }
    if(databaseOptions.client === 'sqlite3' && databaseOptions.connection.filename === undefined){
        databaseOptions.connection.filename = s.currentDirectory+"/shinobi.sqlite"
    }
    s.databaseEngine = knex(databaseOptions)
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
        return s.databaseEngine
        .raw(query,values)
        .asCallback(function(err,r){
            if(err && !hideLog){
                console.log('s.sqlQuery QUERY ERRORED',query)
                console.log('s.sqlQuery ERROR',err)
            }
            if(onMoveOn && typeof onMoveOn === 'function'){
                switch(databaseOptions.client){
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
}
