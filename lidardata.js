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
	this.iSize = 256;
	this.dataFolder = "data";
	this.zipFolder = "zipped_data";
	this.cacheFolder = "json";
	this.roundedFolder = "rounded";
	this.bForceGenerate = false;
	this.aOtherKMs = [];
	this.aCompass = [];
	//this.bForceGenerate = true;
	this.messages = [];	
	this.oLoaded = {"DSM":false, "DTM":false, "All":false};
	
	if(typeof sGridRef !== "undefined"){
		this.setGridRef( sGridRef);
	}
	
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
};

LIDAR.prototype.setResolution = function(iResolution) {
	this.iResolution = iResolution;
}

LIDAR.prototype.setGridRef = function(sGridRef) {
	this.sGridRef = sGridRef;
	this.oGrid =  OsGridRef.parse(sGridRef);
	this.oLoaded = {"DSM":false, "DTM":false, "All":false};
};

LIDAR.prototype.getCompass = function() {
	var oLIDAR = this;
	var iSizeInMetres  = Math.ceil(oLIDAR.iResolution * this.iSize /2);
	
	oLIDAR.aCompass = [	
		{
			name:"northwest", 
			n: oLIDAR.oGrid.northing + iSizeInMetres,
			e: oLIDAR.oGrid.easting - iSizeInMetres,
			beforeN:false,
			beforeE:true
		},
		{
			name:"northeast", 
			n: oLIDAR.oGrid.northing + iSizeInMetres,
			e: oLIDAR.oGrid.easting + iSizeInMetres,
			beforeN:false,
			beforeE:false
		},
		{
			name:"southeast", 
			n: oLIDAR.oGrid.northing - iSizeInMetres,
			e: oLIDAR.oGrid.easting + iSizeInMetres,
			beforeN:true,
			beforeE:false
		},
		{
			name:"southwest", 
			n: oLIDAR.oGrid.northing - iSizeInMetres,
			e: oLIDAR.oGrid.easting - iSizeInMetres,
			beforeN:true,
			beforeE:true
		}
	];
	return oLIDAR.aCompass;
};

LIDAR.prototype.getOtherKMs = function(){
	var oLIDAR = this;
	
	if ( oLIDAR.aCompass.length === 0) {
		this.getCompass();
	}
	
	var aOtherKMs = oLIDAR.aCompass.filter(function(dir){
		if ( Math.floor(oLIDAR.oGrid.northing /1000) !== Math.floor(dir.n /1000)) {
			return true;
		}
		if ( Math.floor(oLIDAR.oGrid.easting /1000) !== Math.floor(dir.e /1000)) {
			return true;
		}  
		return false;
	});
	
	var oKMs = {};
	aOtherKMs = aOtherKMs.filter(function(dir){
		var oGrid = new OsGridRef(dir.e, dir.n);
		dir.sGrid = oGrid.toString(4).toLowerCase();
		if(typeof oKMs[dir.sGrid] === "undefined") {
			oKMs[dir.sGrid] = dir.sGrid;
			return true;
		}
		return false;
	});
	
	this.aOtherKMs = aOtherKMs.map(function(dir){
		var oGrid = new OsGridRef(dir.e, dir.n);
		var oL = new LIDAR (oGrid.toString(10));
		oL.setResolution(oLIDAR.iResolution);
		dir.oL = oL;
		return dir;
	});
	//console.log(this.aOtherKMs);
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
};

LIDAR.prototype.onfilemissing = function(inputFile, sZipPath, sURL){
	console.log("LIDAR Data not found at '"+inputFile+"' try copying out of the "+sZipPath+" ");
	console.log("Try downloading from  "+sURL+" ");
};

LIDAR.prototype.onzipfilemissing = function(sZipPath, sURL){
	console.log("LIDAR Data not found at '"+sZipPath+"' try downloading from "+sURL+ " ");
};

LIDAR.prototype.zipFileName = function(sType) {
	return "LIDAR-"+sType+"-"+this.getResolutionName().toUpperCase()+"-"+this.oGrid.toString(2).replace(/ /g,"")+".zip";
};

LIDAR.prototype.zipFilePath = function(sType) {
	var sDir =  this.zipFolder+"/"; //config from object?
	return sDir+this.zipFileName(sType);
};

