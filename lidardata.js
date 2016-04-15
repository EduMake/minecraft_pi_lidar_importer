// TODO : How tocope with edges of km blocks
// TODO : how to cope with none centred worlds
// DONE : added a rounded cache option with seperate folder that also stores surface height as seperate object calculated pre rounding

var OsGridRef = require('geodesy').OsGridRef;
var fs = require('fs');
var AdmZip = require('adm-zip');

function compareNumbers(a, b){
	return a-b;
}

var LIDAR = function(sGridRef){
	this.version = 2.2;
	this.rounded = false;
	this.sGridRef = sGridRef;
	this.iResolution = 1;
	this.dataFolder = "data";
	this.zipFolder = "zipped_data";
	this.cacheFolder = "json";
	this.roundedFolder = "rounded";
	this.bForceGenerate = false;
	this.oGrid =  OsGridRef.parse(sGridRef);
	this.oLoaded = {"DSM":false, "DTM":false};
};

LIDAR.prototype.getResolutionName = function() {
	var sResolution = "1m";
	
	if(this.iResolution == 2) {
		sResolution = "2m";
	}
	if(this.iResolution == 0.5) {
		sResolution = "50cm";
	}
	if(this.iResolution == 0.25) {
		sResolution = "25cm";
	}
	return sResolution;
}


LIDAR.prototype.zipFileName = function(sType) {
	//LIDAR-DSM-1M-SK38.zip
	var sDir =  this.zipFolder+"/"; //config from object?
	return sDir+"LIDAR-"+sType+"-"+this.getResolutionName().toUpperCase()+"-"+this.oGrid.toString(2).replace(/ /g,"")+".zip";
}

LIDAR.prototype.lidarURL = function(sType) {
	//LIDAR-DSM-1M-SK38.zip
	var sDir =  this.zipped_data+"/"; //config from object?
	return "http://environment.data.gov.uk/ds/survey/index.jsp#/survey?grid="+this.oGrid.toString(2).replace(/ /g,"");
}

LIDAR.prototype.defraFileName = function(sType, iResolution) {
	//sk3789_DTM_1m.asc sk3085_DSM_1m.asc
	var sExt = "asc";
	
	if( sType == "json") {
		sExt = sType;
	} 
	return this.oGrid.toString(4).toLowerCase().replace(/ /g,"")+"_"+sType+"_"+this.getResolutionName()+"."+sExt;
}

LIDAR.prototype.defraFilePath = function(sType, iResolution) {
	//sk3789_DTM_1m.asc sk3085_DSM_1m.asc
	
	var sDir =  this.dataFolder+"/"; //config from object?
	if( sType == "json") {
		if(this.rounded) {
			sDir =  this.roundedFolder+"/";
		} else {
			sDir =  this.cacheFolder+"/";
		}
	} 
	return sDir+this.defraFileName(sType, iResolution);
}

//Might need to add functions to the prototype here for :-

LIDAR.prototype.load = function(callback){
	this.onload = callback;
	var bLoad = true;
	if(this.bForceGenerate) {
		bLoad = false;
	}
	
	this.sJsonFile = this.defraFilePath("json",  this.iResolution);
	var bExists = fs.existsSync(this.sJsonFile);
	if( bLoad && bExists) { 
		var data = JSON.parse(fs.readFileSync(this.sJsonFile).toString());
		if(!data.hasOwnProperty("version") || data.version < this.version) {
			bLoad = false;
		} 
	}else{
		bLoad = false;
	}
		
		
		
	if(bLoad) {
		console.log("Loading");
		this.DSM = data.DSM;
		this.DTM = data.DTM;
		this.iMinHeight = data.iMinHeight;
		this.iMaxHeight = data.iMaxHeight;
		if(this.rounded) {
			this.Heights = data.Heights;
		}
		this.oLoaded = {"DSM":true, "DTM":true};
		this.onload();
	} else {
		/*console.log("Generating");
		this.processFile("DSM");
		this.processFile("DTM");
		*/
		
		console.log("Generating from Zip");
		this.processZipFile("DSM");
		this.processZipFile("DTM");
		
		
	}
}

LIDAR.prototype.floorAll = function(aData){

	return aData.map(function(aRow, y){
			return aRow.map(function(fHeight){
				return Math.floor(fHeight);
			});
		  });
};

