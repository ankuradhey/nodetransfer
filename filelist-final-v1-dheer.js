var fs = require('fs'),
        shell = require('shelljs'),
        archiver = require('archiver'),
        mysql = require('mysql'),
        config = require('./config'),
        fileSizes = [5 * 1024, 10 * 1024, 15 * 1024, 20 * 1024, 50 * 1024, 100 * 1024, 200 * 1024, 500 * 1024, 600 * 1024, 800 * 1024, 1000 * 1024],
        filesCategorized = [], size = 0, xmlIndexCounter = 1, largeSize = 0,
        path = require('path'),
        results = [],
        pending = 0,
        walk = require('walk'),
        walker = walk.walk(config.filePath, {
            followLinks: false,
            filters: [".svn"]
        }),
        connection = mysql.createConnection(config.database);
console.log(config.filePath);
//path of file to be saved in db
var filePath = '';
var _counter = 0;




walker.on("end", function () {
    var finalArr = [];
    var $firstCounter = 0;

    for (var t in filesCategorized) {

        finalArr[t] = [];
        filesCategorized[t] = filesCategorized[t].sort(function (a, b) {
            return a[0] - b[0];
        });


        var maxVal = 0, counter = 0;
        for (var i in filesCategorized[t]) {
            maxVal = parseInt(maxVal) + parseInt(filesCategorized[t][i][0]);

            if (t.replace('_mb', '') > maxVal) {

                if (finalArr[t][counter])
                    finalArr[t][counter].push(filesCategorized[t][i][1]);
                else
                    finalArr[t][counter] = [filesCategorized[t][i][1]];

            } else {

                maxVal = parseInt(filesCategorized[t][i][0]);
                counter++;
                finalArr[t][counter] = [filesCategorized[t][i][1]];
            }
        }

        if ($firstCounter + 1 == Object.keys(filesCategorized).length) {
            console.log(t);
            generateArchive(finalArr, finalArr[Object.keys(finalArr)[0]]);
        }
        $firstCounter++;
    }



});

var archiveCounting = 0;
function generateArchive(finalArr, temp) {
    if (Object.keys(finalArr).length) {
        console.log("inside ---");
        var fin = temp;
        console.log(fin);
        if (fin.length) {
            finIn = fin.shift();
            generateArchiveFile(Object.keys(finalArr)[0].replace("_mb", "") * 1024, finIn, fin.length, function (filename, filesize) {
                console.log('achieved')
                generateArchive(finalArr, fin);
            });


        } else {
            delete finalArr[Object.keys(finalArr)[0]];
            if (finalArr)
                fin = finalArr[Object.keys(finalArr)[0]];
            generateArchive(finalArr, fin);
        }


    } else {
        console.log("completed transacting loop");
    }
}

walker.on("file", function (root, fileStat, next) {
    var _file = path.resolve(root, fileStat.name);
    
    getFileSize(_file, function (size) {
        console.log(_file, size);
        var bigSizeFlag = true;
        for (var k in fileSizes) {

            if (size < fileSizes[k]) {
                bigSizeFlag = false;
                if (filesCategorized[fileSizes[k] + "_mb"]) {
                    filesCategorized[fileSizes[k] + "_mb"].push([size, _file]);
                } else {
                    filesCategorized[fileSizes[k] + "_mb"] = [[size, _file]]
                }
            }
        }
        if (bigSizeFlag) {
            if (filesCategorized['3000_mb']) {
                filesCategorized['3000_mb'].push([size, _file]);
            } else {
                filesCategorized['3000_mb'] = [[size, _file]]
            }
        }
        next();
    });
    //console.log(_file, size)

});


walker.on("errors", function (root, nodeStatsArray, next) {
    console.log("An error occurred in " + JSON.stringify(nodeStatsArray));
//    next();
});


function Writer(maxLength) {

    var currentFile = "", currentFileLength = 0, currentVolumeIndex = 1;

    //checked whether file being written exceeds the expected maxLength file size
    function isFull(chunkLength) {
        //console.log("chunklength is  - ",chunkLength, "max size - "+maxLength," total Size - "+currentFileLength + chunkLength)
        //maxLength -1 means file will never be full
        return (currentFileLength + chunkLength > maxLength);
    }

    function start(path, mode) {
        mode = mode || 'w';
        currentFile = fs.openSync(path, mode);
        current_file_length = 0;
        currentFileLength = 0;
    }

    function close() {
        fs.closeSync(currentFile);
    }

    function write(chunk) {
        fs.writeSync(currentFile, chunk, 0, chunk.length);
        currentFileLength += chunk.length;
    }

    //used for xml file
    function read(filepath) {
        return fs.readFileSync(filepath);
    }

    return {
        isFull: isFull,
        start: start,
        close: close,
        write: write,
        read: read
    }
}

function getArchiveName(name, currentVolumeIndex) {
    name = name + '_' + currentVolumeIndex;
    return name + ".zip";
}

//generateArchiveFile();


function generateArchiveFile(fileSize, files, currentVolumeIndex, callback) {
    var writer = Writer(fileSize);
    var xmlWriter = Writer("-1");
    //fileSize -1 means infinity

    //pass path name - if required for files to be stored at different place
    writer.start(getArchiveName('zippedpatch_' + parseInt(fileSize / 1048576) + 'mb', currentVolumeIndex));

    //console.log('checking current volume index ' + currentVolumeIndex+' max size '+parseInt(fileSize / 1000000) + 'mb');

    var archive = archiver('zip').on('error', function (err) {
        throw err;
    }).on('data', function (chunk) {
        writer.write(chunk);
    }).on('end', function () {
        writer.close();
        console.log('one zip ' + getArchiveName('zippedpatch_' + parseInt(fileSize / 1048576) + 'mb', currentVolumeIndex) + ' done!!');
        callback(getArchiveName('zippedpatch_' + parseInt(fileSize / 1048576) + 'mb', currentVolumeIndex), parseInt(fileSize / 1048576));
        addFile(getArchiveName('zippedpatch_' + parseInt(fileSize / 1048576) + 'mb',  currentVolumeIndex), 
                                parseInt(fileSize / 1048576),function(err, data){
                                    if(err){
                                        throw err;
                                    }else{
                                        connection.end(function (err) {
                                            // The connection is terminated now
                                        });
                                        callback(getArchiveName('zippedpatch_' + parseInt(fileSize / 1048576) + 'mb', currentVolumeIndex), parseInt(fileSize / 1048576));
                                    }
                                });
        
    });

    //archive.bulk({src:['patchfiles/config/**']});
    archive.bulk({
        src: files
    });

    archive.finalize();
}

//returns filesize in mb
function getFileSize(fileName, callback) {
    var size = shell.exec('du -shk ' + '"' + fileName + '"', {
        silent: true
    }).output;
    size = size.split('\t')[0];
    callback(size);
}

function handleDisconnect() {
    connection = mysql.createConnection(config.database);

    connection.connect(function (err) {
        if (err) {
            console.log("mysql socket unexpectedly closed ",err);
            setTimeout(handleDisconnect, 2000);
        }

    });

    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
    return connection;
}

// adds filename in db
function addFile(filename, filesize, callback){
    var connection = handleDisconnect();
    var query = connection.query('insert into filelist(slc_id, filename, filesize, download_status) values ('+config.slcId+',"'+filename+'", "'+filesize+'","0" ) ', function(err, rows) {
        if (err)
            throw err;

        console.log("file added "+filename+" in db after compression");
        callback(err, connection);
        
    });
}
