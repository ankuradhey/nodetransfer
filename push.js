var io = require('socket.io').listen(8000),
        fs = require('fs'),
        mysql = require('mysql'),
        connectionsArray = [],
        connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'patch',
            port: 3306
        }),
        POLLING_INTERVAL = 3000,
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
    var query = connection.query('SELECT * FROM school_patch where download_flag = "0" '),
            schools = []; // this array will contain the result of our db query

    // set up the query listeners
    query
            .on('error', function(err) {
                // Handle error, and 'end' event will be emitted after this as well
                console.log(err);
                updateSockets(err);

            })
            .on('result', function(school) {
                // it fills our array looping on each user row inside the db
                schools.push(school);
            })
            .on('end', function() {
//                console.log("mysql connection ended",connectionsArray.length);
                // loop on itself only if there are sockets still connected
                
                if (connectionsArray.length) {
                    updateSockets({schools: schools});
                }
                
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
    })
});

var updateSockets = function ( data ) {
    // store the time of the latest update
    data.time = new Date();
    // send new data to all the sockets connected
    connectionsArray.forEach(function( tmpSocket ){
        
        for(var vals in data.schools){
//            console.log("slcId = "+data.schools[vals].slc_id+" |  socket slc Id ="+tmpSocket.slc.slcId+" | patchversion available ="+data.schools[vals].patch_version_available);
            if(data.schools[vals].slc_id == tmpSocket.slc.slcId && data.schools[vals].patch_version_available != data.schools[vals].patch_version && data.schools[vals].patch_version_available){
                tmpSocket.volatile.emit( 'new-version-available' , data.schools[vals]);
            }
        }
        
        //check if new version is available then emit event
            
        
    });
};

function setDownloadFlag(data, callback){
    // Make the database query
    var query = connection.query('update school_patch set download_flag = "1" where slc_id = "' + data.slc_id + '" ',function(err, rows){
            if(err)
                throw err;
        
        console.log("school patch download flag set");
        callback();
    });

}

function unsetDownloadFlag(data, callback){
    // Make the database query
    var query = connection.query('update school_patch set download_flag = "0" and patch_version = "'+data.patch_version+'" where slc_id = "' + data.slc_id + '" ',function(err, rows){
            if(err)
                throw err;
        
        console.log("school patch download flag set");
        callback();
    });
}