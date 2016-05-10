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
	this.version = 2.3;
	this.rounded = true;
	this.sGridRef = sGridRef;
	this.iResolution = 1;
	this.dataFolder = "data";
	this.zipFolder = "zipped_data";
	this.cacheFolder = "json";
	this.roundedFolder = "rounded";
	this.bForceGenerate = false;
	//this.bForceGenerate = true;
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
	var sDir =  this.zipFolder+"/"; //config from object?
	return sDir+"LIDAR-"+sType+"-"+this.getResolutionName().toUpperCase()+"-"+this.oGrid.toString(2).replace(/ /g,"")+".zip";
}

LIDAR.prototype.lidarURL = function(sType) {
	var sDir =  this.zipped_data+"/"; //config from object?
	return "http://environment.data.gov.uk/ds/survey/index.jsp#/survey?grid="+this.oGrid.toString(2).replace(/ /g,"");
}

LIDAR.prototype.defraFileName = function(sType, iResolution) {
	var sExt = "asc";
	
	if( sType == "json") {
		sExt = sType;
	} 
	return this.oGrid.toString(4).toLowerCase().replace(/ /g,"")+"_"+sType+"_"+this.getResolutionName()+"."+sExt;
}

LIDAR.prototype.defraFilePath = function(sType, iResolution) {
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

LIDAR.prototype.load = function(callback){
	console.log("Finding LIDAR data for", this.sGridRef);
	if(!fs.existsSync(this.zipFolder)){
		fs.mkdirSync(this.zipFolder);
	}
	if(!fs.existsSync(this.roundedFolder)){
		fs.mkdirSync(this.roundedFolder);
	}
	if(!fs.existsSync(this.cacheFolder)){
		fs.mkdirSync(this.cacheFolder);
	}

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
	} else {
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
			var DTM_LIDAR = this.floorAll(this.DTM.LIDAR);
			var DSM_LIDAR = this.floorAll(this.DSM.LIDAR);
			var Heights = this.DSM.LIDAR.map(function(aRow, y){
				return aRow.map(function(fHeight, x){
					return Math.round(fHeight - oLIDAR.DTM.LIDAR[y][x]);
				});
			});
			this.DTM.LIDAR = DTM_LIDAR;
			this.DSM.LIDAR = DSM_LIDAR;
			this.Heights = Heights;
		}

		this.iMaxHeight = -9999999;
		this.iHighestX = 0;
		this.iHighestY = 0;
		this.iMinHeight = 9999999;

		for (var y = 0; y < this.DSM.nrows ; y++ ) {
			for (var x = 0; x < this.DSM.ncols ; x++ ) {
				var Height = this.DSM.LIDAR[y][x];
				var Floor = this.DTM.LIDAR[y][x];
				
				if(Height != this.DSM.NODATA_value) {
					if(Height > this.iMaxHeight) {
						this.iMaxHeight = Height;
						this.iHighestY = y;
						this.iHighestX = x;
					}
					if(Floor < this.iMinHeight) {
						this.iMinHeight = Floor;
					}
				}
			}
		}
		//console.log("Highest Y",this.iHighestY*this.DSM.cellsize, "X", this.iHighestX*this.DSM.cellsize, "this.iMaxHeight", this.iMaxHeight);
		//console.log( "DTM.xllcorner", this.DTM.xllcorner,  "DTM.yllcorner", this.DTM.yllcorner);
		//console.log( "DSM.xllcorner", this.DSM.xllcorner,  "DSM.yllcorner", this.DSM.yllcorner);

		var iHighestE = parseInt(this.DSM.xllcorner) +  this.iHighestX;
		var iHighestN = parseInt(this.DSM.yllcorner) +  this.iHighestY;
		//console.log(iHighestE, iHighestN);
		var highest = new OsGridRef(iHighestE, iHighestN);
		console.log("Highest Point", highest.toString(10));				

		fs.writeFileSync(this.sJsonFile, JSON.stringify(this, null, 0).replace(/\[/g,"\n["));
		console.log("Saved to " + this.sJsonFile);
		this.onload();
	}
}

LIDAR.prototype.processLIDARine = function(sText){
 	var aStrings = sText.trim().split(/\s+/);  
 	var aNumbers = aStrings.map(function(sNum){
      		return parseFloat(sNum);
  	});
	return aNumbers;
};

LIDAR.prototype.processZipFile = function(sType) {
	
	var sZipName = this.zipFileName(sType);
	
	if(!fs.existsSync(sZipName)){
		console.log("LIDAR Data not found at '"+sZipName+"' try downloading from  "+this.lidarURL()+" ");
		process.exit();
	}
	
    // reading archives
    var zip = new AdmZip(sZipName);
    var inputFile = this.defraFileName(sType, this.iResolution);
    console.log("Loading", inputFile, "from", sZipName);
    var sContent = zip.readAsText(inputFile); 
    console.log("Loaded", sContent.length, "characters.  Processing .....");
        
    var oSurfaceData = {LIDAR:[]};

    var oLIDAR = this;

    sContent.split("\n").map(function (line) {
        if(line.length < 1000) {
          var aMeta = line.split(/\s+/);
          oSurfaceData[aMeta[0]] = aMeta[1];
        } else {
          var aCleanLIDAR = oLIDAR.processLIDARine(line);
          oSurfaceData.LIDAR.unshift(aCleanLIDAR);
          //oSurfaceData.LIDAR.push(aCleanLIDAR);
        }
    });
    
    this[sType] = oSurfaceData;
    this.oLoaded[sType] = true;
    console.log("Done Loading", inputFile);
    this.checkFinished();
};
    
module.exports = LIDAR
