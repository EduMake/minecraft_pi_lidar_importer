// DONE : Get parts from OS Co-ords
// DONE : Check if file exists if so load it otherwise generate it
// DONE : Get LIDAR filenames from Co-ords

// DONE : load LIDAR data files into object
// DONE : round data
// DONE : get min and maxes
// DONE : save into json
// TODO : Make library
// TODO : make build.js use this
// TODO : pass build.js a grid reference and a size
// TODO : how to cope with none centred worlds



var OsGridRef = require('geodesy').OsGridRef;
OsGridRef.prototype.defraFileName = function(sType, iResolution) {
	//sk3789_DTM_1m.asc sk3085_DSM_1m.asc
	var sExt = "asc";
	if( sType == "json") {
		sExt = sType;
	} 
	return this.toString(4).toLowerCase().replace(/ /g,"")+"_"+sType+"_"+iResolution+"m."+sExt;
}

//Might need to add functions to the prototype here for :-
    var fs = require('fs');

var LIDAR = function(sGridRef){

	this.sGridRef = sGridRef;
	this.iResolution = 1;
	this.dataFolder = "data";
	this.cacheFolder = "json";
	this.bForceGenerate = false;
	this.oGrid =  OsGridRef.parse(sGridRef);
	this.oLoaded = {"DSM":false, "DTM":false};
};

LIDAR.prototype.load = function(callback){
	this.onload = callback;
	this.sJsonFile = this.cacheFolder+"/"+this.oGrid.defraFileName("json",  this.iResolution);
	var bExists = fs.existsSync(this.sJsonFile)
	if( bExists && this.bForceGenerate == false) { //add version check
		var data = JSON.parse(fs.readFileSync(this.sJsonFile).toString());
		this.DSM = data.DSM;
		this.DTM = data.DTM;
		this.iMinHeight = data.iMinHeight;
		this.iMaxHeight = data.iMaxHeight;
		this.oLoaded = {"DSM":true, "DTM":true};
		this.onload();
	} else {
		this.processFile("DSM");
		this.processFile("DTM");
	}
}


LIDAR.prototype.checkFinished = function(){
	
    if(this.oLoaded.DTM && this.oLoaded.DSM) {
	var aRowMaxes = this.DSM.LIDAR.map(function(aRow, y){
	    aRow.sort();
	    iRowMax = aRow[aRow.length-1];
	     return iRowMax;
	  }).sort();

	this.iMaxHeight = aRowMaxes[aRowMaxes.length-1];

	var aRowMines = this.DTM.LIDAR.map(function(aRow, y){
    		aRow.sort();
    		iRowMin = aRow[0];
     		return iRowMin;
  	}).sort();

	this.iMinHeight = aRowMines[0];

	fs.writeFileSync(this.sJsonFile, JSON.stringify(this));
	console.log(this.sJsonFile);

	this.onload();
   }
}

LIDAR.prototype.processLIDARine = function(sText){
  var aStrings = sText.trim().split(/\s+/);  
  var aNumbers = aStrings.map(function(sNum){
      //return Math.round(parseFloat(sNum));
      return Math.floor(parseFloat(sNum));
  });
  return aNumbers;
};

LIDAR.prototype.processFile = function(sType) {
    var oSurfaceData = {LIDAR:[]};

    var inputFile = this.dataFolder+"/"+this.oGrid.defraFileName(sType, this.iResolution);

    var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);
     
    var oLIDAR = this;

    rl.on('line', function (line) {
        if(line.length < 1000) {
          var aMeta = line.split(/\s+/);
          oSurfaceData[aMeta[0]] = aMeta[1];
        } else {
          var aCleanLIDAR = oLIDAR.processLIDARine(line);
          oSurfaceData.LIDAR.push(aCleanLIDAR);
        }
    });
    
    rl.on('close', function (line) {
	oLIDAR[sType] = oSurfaceData;
	oLIDAR.oLoaded[sType] = true;
        oLIDAR.checkFinished();//promise??
    });
};


var patch = new LIDAR("SK 35511 86617");
function doStuff(){
 console.log("doStuff", this);

}
patch.load(doStuff);

