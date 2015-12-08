var fs = require('fs'), 
shell = require('shelljs'), 
archiver = require('archiver'),
mysql = require('mysql'),
fileSizes = [5, 10, 20, 30, 40, 50, 80, 100, 200, 300, 400, 500, 1000, 2000, 4000],
filesCategorized = {}, size = 0,
xmlIndexCounter = 1,
largeSize = 0,
filePath = '../api/';

//traverse all files to get size of each file or directory
traverseFiles();
//zip file 5, 10, 50, 100, 500

function traverseFiles() {
	//var files = fs.readdirSync('.');
	fs.readdir(filePath, function(err, items) {
		if (err)
			throw err;
		for (var i = 0; i < items.length; i++) {
			//size in mb
			var size = getFileSize(filePath+items[i]);
			
			//Size in mb calculated
			for (var k in fileSizes) {

				//console.log(size, fileSizes[k], items[i]);
				if (size < fileSizes[k]/6) {
					if(fs.lstatSync(filePath+items[i]).isDirectory()){
						items[i] = items[i]+"/**";
						//continue;
					}
					
					if (filesCategorized[fileSizes[k]]){
						filesCategorized[fileSizes[k]].push(filePath+items[i]);
					}
					else{
						filesCategorized[fileSizes[k]] = [filePath+items[i]];
					}

					break;
				}
			}
			
			//large size files are managed here
			
			if(size > fileSizes[fileSizes.length-1]){
				console.log("reached at the end of array ",filePath+items[i],size,fileSizes[fileSizes.length-1])
					if(largeSize < size)
					largeSize = size*6;
					
					if(fs.lstatSync(filePath+items[i]).isDirectory()){
						items[i] = items[i]+"/**";
						//continue;
					}
					
					if (filesCategorized[largeSize]){
						filesCategorized[largeSize].push(filePath+items[i]);
					}
					else{
						filesCategorized[largeSize] = [filePath+items[i]];
					}
			}

		}
		console.log(filesCategorized);
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
