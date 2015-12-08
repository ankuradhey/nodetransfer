var io = require('socket.io-client'),
        fs = require('fs'),
        mysql = require('mysql'),
        connectionsArray = [],
        JSFtp = require('jsftp'),
        connection = mysql.createConnection({
            host: '10.1.17.94',
            user: 'root',
            password: '',
            database: 'patch',
            port: 3306
        });


var Ftp = new JSFtp({
    host: '10.1.17.94',
    user: 'extramarks',
    password: 'extra123'
});


socket = io.connect('http://10.1.17.94:8000');
// If there is an error connecting to the database
connection.connect(function(err) {
    if (err)
        throw err;
    // connected! (unless `err` is set)
    console.log(err);
});

connection.query('select * from slc_patch where status = "1" limit 1', function(err, rows, fields) {
    if (err)
        throw err;

    if (rows) {
        //after getting slc information - socket connection 

        // create a new websocket connection to keep the content updated without any AJAX request
        socket.on('connect', function(data) {
			console.log("socket connected");
			
            //transfer client slc id and other related information
            var clientdata = {'slcId': 1};
            socket.emit('newsocket-info', clientdata)

            //check whether downloading should start
            if (rows[0].download_flag == '1')
            {
                //downloadPatch();
            }
        });
    }
});

socket.on('disconnect', function(socket) {
    console.log('socket disconnected! bye!');
})


//new version download available
socket.on('new-version-available', function(data) {
    console.log("new version available for download")
    setDownloadFlag(data.slc_id, function() {
        console.log("download flag set!!");
        socket.emit('download-flag-slc-set', data);
        //now process ftp download 
        downloadPatch();
    });

})

function downloadPatch() {
    Ftp.auth('extramarks', 'extra123', function(err, res) {
        //Ftp.get('/patch/server/patchfile.zip', '/opt/lampp/htdocs/patchanis.zip', function(hadErr) {
       	Ftp.get('/nodejs/zippedpatch_5mb_1.zip', '/nodejs/ankit.zip', function(hadErr) {
            if (hadErr)
                throw hadErr;
            else
                console.log(" file copied!! hurray!! ");

        });
    })
}