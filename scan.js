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
patch.debug = options.debug;


const MinY = -63;
const MaxY = 63;

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
	
	var oZone = patch.getZone(iSize);
	//console.log(oZone);
	
	if(options.build == false){
		console.log(Out);
	} else {
		var client = new Minecraft('localhost', 4711, function() {
			client.chat('HELLO! IMPORTING LIDAR DATA INTO MINECRAFT PI EDITION. PLEASE ENJOY!.');

			var half = Math.round(iSize/2);

			client.setPos(cx, Math.round(oZone.iMaxHeight - oZone.iMinHeight) + MinY +10, cz);

			client.chat('Clearing!.');
			client.setBlocks(cx-half,  MinY,     cz-half,  half,  MinY,   cx+half, client.blocks['COBBLESTONE']);
			client.setBlocks(cx-half,  MinY +1 , cz-half,  half,  MaxY,   cz+half, client.blocks['AIR']);
			client.chat('Area Cleared!.');

			var WaterMCHeight = MinY - 1;
			if(options.water > -1) {
				WaterMCHeight = Math.round(options.water / options.resolution) + MinY;
				console.log("iMinHeight", oZone.iMinHeight, "options.water", options.water, "WaterMCHeight", WaterMCHeight );
				client.setBlocks(cx-half,  MinY , cz-half,  half, WaterMCHeight ,  cz+half, client.blocks['WATER_STATIONARY']);    
			}
		
			for(var i = 0 ; i < oZone.DTM.length; i++) { //north direction
				for(var j = 0 ; j < oZone.DTM[0].length; j++) { //east direction
					var x = cx + j - half;
					var z = cz + i - half;
					var TerrainMCHeight = Math.round((oZone.DTM[i][j] - oZone.iMinHeight)  / options.resolution) + MinY  ;
					var SurfaceMCHeight = TerrainMCHeight + Math.round( oZone.Heights[i][j] / options.resolution);
					
					if(TerrainMCHeight > WaterMCHeight) {
						client.setBlocks(x, MinY , z, x, TerrainMCHeight , z, options.terrain_block);
					}
					
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
			client.setPos(cx, Math.round(oZone.iMaxHeight - oZone.iMinHeight) + MinY +10, cz);
			client.end();
		});
	}
}

patch.load(doStuff);
