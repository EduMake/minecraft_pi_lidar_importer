var fs = require('fs');
var LIDAR = require("./lidardata.js");
var Minecraft = require('minecraft-pi');
var Blocks = require('minecraft-pi/lib/blocks.json');

var DangerousBlocks= [
	"SAPLING", "WATER_FLOWING",	"LAVA_FLOWING", "LEAVES", "BED", "COBWEB", "GRASS_TALL", "WOOL",	"FLOWER_YELLOW",
	"FLOWER_CYAN", "MUSHROOM_BROWN", "MUSHROOM_RED", "BOOKSHELF", "TORCH", "FIRE", "STAIRS_WOOD", "CHEST", "FARMLAND", "FURNACE_INACTIVE",
	"FURNACE_ACTIVE", "DOOR_WOOD", "LADDER", "STAIRS_COBBLESTONE",
	"DOOR_IRON", "SNOW",	"ICE", "CACTUS", "CLAY",	"SUGAR_CANE",	"FENCE", "BEDROCK_INVISIBLE", "GLASS_PANE", "MELON", "FENCE_GATE"
];

for (var i =0; i<DangerousBlocks.length ; i++) {
	delete Blocks[DangerousBlocks[i]];
}

var commandLineArgs = require('command-line-args');

var sBlocks =  "Blocks Types are "+JSON.stringify(Blocks, null, 0).replace(/,/g,", ").replace("{","").replace("}","").replace(/\"/g,"");

var knowns = [];
if(fs.existsSync("knowns.json")) {
	knowns = JSON.parse(fs.readFileSync("knowns.json"));
}

var sKnowns = knowns.map(function(location, id){
	return id + ":"+location.name;
}).join(" ");

var cli = commandLineArgs([
	{ name: 'gridref', type: String, alias:'g', defaultOption: true, defaultValue:'SK 35526 86610', description:"Grid Reference to centre on" },
	{ name: 'save', alias: 'n', type: String, defaultValue:"", description:"Save Grid Ref with this name" },
	{ name: 'load', alias: 'l', type: Number, description:sKnowns },
	{ name: 'build', alias: 'b', type: Boolean, defaultValue: false, description:"Build this area in Minecraft"},
	{ name: 'terrain_block', alias: 't', type: Number, defaultValue: Blocks.GRASS, description: sBlocks},
	{ name: 'surface_block', alias: 's', type: Number, defaultValue: Blocks.IRON_BLOCK},
	{ name: 'quarter', alias: 'q', type: Number, defaultValue: 0},
	{ name: 'centre', alias: 'c', type: Boolean, defaultValue: false, description:"Builds in centre"},
	{ name: 'size', alias: 'i', type: Number, defaultValue: 128},
	{ name: 'resolution', alias: 'r', type: Number, defaultValue: 1},
	{ name: 'water', alias: 'w', type: Number, defaultValue: -1},
	{ name: 'debug', alias: 'd', type: Boolean, defaultValue: false },
	{ name: 'help', alias: 'h', type: Boolean, defaultValue: false }
]);

var options = cli.parse();

if(options.help) {
	console.log(cli.getUsage());	
	process.exit();
}

var iSize = options.size;
var iScale = options.scale;

if(options.list_blocks) {
	console.log(Blocks);
	process.exit();
}

if(options.save){
	var aFound = knowns.filter(function(place) {
		return place.ref == options.gridref;
	});
	
	if(aFound.length == 0) {
		var length = knowns.push({"ref":options.gridref, "name":options.save});
		fs.writeFileSync("knowns.json", JSON.stringify(knowns, null, 4));
		console.log(options.gridref, options.save, " now saved as ", length-1);
	}
}

var sGrid = options.gridref;

if(typeof options.load != "undefined") {
	sGrid = knowns[options.load].ref;
	console.log("Loading",  knowns[options.load].name);
}

var patch = new LIDAR(sGrid);
patch.rounded = true;
patch.iResolution = options.resolution;

const MinY = -64;
const MaxY = 64;

var qx = options.quarter % 2;
var qz = Math.floor(options.quarter / 2);
var cx = 0-(128/2)+(qx * 128);
var cz = 0-(128/2)+(qz * 128);

if (options.centre) {
	var cx = 0;
	var cz = 0;
}

function doStuff() {
	console.log("LIDAR Loaded");
	var oLIDAR = this;

	var centrenorth = Math.round((oLIDAR.oGrid.northing % 1000) / options.resolution);
	var centreeast =  Math.round((oLIDAR.oGrid.easting % 1000) / options.resolution);

	var bottom = Math.max(0, centrenorth - Math.round(iSize /2));
	var top =    Math.min(oLIDAR.DSM.LIDAR.length, centrenorth + Math.round(iSize /2));

	var left =  Math.max(0, centreeast - Math.round(iSize /2));
	var right = Math.min(oLIDAR.DSM.LIDAR[0].length, centreeast + Math.round(iSize /2));

	var DTMzone = oLIDAR.DTM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
  
	/*
	var aDTMmins = DTMzone.map(function(line){
		return Math.min(...line);
	});
	var iMinHeight2 = Math.min(...aDTMmins);
	console.log("iMinHeight2", iMinHeight2);
	*/
	var DSMzone = oLIDAR.DSM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
  
	if(patch.rounded){	
		var Heights = oLIDAR.Heights.slice(bottom, top).map(function(line){
			return line.slice(left,right);
		});
	}

	if(options.debug) {
		console.log(oLIDAR);
		fs.writeFileSync("Heights.json", JSON.stringify(Heights, null, 0).replace(/\[/g,"\n["));
		fs.writeFileSync("DSMzone.json", JSON.stringify(DSMzone, null, 0).replace(/\[/g,"\n["));
		fs.writeFileSync("DTMzone.json", JSON.stringify(DTMzone, null, 0).replace(/\[/g,"\n["));
	}

	var pad = "   ";
	var Out = DSMzone.map(function(line){
		return line.map(function(num){
			var str = num.toString();
			return pad.substring(0, pad.length - str.length) + str
		}).join(" ");
	}).join("\n");
	
	//console.log("Out", Out, "Heights", Heights, "DSMzone",DSMzone, "DTMzone",DTMzone);
	fs.writeFileSync("data.txt", Out);
	console.log("DSM Data Saved to data.txt");

	if(options.build == false){
		console.log(Out);
	} else {
		var client = new Minecraft('localhost', 4711, function() {
			client.chat('HELLO! IMPORTING LIDAR DATA INTO MINECRAFT PI EDITION. PLEASE ENJOY!.');

			var half = Math.round(iSize/2);

			client.setPos(cx, Math.round(oLIDAR.iMaxHeight - oLIDAR.iMinHeight) + MinY +10, cz);

			client.chat('Clearing!.');
			client.setBlocks(cx-half,  MinY,     cz-half,  half,  MinY,   cx+half, client.blocks['COBBLESTONE']);
			client.setBlocks(cx-half,  MinY +1 , cz-half,  half,  MaxY,   cz+half, client.blocks['AIR']);
			client.chat('Area Cleared!.');

			console.log("iMinHeight", oLIDAR.iMinHeight, "options.water", options.water );
			if(options.water > -1) {
				var WaterMCHeight = Math.round(options.water / options.resolution) + MinY  ;
				client.setBlocks(cx-half,  MinY , cz-half,  half, WaterMCHeight ,  cz+half, client.blocks['WATER_STATIONARY']);    
			}
		
			for(var i = 0 ; i < DTMzone.length; i++) { //north direction
				for(var j = 0 ; j < DTMzone[0].length; j++) { //east direction
					var x = cx + j - half;
					var z = cz + i - half;
					var TerrainMCHeight = Math.round((DTMzone[i][j] - oLIDAR.iMinHeight)  / options.resolution) + MinY  ;
					var SurfaceMCHeight = TerrainMCHeight + Math.round( Heights[i][j] / options.resolution);

					client.setBlocks(x, MinY , z, x, TerrainMCHeight , z, options.terrain_block);

					if(SurfaceMCHeight > TerrainMCHeight) {
						client.setBlocks(x, TerrainMCHeight+1, z, x, SurfaceMCHeight, z, options.surface_block);
					}
				}
				if(i % 10 == 0) {
					var message = 'i = '+i+ " z= "+ z;
					console.log(message);
					client.chat(message);
				}
			}
	  
			console.log("Done");
			client.chat('Done');
			client.setPos(cx, Math.round(oLIDAR.iMaxHeight - oLIDAR.iMinHeight) + MinY +10, cz);
			client.end();
		});
	}
}

patch.load(doStuff);