LIDAR.prototype.checkFinished = function(){
	var oLIDAR = this;
    if(this.oLoaded.DTM && this.oLoaded.DSM) {
		if(this.rounded) {
			var DSM_LIDAR = this.floorAll(this.DSM.LIDAR);
			var DTM_LIDAR = this.floorAll(this.DTM.LIDAR);
			var Heights = this.DSM.LIDAR.map(function(aRow, y){
				return aRow.map(function(fHeight, x){
					return Math.round(fHeight - oLIDAR.DTM.LIDAR[y][x]);
				});
			  });
			 this.DSM.LIDAR = DSM_LIDAR;
			 this.DTM.LIDAR = DTM_LIDAR;
			 this.Heights = Heights;
			}
			
		var DSM = this.DSM.LIDAR.map(function(aRow, y){
			return aRow.map(function(fHeight){
				return Math.floor(fHeight);
			});
		  });
		
		
		var aRowMaxes = this.DSM.LIDAR.map(function(aRow, y){
			aRow.sort(compareNumbers);
			iRowMax = aRow[aRow.length-1];
			 return iRowMax;
		  }).sort(compareNumbers);

		this.iMaxHeight = Math.ceil(aRowMaxes[aRowMaxes.length-1]);

		var aRowMins = this.DTM.LIDAR.map(function(aRow, y){
				aRow.sort(compareNumbers);
				iRowMin = aRow[0];
				return iRowMin;
		}).sort(compareNumbers);

		this.iMinHeight = Math.floor(aRowMins[0]);

		//fs.writeFileSync(this.sJsonFile, JSON.stringify(this, null, 4));
		fs.writeFileSync(this.sJsonFile, JSON.stringify(this, null, 0).replace(/\[/g,"\n["));
		console.log("Saved to " + this.sJsonFile);

		this.onload();
	}
}

LIDAR.prototype.processLIDARine = function(sText){
  var aStrings = sText.trim().split(/\s+/);  
  var aNumbers = aStrings.map(function(sNum){
      return parseFloat(sNum);
      //return Math.floor(parseFloat(sNum));
  });
  return aNumbers;
};

LIDAR.prototype.processFile = function(sType) {
    var oSurfaceData = {LIDAR:[]};

    var inputFile = this.defraFilePath(sType, this.iResolution);

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
          oSurfaceData.LIDAR.unshift(aCleanLIDAR);
        }
    });
    
    rl.on('close', function (line) {
	oLIDAR[sType] = oSurfaceData;
	oLIDAR.oLoaded[sType] = true;
        oLIDAR.checkFinished();//promise??
    });
};

LIDAR.prototype.processZipFile = function(sType) {
	
	var sZipName = this.zipFileName(sType);
	
	if(!fs.existsSync(sZipName)){
		console.log("LIDAR Data not found at '"+sZipName+"' try downloading from '"+this.lidarURL()+"'");
		process.exit();
	}
	
    // reading archives
    var zip = new AdmZip(sZipName);
    var inputFile = this.defraFileName(sType, this.iResolution);
    var sContent = zip.readAsText(inputFile); 
    
    console.log(sZipName, inputFile, sContent.length);
    
    /*var zipEntries = zip.getEntries();
    zipEntries.forEach(function(zipEntry) {
        console.log(zipEntry.toString()); // outputs zip entries information
        if (zipEntry.entryName == inputFile ) {
             console.log(zipEntry.data.toString('utf8')); 
        }
    });
    */
    
    var oSurfaceData = {LIDAR:[]};

    var oLIDAR = this;

    sContent.split("\n").map(function (line) {
        if(line.length < 1000) {
          var aMeta = line.split(/\s+/);
          oSurfaceData[aMeta[0]] = aMeta[1];
        } else {
          var aCleanLIDAR = oLIDAR.processLIDARine(line);
          oSurfaceData.LIDAR.unshift(aCleanLIDAR);
        }
    });
    
    this[sType] = oSurfaceData;
	this.oLoaded[sType] = true;
    this.checkFinished();
};
    


/*var patch = new LIDAR("SK 35511 86617");
function doStuff(){
 console.log("doStuff", this);
}
patch.load(doStuff);
*/
module.exports = LIDAR