LIDAR.prototype.lidarURL = function(sType) {
	var sDir =  this.zipped_data+"/"; //config from object?
	return "http://environment.data.gov.uk/ds/survey/index.jsp#/survey?grid="+this.oGrid.toString(2).replace(/ /g,"");
};

LIDAR.prototype.defraFileName = function(sType, iResolution) {
	var sExt = "asc";
	if( sType == "json") {
		sExt = sType;
	} 
	return this.oGrid.toString(4).toLowerCase().replace(/ /g,"")+"_"+sType+"_"+this.getResolutionName()+"."+sExt;
};

LIDAR.prototype.defraFilePath = function(sType, iResolution) {
	//console.log(sType, iResolution);
	var sDir =  this.dataFolder + "/"; //config from object?
	if( sType == "json") {
		if(this.rounded) {
			sDir =  this.roundedFolder+"/";
		} else {
			sDir =  this.cacheFolder+"/";
		}
	}
	var sPath = sDir+this.defraFileName(sType, iResolution);
	//console.log(sPath);
	return sPath;
};

LIDAR.prototype.loadAll = function(callback){
	//console.log("loadAll");
	var oLIDAR = this;
	this.onloadAll = callback;
	this.load(oLIDAR.checkAllFinished.bind(oLIDAR));
	this.getOtherKMs();
	this.aOtherKMs.forEach(function(dir){
		dir.oL.load(oLIDAR.checkAllFinished.bind(oLIDAR));
	});
};

LIDAR.prototype.checkAllFinished = function(callback){
	var loaded = this.aOtherKMs.filter(function(dir){
		return dir.oL.oLoaded.All;
	});
	
	//console.log("checkAllFinished","loaded.length",loaded.length, "this.aOtherKMs.length", this.aOtherKMs.length, "this.oLoaded.All", this.oLoaded.All);
	if(loaded.length === this.aOtherKMs.length && this.oLoaded.All){
		//console.log("All Loaded");
		this.onloadAll();
	}
};

LIDAR.prototype.load = function(callback){
	console.log("Finding LIDAR data for", this.sGridRef);
	this.onload = callback;
	
	var bLoad = true;
	if(this.bForceGenerate) {
		bLoad = false;
	}
	
	this.sJsonFile = this.defraFilePath("json",  this.iResolution);
	var bExists = fs.existsSync(this.sJsonFile);
	var data = {};
	if( bLoad && bExists) { 
		data = JSON.parse(fs.readFileSync(this.sJsonFile).toString());
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
		this.oLoaded.DSM = true;
		this.oLoaded.DTM = true;
		this.oLoaded.All = true;
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
};

LIDAR.prototype.floorAll = function(aData){
	return aData.map(function(aRow, y){
		return aRow.map(function(fHeight){
			return Math.floor(fHeight);
		});
	});
};

LIDAR.prototype.checkFinished = function(){
	console.log("checkFinished", this.oLoaded);
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
		
		//fs.writeFileSync(this.sJsonFile, JSON.stringify(this, null, 0).replace(/\[/g,"\n["));
		//console.log("Saved to " + this.sJsonFile);
		this.oLoaded.All = true;
		this.onload();
	}
};

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
	//console.log("getZone");
	if(typeof iSize !== "undefined" && this.iSize !== iSize){
		this.iSize = iSize;
		this.getCompass();
	}
	if(this.aCompass.length === 0){
		this.getCompass();
	}
	
	var aPoints = this.getCompass();
	var oZone = this.getZoneFromPoints(aPoints, this.iResolution );
	
	console.log("our Zone", "rows",oZone.DSM.length,"cols",  oZone.DTM[0].length);
	
	var aOtherZones = this.aOtherKMs.map(function(dir){
		dir.oZone = dir.oL.getZoneFromPoints(aPoints, oLIDAR.iResolution);
		//console.log("other Zone", dir.name, "rows", otherZone.DSM.length, "cols", otherZone.DTM[0].length);
		return dir;
	});
	
	var aNorth = aOtherZones.filter(function(dir){
		return dir.beforeN === false;
	});
	
	var oAllZone = oZone;
	if(aNorth.length > 0 ) {
		if(aNorth[0].beforeE){
			oAllZone = this.joinHorzZones(aNorth[0].oZone, oZone);
		} else {
			oAllZone = this.joinHorzZones(oZone, aNorth[0].oZone);
		}
	}
	
	var aSouth = aOtherZones.filter(function(dir){
		return dir.beforeN === true;
	});
	
	var oSouthZone = false;
	if(aSouth.length > 0 ) {
		oSouthZone = aSouth[0].oZone;
		if(aSouth.length > 1 ) {
			if(aSouth[0].beforeE){
				oSouthZone = this.joinHorzZones(aSouth[0].oZone, aSouth[1].oZone);
			} else {
				oSouthZone = this.joinHorzZones(aSouth[1].oZone, aSouth[0].oZone);
			}
		}
	}
	
	if(oSouthZone !== false) {
		console.log("oSouthZone", oSouthZone, "oAllZone", oAllZone)
		oZone = this.joinVertZones(oSouthZone, oAllZone);
	} else {
		oZone = oAllZone;
	}
	
	return this.roundZone(oZone);
}

