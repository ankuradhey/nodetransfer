var fs = require('fs'),
        mysql = require('mysql'),
        path = require('path'),
        walk = require('walk'),
        shell = require('shelljs'),
        unzipWalker = walk.walk('./', {
            followLinks: false,
            filters: [".svn"]
        }),
        AdmZip = require('adm-zip');

/*mysql.createConnection({
 host : '10.1.17.94',
 user : 'root',
 password : '',
 database : 'patch',
 port : 3306
 });*/



unzipWalker.on("file", function (root, fileStat, next) {
    if (/\.zip$/i.test(fileStat.name)) {
        console.log(root, fileStat);
        try {
            var zip = new AdmZip('./' + fileStat.name);
            zipEntries = zip.getEntries();
            console.log('zipped entries are - ', zipEntries)
            zip.extractAllTo("./patchfiles/", true);
        } catch (e) {
            console.log('Caught exception: ', e, fileStat.name);
        }

        //var list = zip.getEntries();
        //console.log(list);

    }
    next();
});


unzipWalker.on("end", function () {
    console.log("Unzip successfully completed!");
});

unzipWalker.on("errors", function (root, nodeStatsArray, next) {
    console.log("An error occurred while combining zip in " + JSON.stringify(nodeStatsArray));
//    next();
});



// adds filename in db
function addFile(filename, filesize) {
    var query = connection.query('insert into filelist(filename, filesize, download_status) values ("' + filename + '", "' + filesize + '","0" ) ', function (err, rows) {
        if (err)
            throw err;

        console.log("file added in db after compression");
    });
}
