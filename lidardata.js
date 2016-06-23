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
	this.iResolution = 1;
	this.dataFolder = "data";
	this.zipFolder = "zipped_data";
	this.cacheFolder = "json";
	this.roundedFolder = "rounded";
	this.bForceGenerate = false;
	//this.bForceGenerate = true;
	this.messages = [];	
	if(typeof sGridRef !== "undefined"){
		this.setGridRef( sGridRef);
	}
};

LIDAR.prototype.setGridRef = function(sGridRef) {
	this.sGridRef = sGridRef;
	this.oGrid =  OsGridRef.parse(sGridRef);
	this.oLoaded = {"DSM":false, "DTM":false};
}

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

LIDAR.prototype.onfilemissing = function(inputFile, sZipPath, sURL){
	console.log("LIDAR Data not found at '"+inputFile+"' try copying out of the "+sZipPath+" ");
	console.log("Try downloading from  "+sURL+" ");
}

LIDAR.prototype.onzipfilemissing = function(sZipPath, sURL){
	console.log("LIDAR Data not found at '"+sZipPath+"' try downloading from "+sURL+ " ");
}


LIDAR.prototype.zipFileName = function(sType) {
	return "LIDAR-"+sType+"-"+this.getResolutionName().toUpperCase()+"-"+this.oGrid.toString(2).replace(/ /g,"")+".zip";
}

LIDAR.prototype.zipFilePath = function(sType) {
	var sDir =  this.zipFolder+"/"; //config from object?
	return sDir+this.zipFileName(sType);
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
	console.log(sType, iResolution);
	var sDir =  this.dataFolder + "/"; //config from object?
	if( sType == "json") {
		if(this.rounded) {
			sDir =  this.roundedFolder+"/";
		} else {
			sDir =  this.cacheFolder+"/";
		}
	}
	var sPath = sDir+this.defraFileName(sType, iResolution);
	console.log(sPath);
	return sPath;
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
	if(!fs.existsSync(this.dataFolder)){
		fs.mkdirSync(this.dataFolder);
	}
	
	this.onload = callback;
	//this.onerror = errcallback;
	
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
	} else if (this.iResolution < 1){
		console.log("Generating from unzipped file");
		this.processFile("DSM");
		this.processFile("DTM");
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
	var sZipPath = this.zipFilePath(sType);
	console.log("Finding "+sZipPath);
	if(!fs.existsSync(sZipPath)){
		this.onzipfilemissing(this.zipFileName(sType), this.lidarURL());
		return false;
	}
	
	// reading archives
	var zip = new AdmZip(sZipPath);

	var inputFile = this.defraFileName(sType, this.iResolution);
	console.log("Loading", inputFile, "from", sZipPath);

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
	return true;
};

LIDAR.prototype.processFile = function(sType) {
	var fs = require('fs');
	var inputFile = this.defraFilePath(sType, this.iResolution);
	console.log("Finding "+inputFile);
	var sZipPath = this.zipFilePath(sType);

	if(!fs.existsSync(inputFile)){
		this.onfilemissing(inputFile, sZipPath, this.lidarURL());
		return false;
	}

	console.log("Loading", inputFile);
	var oSurfaceData = {LIDAR:[]};

	var readline = require('readline'),
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

LIDAR.prototype.getZone = function(iSize){
	var oLIDAR = this;

	var centrenorth = Math.round((oLIDAR.oGrid.northing % 1000) / oLIDAR.iResolution);
	var centreeast =  Math.round((oLIDAR.oGrid.easting % 1000) / oLIDAR.iResolution);

	var bottom = Math.max(0, centrenorth - Math.round(iSize /2));
	var top =    Math.min(oLIDAR.DSM.LIDAR.length, centrenorth + Math.round(iSize /2));

	var left =  Math.max(0, centreeast - Math.round(iSize /2));
	var right = Math.min(oLIDAR.DSM.LIDAR[0].length, centreeast + Math.round(iSize /2));
	var oZone = {};

	oZone.DTM = oLIDAR.DTM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
  
	oZone.DSM = oLIDAR.DSM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
	
	
	oZone.iMaxHeight = -9999999;
	oZone.iHighestX = 0;
	oZone.iHighestY = 0;
	oZone.iMinHeight = 9999999;

	for (var y = 0; y < oZone.DSM.length ; y++ ) {
		for (var x = 0; x < oZone.DSM[0].length ; x++ ) {
			var Height = oZone.DSM[y][x];
			var Floor =  oZone.DTM[y][x];
			
			if(Height != oLIDAR.DSM.NODATA_value) {
				if(Height > oZone.iMaxHeight) {
					oZone.iMaxHeight = Height;
					oZone.iHighestY = y;
					oZone.iHighestX = x;
				}
				if(Floor < oZone.iMinHeight) {
					oZone.iMinHeight = Floor;
				}
			}
		}
	}

	var iHighestE = parseInt(oLIDAR.DSM.xllcorner) +  oZone.iHighestX;
	var iHighestN = parseInt(oLIDAR.DSM.yllcorner) +  oZone.iHighestY;
	var highest = new OsGridRef(iHighestE, iHighestN);
	console.log("Highest Point", highest.toString(10));				

	if(oLIDAR.rounded){	
		oZone.Heights = oLIDAR.Heights.slice(bottom, top).map(function(line){
			return line.slice(left,right);
		});
	}

	if(oLIDAR.debug) {
		//console.log(oLIDAR);
		fs.writeFileSync("Heights.json", JSON.stringify(oZone.Heights, null, 0).replace(/\[/g,"\n["));
		fs.writeFileSync("DSMzone.json", JSON.stringify(oZone.DSM, null, 0).replace(/\[/g,"\n["));
		fs.writeFileSync("DTMzone.json", JSON.stringify(oZone.DTM, null, 0).replace(/\[/g,"\n["));
	}

	var pad = "   ";
	var Out = oZone.DSM.map(function(line){
		return line.map(function(num){
			var str = num.toString().replace("-9999","---");
			return pad.substring(0, pad.length - str.length) + str
		}).join(" ");
	}).join("\n");
	
	fs.writeFileSync("ZoneSurfaceData.txt", Out);
	console.log("DSM Data Saved to ZoneSurfaceData.txt");
	return oZone;
};
    
module.exports = LIDAR;
