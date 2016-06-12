var fs = require('fs');
var LIDAR = require("./lidardata.js");
var Minecraft = require('minecraft-pi-vec3');
var Blocks = require('minecraft-pi-vec3/lib/blocks.json');
var FillBlocks = require('minecraft-pi-vec3/lib/blocks.json');
var v = require("minecraft-pi-vec3/lib/vec3_directions.js");


var DangerousBlocks= [
	"SAPLING", "WATER_FLOWING",	"LAVA_FLOWING", "LEAVES", "BED", "COBWEB", "GRASS_TALL", "WOOL",	"FLOWER_YELLOW",
	"FLOWER_CYAN", "MUSHROOM_BROWN", "MUSHROOM_RED", "BOOKSHELF", "TORCH", "FIRE", "STAIRS_WOOD", "CHEST", "FARMLAND", "FURNACE_INACTIVE",
	"FURNACE_ACTIVE", "DOOR_WOOD", "LADDER", "STAIRS_COBBLESTONE",
	"DOOR_IRON", "SNOW",	"ICE", "CACTUS", "CLAY",	"SUGAR_CANE",	"FENCE", "BEDROCK_INVISIBLE", "GLASS_PANE", "MELON", "FENCE_GATE"
];

var FillDangerousBlocks= [
	"SAPLING", "LEAVES", "BED", "COBWEB", "GRASS_TALL", "WOOL",	"FLOWER_YELLOW",
	"FLOWER_CYAN", "MUSHROOM_BROWN", "MUSHROOM_RED", "BOOKSHELF", "TORCH", "FIRE", "STAIRS_WOOD", "CHEST", "FARMLAND", "FURNACE_INACTIVE",
	"FURNACE_ACTIVE", "DOOR_WOOD", "LADDER", "STAIRS_COBBLESTONE",
	"DOOR_IRON", "SNOW",	"ICE", "CACTUS", "CLAY",	"SUGAR_CANE",	"FENCE", "BEDROCK_INVISIBLE", "GLASS_PANE", "MELON", "FENCE_GATE"
];

for (var i =0; i<DangerousBlocks.length ; i++) {
	delete Blocks[DangerousBlocks[i]];
}

for (var i =0; i<FillDangerousBlocks.length ; i++) {
	delete FillBlocks[FillDangerousBlocks[i]];
}


var knowns = [];
if(fs.existsSync("knowns.json")) {
	knowns = JSON.parse(fs.readFileSync("knowns.json"));
}

var eLocations = document.getElementById("locations");
knowns.forEach(function(known){
	var el = document.createElement("option");
	el.setAttribute("value", known.ref);
	el.setAttribute("label", known.name);
	eLocations.appendChild(el);
});

eLocations.addEventListener("change", function(ev){
	console.log(ev);
	var eRef = document.getElementById("gridref");
	var sRef = ev.target.value;
	if(sRef == "manual"){
		eRef.value = "";
	} else {
		eRef.value = ev.target.value;
	}
});

function loadfile(){
	var eRef = document.getElementById("gridref");
	patch.setGridRef(eRef.value);
	patch.load(doStuff);
}



// TODO : Add defaults
var eBuildingBlocks = document.getElementById("building_blocks");
for(sBlock in Blocks){
	var el = document.createElement("option");
	el.setAttribute("value", sBlock);
	el.setAttribute("label", sBlock.replace("_", " "));
	eBuildingBlocks.appendChild(el);
};


var eTerrainBlocks = document.getElementById("terrain_blocks");
for(sBlock in Blocks){
	var el = document.createElement("option");
	el.setAttribute("value", sBlock);
	el.setAttribute("label", sBlock.replace("_", " "));
	eTerrainBlocks.appendChild(el);
};

var eFillBlocks = document.getElementById("fill_blocks");
for(sBlock in FillBlocks){
	var el = document.createElement("option");
	el.setAttribute("value", sBlock);
	el.setAttribute("label", sBlock.replace("_", " "));
	eFillBlocks.appendChild(el);
};



var patch = new LIDAR();
patch.rounded = true;
patch.iResolution = 2;
patch.debug = false;

patch.onfilemissing = function(inputFile, sZipName, sURL){
	document.write("LIDAR Data not found at '"+inputFile+"' try copying out of the "+sZipName+" <br />");
	document.write("Try downloading from  <a target=\"_new\" href=\""+sURL+"\">"+sURL+"</a> <br />");
}

patch.zipiframeopen = false;
patch.onzipfilemissing = function( sZipName, sURL ){
	console.log( sZipName, sURL )
	var webviewtest = document.getElementById("foo");
	if(webviewtest == null) {
		var webinstructions = document.getElementById("webinstructions"); 
		webinstructions.innerHTML = "Please download "+sZipName+" from below into the "+patch.zipFolder+""
		/*var win = nw.Window.get();
		win.maximize();*/
		
		var webview = document.createElement("iframe");
		webview.setAttribute("style", "width:100%;height:1000px;");
		webview.setAttribute("src", sURL);
		webview.id = "foo";
		var currentDiv = document.getElementById("break"); 
		document.body.insertBefore(webview, currentDiv); 	
	}
	// TODO : set up a timer to see if it has arrived yet 
}

