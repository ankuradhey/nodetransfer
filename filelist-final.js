var fs = require('fs'), 
shell = require('shelljs'), 
archiver = require('archiver'), 
mysql = require('mysql'),
schoolPatchId = 1,
fileSizes = [5,10,15, 20, 50, 100, 200, 500, 600, 800, 1000, 2000],
connection = mysql.createConnection({
	host : '10.1.17.94',
	user : 'root',
	password : '',
	database : 'patch',
	port : 3306
})
filesCategorized = [], size = 0, xmlIndexCounter = 1, largeSize = 0, 
filePath = '../../140715CbXIComm_Opt3/', 
path = require('path'), 
results = [], 
pending = 0, 
walk = require('walk'), 
path = require('path'), 
walker = walk.walk(filePath, {
	followLinks : false,
	filters : [".svn"]
});

//path of file to be saved in db
var filePath = '';
var _counter = 0;

walker.on("end", function() {
	//console.log(filesCategorized);
	 for (var t in filesCategorized) {
		 console.log("generating archive for " + t + "mb sized files ");
		 generateArchiveFile(t.replace("_mb","") * 1000000, filesCategorized[t]);
	 }
	//connection.close();
});

walker.on("file", function(root, fileStat, next) {
	var _file = path.resolve(root, fileStat.name);
	
		getFileSize(_file, function(size) {
			console.log(_file, size);
			for (var k in fileSizes) {

				if (size < fileSizes[k]) {
					if (filesCategorized[fileSizes[k] + "_mb"]) {
						filesCategorized[fileSizes[k] + "_mb"].push(_file);
					} else {
						filesCategorized[fileSizes[k] + "_mb"] = [_file]
					}
					break;
				}
			}
			next();
		});
		//console.log(_file, size)
	
});


walker.on("errors", function (root, nodeStatsArray, next) {
	console.log("An error occurred in "+JSON.stringify(nodeStatsArray));
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
		isFull : isFull,
		start : start,
		close : close,
		write : write,
		read : read
	}
}

function getArchiveName(name, currentVolumeIndex) {
	name = name + '_' + currentVolumeIndex;
	return name + ".zip";
}

//generateArchiveFile();

function generateArchiveFile(fileSize, files) {
	var currentVolumeIndex = 1;
	//console.log("file size used is - "+fileSize);
	//var writer = Writer(5000*1000);
	var writer = Writer(fileSize);
	var xmlWriter = Writer("-1");
	//fileSize -1 means infinity

	writer.start(getArchiveName('zippedpatch_' + parseInt(fileSize / 1000000) + 'mb', currentVolumeIndex));

	//console.log('checking current volume index ' + currentVolumeIndex+' max size '+parseInt(fileSize / 1000000) + 'mb');

	var archive = archiver('tar').on('error', function(err) {
		throw err;
	}).on('data', function(chunk) {

		if (writer.isFull(chunk.length)) {
			//console.log(" one of the chunk done!!  ");
                        console.log('one zip '+getArchiveName('zippedpatch_' + parseInt(fileSize / 1000000) + 'mb', currentVolumeIndex)+' done!!');
                        addFile(getArchiveName('zippedpatch_' + parseInt(fileSize / 1000000) + 'mb', currentVolumeIndex), parseInt(fileSize / 1000000));
			writer.close();
			currentVolumeIndex++;
			writer.start(getArchiveName('zippedpatch_' + parseInt(fileSize / 1000000) + 'mb', currentVolumeIndex));
		}
		writer.write(chunk);

	}).on('end', function() {
                addFile(getArchiveName('zippedpatch_' + parseInt(fileSize / 1000000) + 'mb', currentVolumeIndex), parseInt(fileSize / 1000000));

		writer.close();
		console.log('one zip '+getArchiveName('zippedpatch_' + parseInt(fileSize / 1000000) + 'mb', currentVolumeIndex)+' done!!');
	});
	
	//console.log(['patchfiles/composer.json','patchfiles/composer.lock','patchfiles/composer.phar','patchfiles/init_autoloader.php','patchfiles/config/**']);
	//archive.bulk({src:['patchfiles/config/**']});
	archive.bulk({
		src : files
	});

	archive.finalize();
}

//returns filesize in mb
function getFileSize(fileName, callback) {
	var size = shell.exec('du -shm ' + '"' + fileName + '"', {
		silent : true
	}).output;
	size = size.split('\t')[0];
	callback(size);
}

// adds filename in db
function addFile(filename, filesize){
	var query = connection.query('insert into filelist(slc_id, filename, filesize, download_status) values ('+schoolPatchId+',"'+filename+'", "'+filesize+'","0" ) ', function(err, rows) {
		if (err)
			throw err;

		console.log("file added in db after compression");
	});
}
