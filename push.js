var io = require('socket.io').listen(8000),
        fs = require('fs'),
        mysql = require('mysql'),
        connectionsArray = [],
        config = require('./config'),
        connection = mysql.createConnection(config.database),
        POLLING_INTERVAL = 2000,
        pollingTimer;

// If there is an error connecting to the database
connection.connect(function(err) {
    // connected! (unless `err` is set)
    console.log(err);
});


console.log('server listening on localhost:8000');

/*
 *
 * HERE IT IS THE COOL PART
 * This function loops on itself since there are sockets connected to the page
 * sending the result of the database query after a constant interval
 *
 */
var pollingLoop = function() {

    // Make the database query
    var query = connection.query('SELECT p.*  FROM patch_server p join slc_list s on s.slc_id = p.slc_id where s.download_flag = "0"  '),
            schools = []; // this array will contain the result of our db query

    // set up the query listeners
    query
            .on('error', function(err) {
                // Handle error, and 'end' event will be emitted after this as well
                console.log(err);
                updateSockets(err);

            })
            .on('result', function(school) {
                //console.log(school);
                // it fills our array looping on each user row inside the db
                schools.push(school);
            })
            .on('end', function() {
//                console.log("mysql connection ended",connectionsArray.length);
                // loop on itself only if there are sockets still connected
                
                if (connectionsArray.length) {
                    console.log("inside");
                    updateSockets({schools: schools});
                }
                
                //=====NB=====
                // TO BE TESTED - after polling interval ends - query is fired again and 
                // then what happens to the undergoing process
                pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);
                
            });

};



// create a new websocket connection to keep the content updated without any AJAX request
io.sockets.on( 'connection', function ( socket ) {
    
    // start the polling loop only if at least there is one user connected
    if (!connectionsArray.length) {
        pollingLoop();
    } 
    
    socket.on('disconnect', function () {
        var socketIndex = connectionsArray.indexOf( socket );
        console.log('socket = ' + socketIndex + ' disconnected');
        if (socketIndex >= 0) {
            connectionsArray.splice( socketIndex, 1 );
        }
    });
    
    //event triggered when data passed from client 
    socket.on('newsocket-info',function(data){
        socket.slc = data;
        console.log('slc id for socket is - '+socket.slc.slcId);
        connectionsArray.push( socket );
        console.log('Number of connections:' + connectionsArray.length);

        socket.emit('newsocket-info-handshake');
    });
    
    //school patch download flag set
    socket.on('download-flag-slc-set',function(data){
        console.log('download flag slc set');
        setDownloadFlag(data,function(){
            console.log("download flag of school patch set");
        });
    })
    
    
    //download and other all process success
    socket.on('patch-download-complete', function(data){
        console.log('Download completed successfully');
        unsetDownloadFlag(data,function(){
            console.log("download flag of school patch unset");
        })
    });

    socket.on('error-socket', function(err){
        console.log(err.message);
    });
});

var updateSockets = function ( data ) {
    // store the time of the latest update
    data.time = new Date();
    console.log(connectionsArray.length); 
    // send new data to all the sockets connected
    connectionsArray.forEach(function( tmpSocket ){
        


        for(var vals in data.schools){
            //console.log(data.schools[vals].slc_id, tmpSocket.slc.slcId, data.schools[vals].patch_version, tmpSocket)
//            console.log("slcId = "+data.schools[vals].slc_id+" |  socket slc Id ="+tmpSocket.slc.slcId+" | patchversion available ="+data.schools[vals].patch_version_available);
            console.log('checking patch version --',data.schools[vals], tmpSocket.slc.slcId);
            if(data.schools[vals].slc_id == tmpSocket.slc.slcId && tmpSocket.slc.patch_version != data.schools[vals].patch_version && data.schools[vals].patch_version){
                tmpSocket.volatile.emit( 'new-version-available' , data.schools[vals]);
            }
        }
        
        //check if new version is available then emit event
            
        
    });
};

function setDownloadFlag(data, callback){
    // Make the database query
    var query = connection.query('update patch_server set download_flag = "1" where slc_id = "' + data.slc_id + '" ',function(err, rows){
            if(err)
                throw err;
        
        console.log("school patch download flag set");
        callback();
    });

}

function unsetDownloadFlag(data, callback){
    // Make the database query
    var query = connection.query('update patch_server set download_flag = "0" and patch_version = "'+data.patch_version+'" where slc_id = "' + data.slc_id + '" ',function(err, rows){
            if(err)
                throw err;
        
        console.log("school patch download flag set");
        callback();
    });
}