/*patch.onzipfilemissing = function( sZipName, sURL ){
	console.log( sZipName, sURL )
	// TODO : use webview to open the url and onload run
	//http://docs.nwjs.io/en/latest/References/webview%20Tag/
	
	//document.write("LIDAR Data not found at '"+sZipName+"' trying to download from  <a target=\"_new\" href=\""+sURL+"\">"+sURL+ "</a><br/ >")
	//document.write('<webview id="foo" src="'+sURL+'" style="width:640px; height:500px"></webview>');
	
	var webview = document.createElement("webview");
	 webview.setAttribute("style", "height:600px;");
	 
	 webview.setAttribute("src", sURL);
	 webview.id = "foo";
	 var currentDiv = document.getElementById("break"); 
	
	//var webview = document.getElementById("foo");
	console.log("webview",webview);
	
	//webview.showDevTools(true);
	webview.addEventListener("contentload", function(){
		//sCode = "var el = document.querySelectorAll('[download=\""+sZipName+"\"]');\nif(el.length ==0){return '"+sZipName+" Not Found';\n } var event = new MouseEvent('click', {'view': window,    'bubbles': true,    'cancelable': true});  el[0].dispatchEvent(event);\n return '"+sZipName+"';";
		sCode = "return '"+sZipName+"';";
		
		
		console.log(sCode);
		webview.executeScript({ code: sCode }, function(arr){
				console.log(sZipName, arr);
			});
	});
	document.body.insertBefore(webview, currentDiv); 
  
	//document.write("LIDAR Data not found at '"+sZipName+"' try downloading from  <a target=\"_new\" href=\""+sURL+"\">"+sURL+ "</a><br/ >");
	
}
*/
	
	
/*	
patch.load(function(){
	alert("success");
	});
*/

var options = {
	"resolution": 2,
	"build":true,
	"water": -1,
	"centre":false,
	"quarter":0,
	'terrain_block': Blocks.GRASS, 
	'surface_block':Blocks.IRON_BLOCK,
	'size': 128
};


const MinY = -63;
const MaxY = 64;

var qx = options.quarter % 2;
var qz = Math.floor(options.quarter / 2);
var c = v(0-(128/2)+(qx * 128) , MinY , 0-(128/2)+(qz * 128));

if (options.centre) {
	c = v(0, MinY, 0);
}


function doStuff() {
	alert("LIDAR Loaded");
}

function buildthezone() {
	console.log("LIDAR Loaded");
	var oZone = patch.getZone(iSize);
	
	if(options.build == false){
		
	} else {
		var client = new Minecraft('localhost', 4711, function() {
			client.chat('IMPORTING LIDAR DATA INTO MINECRAFT PI EDITION.');
			var half = Math.round(iSize/2);
			var OverWatch = c.up(Math.round((oZone.iMaxHeight - oZone.iMinHeight)/options.resolution) + 5);
			client.setPos(OverWatch);
			
			var SouthWest = c.offset(-1 * half, 0, -1 * half);
			var NorthEast = c.offset(half, 0, half);
			var NorthEastTop = c.offset(half, MaxY, half);
			
			client.chat('Clearing!.');
			// Floor across the area
			client.setBlocks(SouthWest, NorthEast, client.blocks['COBBLESTONE']);
			// Air from just above the floor to the top of the world
			client.setBlocks(SouthWest.up(1), NorthEastTop, client.blocks['AIR']);
			client.chat('Area Cleared!.');

			var WaterMCHeight = MinY - 1;
			if(options.water > -1) {
				WaterMCHeight = Math.round(options.water / options.resolution);
				//Replace the floor and above with water
				client.setBlocks(SouthWest, NorthEast.up(WaterMCHeight), client.blocks['WATER_STATIONARY']);    
			}
		
			for(var i = 0 ; i < oZone.DTM.length; i++) { //north direction
				for(var j = 0 ; j < oZone.DTM[0].length; j++) { //east direction
					var FloorPoint = SouthWest.offset(j, 0, i);
					var TerrainPoint = FloorPoint.up(Math.round((oZone.DTM[i][j] - oZone.iMinHeight)  / options.resolution));
					var SurfacePoint = TerrainPoint.up(Math.round( oZone.Heights[i][j] / options.resolution));
					
					if(TerrainPoint.y > WaterMCHeight + MinY) {
						client.setBlocks(FloorPoint, TerrainPoint, options.terrain_block);
					}
					
					if(SurfacePoint.y > TerrainPoint.y) {
						client.setBlocks(TerrainPoint.up(1), SurfacePoint, options.surface_block);
					}
				}
				if(i % 10 == 0 || (i + 1) == iSize) {
					var message = "Importing "+Math.ceil(100*i/iSize)+ " % Complete";
					console.log(message);
					client.chat(message);
				}
			}
	  
			console.log("Done");
			client.chat('Done');
			client.setPos(OverWatch);
			client.end();
		});
	}
}
	
