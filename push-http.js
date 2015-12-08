var app = require('http').createServer(handler),
        io = require('socket.io').listen(app),
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

//creating the server
app.listen(8000);

console.log('server listening on localhost:8000');

// on server started we can load our client.html page
function handler(req, res) {
    fs.readFile(__dirname + '/client.html', function(err, data) {
        if (err) {
            console.log(err);
            res.writeHead(500);
            return res.end('Error loading client.html');
        }
        res.writeHead(200);
        res.end(data);
    });
}


/*
 *
 * HERE IT IS THE COOL PART
 * This function loops on itself since there are sockets connected to the page
 * sending the result of the database query after a constant interval
 *
 */
var pollingLoop = function() {

    console.log('pollingloop activated');

    // Make the database query
    var query = connection.query('SELECT * FROM school_patch'),
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
                // loop on itself only if there are sockets still connected
                if (connectionsArray.length) {
                    pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);

                    updateSockets({schools: schools});
                }
            });

};



// create a new websocket connection to keep the content updated without any AJAX request
io.sockets.on( 'connection', function ( socket ) {
    console.log('Number of connections:' + connectionsArray.length);
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
    
    console.log( 'A new socket is connected!' );
    connectionsArray.push( socket );
    
});

var updateSockets = function ( data ) {
    // store the time of the latest update
    data.time = new Date();
    // send new data to all the sockets connected
    connectionsArray.forEach(function( tmpSocket ){
        tmpSocket.volatile.emit( 'notification' , data );
    });
};

