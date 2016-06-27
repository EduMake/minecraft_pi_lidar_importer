var fs = require('fs');
var LIDAR = require("./lidardata.js");
var Minecraft = require('minecraft-pi-vec3');
var Blocks = require('minecraft-pi-vec3/lib/blocks.json');
var FillBlocks = require('minecraft-pi-vec3/lib/blocks.json');
var v = require("minecraft-pi-vec3/lib/vec3_directions.js");

const MinY = -63;
const MaxY = 64;


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
	var el= document.getElementById("build_control");
	el.style.display = 'none';
});

// TODO : add name ing of gridref and add to hosts
var elMessage = document.getElementById("msg");
	
function loadfile(){
	var currentDiv = document.getElementById("downloadmissing");
	currentDiv.innerHTML = "";
	
	var eRef = document.getElementById("gridref");
	patch.setGridRef(eRef.value);
	
	elMessage.innerHTML = "Loading....";
	
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
eBuildingBlocks.value = "IRON_BLOCK";

var eTerrainBlocks = document.getElementById("terrain_blocks");
for(sBlock in Blocks){
	var el = document.createElement("option");
	el.setAttribute("value", sBlock);
	el.setAttribute("label", sBlock.replace("_", " "));
	eTerrainBlocks.appendChild(el);
};
eTerrainBlocks.value = "GRASS";

var eFillBlocks = document.getElementById("fill_blocks");
for(sBlock in FillBlocks){
	var el = document.createElement("option");
	el.setAttribute("value", sBlock);
	el.setAttribute("label", sBlock.replace("_", " "));
	eFillBlocks.appendChild(el);
};
eFillBlocks.value = "GOLD_BLOCK";

var patch = new LIDAR();
patch.rounded = true;
patch.iResolution = 2;
patch.debug = false;

patch.onzipfilemissing = function( sZipName, sURL ){
	console.log( sZipName, sURL )
	var webviewtest = document.getElementById("envagency");
	if(webviewtest == null) {
		// TODO : use webview to open the url and onload run
		
		//document.write("LIDAR Data not found at '"+sZipName+"' trying to download from  <a target=\"_new\" href=\""+sURL+"\">"+sURL+ "</a><br/ >")
		//document.write('<webview id="foo" src="'+sURL+'" style="width:640px; height:500px"></webview>');
		
		var webview = document.createElement("webview");
		webview.setAttribute("style", "height:600px;");
		
		webview.setAttribute("src", sURL);
		webview.id = "envagency";
		 
		console.log("webview", webview);
		var currentDiv = document.getElementById("downloadmissing");
		currentDiv.appendChild(webview); 
		var sCode = "var el = document.querySelectorAll('[download=\""+sZipName+"\"]');\n";
		sCode += "console.log(el);\n";
		sCode += "if(el.length >0){\n ";
		sCode += " var clickTarget = el[0]; ";
		sCode += " console.log(clickTarget);\n";
		//sCode += " clickTarget.removeAttribute('href');\n";
		sCode += " clickTarget.href ='#';\n";
		sCode += " var event = new MouseEvent('click', {'view': window,    'bubbles': true,    'cancelable': true}); ";
		sCode += " clickTarget.dispatchEvent(event);";
		sCode += "}";
		console.log(sCode);	
		//webview.addEventListener('dom-ready', function(){
		webview.addEventListener('did-finish-load', function(){
			webview.openDevTools();
			//alert("Click when loaded");
			setTimeout(function(){
				webview.executeJavaScript(sCode, false);
			}, 15000);
		});
	
		  
		//document.write("LIDAR Data not found at '"+sZipName+"' try downloading from  <a target=\"_new\" href=\""+sURL+"\">"+sURL+ "</a><br/ >");
	}
	// TODO : set up a timer to see if it has arrived yet 
}

// TODO :  Make onfilemissing like onzipfilemissing
patch.onfilemissing = function(inputFile, sZipName, sURL){
	document.write("LIDAR Data not found at '"+inputFile+"' try copying out of the "+sZipName+" <br />");
	document.write("Try downloading from  <a target=\"_new\" href=\""+sURL+"\">"+sURL+"</a> <br />");
}

var options = {
	"resolution": 2,
	"build":true,
	"water": -1,
	"centre":false,
	"quarter":0,
	'terrain_block': Blocks.GRASS, 
	'surface_block':Blocks.IRON_BLOCK
};


var iSize = 128;


function doStuff() {
	elMessage.innerHTML="";
	//alert("LIDAR Loaded");
	var el= document.getElementById("build_control");
	el.style.display = '';
	var oZone = patch.getZone(iSize);
}

function buildthezone() {
	//alert("Starting to build");
	var oZone = patch.getZone(iSize);
	
	if(options.build == false){
		
	} else {
		var client = new Minecraft('localhost', 4711, function() {			
			
			var quarter = document.getElementById("areas").value;
			if (quarter == "centre") {
				c = v(0, MinY, 0);
				iSize = 256;
			} else {
				var qx = quarter % 2;
				var qz = Math.floor(quarter / 2);
				var c = v(0-(128/2)+(qx * 128) , MinY , 0-(128/2)+(qz * 128));
			}
			
			client.chat('IMPORTING LIDAR DATA INTO MINECRAFT PI EDITION.');
			var half = Math.round(iSize/2);
			var OverWatch = c.up(Math.round((oZone.iMaxHeight - oZone.iMinHeight)/options.resolution) + 5);
			client.setPos(OverWatch);
			
			var SouthWest = c.offset(-1 * half, 0, -1 * half);
			var NorthEast = c.offset(half, 0, half);
			var NorthEastTop = c.offset(half, MaxY+20, half);
			
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
		
			for(var i = 1 ; i < (oZone.DTM.length -1); i++) { //north direction
				for(var j = 1 ; j < (oZone.DTM[0].length-1); j++) { //east direction
					var FloorPoint = SouthWest.offset(j, 0, i);
					var TerrainPoint = FloorPoint.up(Math.round((oZone.DTM[i][j] - oZone.iMinHeight)  / options.resolution));
					
					
					var Surface =  Math.round( oZone.Heights[i][j] / options.resolution);
					var WSurface = Math.round( oZone.Heights[i][j-1] / options.resolution);
					var ESurface = Math.round( oZone.Heights[i][j+1] / options.resolution);
					var SSurface = Math.round( oZone.Heights[i-1][j] / options.resolution);
					var NSurface = Math.round( oZone.Heights[i+1][j] / options.resolution);
					
					var Base  = Math.min(Surface, WSurface, ESurface, SSurface, NSurface);
					console.log("Base", Base, "Surface", Surface, WSurface, ESurface, SSurface, NSurface)
					
					var SurfacePoint = TerrainPoint.up(Surface);
					var BasePoint = TerrainPoint.up(Base+1);
					if(TerrainPoint.y > WaterMCHeight + MinY) {
						client.setBlocks(FloorPoint, TerrainPoint, client.blocks[eTerrainBlocks.value]);
					}
					
					if(SurfacePoint.y > TerrainPoint.y) {
						client.setBlocks(BasePoint, SurfacePoint, client.blocks[eBuildingBlocks.value]);
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

function teleport(){
	var elDir = document.getElementById("direction");
	var elDist = document.getElementById("distance");
	
	var client = new Minecraft('localhost', 4711, function() {
	
	function onTile(tile){
		console.log(elDir.value) 
		var start = tile[elDir.value.toLowerCase()](parseInt(elDist.value));
		console.log("getTile", tile, start);
		client.setPos(start);
	};
		
	client.getTile(onTile);
	
});
	
}

	
function floodfill(){
	var el = document.getElementById("vertical");
		
	var client = new Minecraft('localhost', 4711, function() {
	client.chat('Filling with '+eFillBlocks.value);
	client.connection.setMaxListeners(50);

	var oVisiting = {};
	var iCount = 0;
	
	client.onQueueEnd(function(){
		alert("Fill Finished");
		client.end();
	});
	
	function onBlock(point, oldVal, newVal, vertical, Block){
		var currVal = parseInt(Block.toString(), 10);
		
		if(oldVal == null){
            //console.log("oldVal null");
            oldVal = currVal;
        }
		
		
        if(currVal == oldVal){
			client.setBlock(point, newVal);
			oVisiting[point.toString()] = true;
			
			point.forDirections(function(pos, dir){
				if(!oVisiting.hasOwnProperty(pos.toString())) {
					oVisiting[pos.toString()] = false;
					client.getBlock(pos, onBlock.bind(null, pos, oldVal, newVal, vertical));
				} else { 
					//console.log("Been "+dir);
				}
			}, 1, false, vertical);
			
		} else {
			//console.log(point.toString(),"Block=", currVal,"Not", oldVL);
		}
		return false;
	}

    function onTile(tile){
		//onsole.log("getTile", tile);
		var start = tile.offset(0, -1, 0);
		client.getBlock(start, onBlock.bind(null, start, null, client.blocks[eFillBlocks.value], (el.value === "true") ));
	};
		
	client.getTile(onTile);
	
});
	
}
