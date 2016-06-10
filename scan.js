#! /usr/bin/env node

var fs = require('fs');
var LIDAR = require("./lidardata.js");
var Minecraft = require('minecraft-pi-vec3');
var Blocks = require('minecraft-pi-vec3/lib/blocks.json');
var v = require("minecraft-pi-vec3/lib/vec3_directions.js");

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
	{ name: 'build', alias: 'b', type: Boolean, defaultValue: true, description:"Build this area in Minecraft"},
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
const MaxY = 64;

var qx = options.quarter % 2;
var qz = Math.floor(options.quarter / 2);
var c = v(0-(128/2)+(qx * 128) , MinY , 0-(128/2)+(qz * 128));

if (options.centre) {
	c = v(0, MinY, 0);
}

function doStuff() {
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

patch.load(doStuff);