LIDAR.prototype.joinHorzZones = function(oZone1, oZone2){
	var oZone = {};
	oZone.DTM = oZone1.DTM.map(function(line, id){
		return line.concat(oZone2.DTM[id]);
	});
  
	oZone.DSM = oZone1.DSM.map(function(line, id){
		return line.concat(oZone2.DSM[id]);
	});
	
	if(this.rounded){	
		oZone.Heights = oZone1.Heights.map(function(line, id){
			return line.concat(oZone2.Heights[id]);
		});
	}
	return oZone;
}

LIDAR.prototype.joinVertZones = function(oZone1, oZone2){
	
	var oZone = {};
	oZone.DTM = oZone1.DTM.concat(oZone2.DTM);
	oZone.DSM = oZone1.DSM.concat(oZone2.DSM);
	if(this.rounded){	
		oZone.Heights = oZone1.Heights.concat(oZone2.Heights);
	}
	return oZone;
}

LIDAR.prototype.getZoneFromPoints = function(aPoints, iResolution){
	
	//console.log("getZoneFromPoints", aPoints, iResolution);
	if(typeof iResolution === "undefined") {
		iResolution = this.iResolution;
	}
	
	if(typeof aPoints === "undefined") {
		//console.log("getting points");
		aPoints = this.getCompass();
		//console.log("aPoints", aPoints);
	}
	
	var oLIDAR = this;
	var nBaseKM = Math.floor(oLIDAR.oGrid.northing / 1000) * 1000;
	var eBaseKM = Math.floor(oLIDAR.oGrid.easting / 1000) * 1000;
	
	//console.log("oLIDAR.oGrid",oLIDAR.oGrid,"nBaseKM", nBaseKM, "eBaseKM",eBaseKM, "aPoints", aPoints);
	var aNewPoints = aPoints.map(function(dir){
		dir.iN = Math.max(0, Math.min(999, dir.n - nBaseKM));
		dir.iE = Math.max(0, Math.min(999, dir.e - eBaseKM));
		dir.bN = Math.round(dir.iN / oLIDAR.iResolution);
		dir.bE = Math.round(dir.iE / oLIDAR.iResolution);
		//console.log("new points", dir.name, "e",dir.e, "iE", dir.iE,"n", dir.n, "iN", dir.iN);
		return dir;
	});
	
	var oZone = {};

	var top		= aNewPoints[0].bN;
	var bottom	= aNewPoints[2].bN;
	var left	= aNewPoints[3].bE;  
	var right	= aNewPoints[2].bE;
	
	oZone.DTM = oLIDAR.DTM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
  
	oZone.DSM = oLIDAR.DSM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
	
	if(oLIDAR.rounded){	
		oZone.Heights = oLIDAR.Heights.slice(bottom, top).map(function(line){
			return line.slice(left,right);
		});
	}
	
	return oZone;
}

LIDAR.prototype.roundZone = function(oZone){
	var oLIDAR = this;
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
			return pad.substring(0, pad.length - str.length) + str;
		}).join(" ");
	}).join("\n");
	
	fs.writeFileSync("ZoneSurfaceData.txt", Out);
	console.log("DSM Data Saved to ZoneSurfaceData.txt");
	return oZone;
};
    
module.exports = LIDAR;
