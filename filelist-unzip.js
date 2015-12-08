var fs = require('fs'), 
mysql = require('mysql'), 
path = require('path'), 
walk = require('walk'),
shell = require('shelljs'),
zipWalker = walk.walk('./', {
	followLinks : false,
	filters : [".svn"]
}),
AdmZip = require('adm-zip');

/*mysql.createConnection({
	host : '10.1.17.94',
	user : 'root',
	password : '',
	database : 'patch',
	port : 3306
});*/



//combine all multipart zip
var zippedArr = [];
zipWalker.on("file", function(root, fileStat, next) {
	
	if(/\.zip$/i.test(fileStat.name)){
		var filename = fileStat.name.split("mb")[0];
		var key = zippedArr[filename]?zippedArr[filename].length:0;
		if(key == 0){
			zippedArr[filename] = [];
			zippedArr[filename][key] = fileStat.name;
		}
		else
			zippedArr[filename][key] = (fileStat.name);


//		var zip = new AdmZip();
		//var list = zip.getEntries();
		//console.log(list);
//		zip.extractAllTo("./patchfiles/", true);
	}
	next();
});

zipWalker.on("end", function() {
	console.log("combining files finished");

	//combine multipart zip files
	var _counter = 0;
	for(var i in zippedArr){
	
		if(zippedArr[i].length == 1){
			//if single file then move it
		shell.exec('mv -f "./' + zippedArr[i][0] + '" ./zipper/'+zippedArr[i][0], {
				silent : true
			});
		}else{
			var zip = new AdmZip();

			shell.exec('cat ./' + i+'mb*.zip > '+i+'mb_final.zip', {
				silent : true
			});
			
			shell.exec('mv -f ./' + i + 'mb_final.zip ./zipper/'+i+'mb_final.zip', {
				silent : true
			});

			/*for(var k in zippedArr[i]){
				zip.addLocalFile('./'+zippedArr[i][k]);
			}
			zip.toBuffer();
			zip.writeZip('./zipper/'+i+'_final.zip');*/

		}
	
		_counter++;
		
		if(_counter == Object.keys(zippedArr).length)
		{
			var unzipWalker = walk.walk('./zipper',{
				followLinks: false,
				filter: [".svn"]
			});
			console.log("inside");
			//unzip all files
			unzipWalker.on("file",function(root,fileStat, next){
				if(/\.zip$/i.test(fileStat.name)){
					console.log(root,fileStat);
					/*shell.exec('unzip "./zipper/'+fileStat.name, {
						silent : true
					});*/
					var zip = new AdmZip('./zipper/'+fileStat.name);
					//var list = zip.getEntries();
					//console.log(list);
					zip.extractAllTo("./patchfiles/", true);
				}
					next();
			});
			
			unzipWalker.on("errors", function (root, nodeStatsArray, next) {
				console.log("An error occurred while unzipping in "+JSON.stringify(nodeStatsArray));
			//    next();
			});

			unzipWalker.on("end", function() {
				console.log("unzipping files finished!! perfect!!");
			});
		}
	}	
	
	
});

zipWalker.on("errors", function (root, nodeStatsArray, next) {
	console.log("An error occurred while combining zip in "+JSON.stringify(nodeStatsArray));
//    next();
});



// adds filename in db
function addFile(filename, filesize){
	var query = connection.query('insert into filelist(filename, filesize, download_status) values ("'+filename+'", "'+filesize+'","0" ) ', function(err, rows) {
		if (err)
			throw err;

		console.log("file added in db after compression");
	});
}
