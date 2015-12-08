var fs = require('fs'), shell = require('shelljs'), archiver = require('archiver'),
mysql = require('mysql'),
connection = mysql.createConnection({
	host : '10.1.17.94',
	user : 'root',
	password : '',
	database : 'patch',
	port : 3306
}),
fileSizes = [5, 10, 50, 100, 500, 1000, 2000, 4000]
filesCategorized = {}, size = 0,
xmlIndexCounter = 1;

// If there is an error connecting to the database
connection.connect(function(err) {
	if (err)
		throw err;
	// connected! (unless `err` is set)
	console.log(err);
});

setInterval(connection.ping(function(err){
	if(err)
		throw err;
	
	console.log("Pinging mysql connection socket");
}), 1000 * 60 * 10);

//traverse all files to get size of each file or directory
traverseFiles();
//zip file 5, 10, 50, 100, 500

function traverseFiles() {
	//var files = fs.readdirSync('.');
	fs.readdir('./patchfiles/', function(err, items) {
		if (err)
			throw err;
		for (var i = 0; i < items.length; i++) {
			//size in mb
			var size = getFileSize("./patchfiles/"+items[i]);
			
			//conver in mb
			//size = size/1000;
			//console.log("name :"+items[i],size.split('\t')[0]);
			//var size = fs.statSync(items[i])['size'] / 1000000.0;
			//var size = fs.statSync(items[i])['size'] / 1000.0;
			//Size in mb calculated
			for (var k in fileSizes) {

				console.log(size, fileSizes[k], items[i]);
				if (size < fileSizes[k]) {
					if(fs.lstatSync("./patchfiles/"+items[i]).isDirectory()){
						items[i] = items[i]+"/**";
						//continue;
					}
					
					if (filesCategorized[fileSizes[k]]){
						filesCategorized[fileSizes[k]].push('patchfiles/'+items[i]);
					}
					else{
						filesCategorized[fileSizes[k]] = ['patchfiles/'+items[i]];
					}

					break;
				}
			}

		}
		//console.log(filesCategorized);
		
		//traverse through each file category size
		for(var t in filesCategorized){
			console.log("generating archive for "+t+"mb sized files ");
			generateArchiveFile(parseInt(t)*1000000,filesCategorized[t]);	
		}

	});
}

function Writer(maxLength) {

	var currentFile = "", 
		currentFileLength = 0,
		currentVolumeIndex =  1;
	
	//checked whether file being written exceeds the expected maxLength file size
	function isFull(chunkLength) {
		//maxLength -1 means file will never be full
		return (currentFileLength + chunkLength > maxLength);
	}

	function start(path, mode) {
		mode = mode || 'w';
		currentFile = fs.openSync(path, mode);
		current_file_length = 0;
	}

	function close() {
		fs.closeSync(currentFile);
	}

	function write(chunk) {
		fs.writeSync(currentFile, chunk, 0, chunk.length);
		currentFileLength += chunk.length;
	}

	//used for xml file
	function read(filepath){
		return fs.readFileSync(filepath);
	}
	
	
	return {
		isFull : isFull,
		start : start,
		close : close,
		write : write,
		read: read
	}
}

function getArchiveName(name, currentVolumeIndex){
	name = name + '_' + currentVolumeIndex;
	return name+".zip";
}
//generateArchiveFile();

function generateArchiveFile(fileSize, files) {
	var currentVolumeIndex =  1;
	//console.log("file size used is - "+fileSize);
	//var writer = Writer(5000*1000);
	var writer = Writer(fileSize);
	var xmlWriter = Writer("-1"); //fileSize -1 means infinity
	
	writer.start(getArchiveName('zippedpatch_'+parseInt(fileSize/1000000)+'mb',currentVolumeIndex));
	
	console.log('checking current volume index '+ currentVolumeIndex);
	
	var archive = archiver('zip').on('error',function(err){
		 throw err;
		}).on('data', function(chunk){
			
			if(writer.isFull(chunk.length)){
				//console.log(" one of the chunk done!!  ");
				writer.close();
				//if one chunk written then made entry in xml file - after zip files being created
				//xmlWriter.start(getArchiveName('zippedpatch',));
				currentVolumeIndex++;
				//writer.incrementCurrentVolumeIndex();
				//console.log(writer.currentVolumeIndex);
				writer.start(getArchiveName('zippedpatch_'+parseInt(fileSize/1000000)+'mb',currentVolumeIndex));
			}
			writer.write(chunk);
			
		}).on('end',function(){
				writer.close();
				console.log('one zip done!!');
				filename = getArchiveName('zippedpatch_'+parseInt(fileSize/1000000)+'mb',currentVolumeIndex);
				//adds file in db
				addFile(filename, fileSize);
				
			});

	//console.log(['patchfiles/composer.json','patchfiles/composer.lock','patchfiles/composer.phar','patchfiles/init_autoloader.php','patchfiles/config/**']);
	//archive.bulk({src:['patchfiles/config/**']});
	archive.bulk({src:files});
	archive.finalize();	
}

//returns filesize in mb
function getFileSize(fileName){
	var size = shell.exec("du -shm "+fileName,{silent:true}).output;
	return size = size.split('\t')[0];	
}

// adds filename in db
function addFile(filename, filesize){
	var query = connection.query('insert into filelist(filename, filesize, download_status) values ("'+filename+'", "'+filesize+'","0" ) ', function(err, rows) {
		if (err)
			throw err;

		console.log("file added in db after compression");
	});
}
