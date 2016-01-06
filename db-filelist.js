var     fs = require('fs'),
        mysql = require('mysql'),
        shell = require('shelljs'), 
        connection = mysql.createConnection({
            host: '10.1.17.94',
            user: 'root',
            password: '',
            database: 'patch',
            port: 3306
        }),
        path = require('path'), 
        walk = require('walk'),
walker = walk.walk('.', {
	followLinks : false,
	filters : [".svn"]
}),
        schoolPatchId = 1;
connection.connect(function(err) {
    // connected! (unless `err` is set)
    console.log(err);
    
});

fs.readdir('.', function(err, items) {
    var _count = 0;
    for(var i=0;i<items.length;i++){
        if(/\.zip$/.test(items[i])){
            
            getFileSize(items[i],function(size){
                addFile(items[i],size);
                _count++;
            });
            
            
        }
    }
    connection.end();
    console.log('total zip files are - '+_count);
//	var _file = path.resolve(root, );
		//console.log(_file, size)
});



// adds filename in db
function addFile(filename, filesize){
	var query = connection.query('insert into filelist(school_patch_id, filename, filesize, download_status) values ('+schoolPatchId+',"'+filename+'", "'+filesize+'","0" ) ', function(err, rows) {
		if (err)
			throw err;

		console.log("file added "+filename+" in db after compression");
	});
}

//returns filesize in mb
function getFileSize(fileName, callback) {
	var size = shell.exec('du -shm ' + '"' + fileName + '"', {
		silent : true
	}).output;
	size = size.split('\t')[0];
	callback(size);
}