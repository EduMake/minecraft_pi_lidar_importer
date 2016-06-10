#! /usr/bin/env node

var LIDAR = require("./lidardata.js");
var Minecraft = require('minecraft-pi-vec3');
var Blocks = require('minecraft-pi-vec3/lib/blocks.json');
var v = require("minecraft-pi-vec3/lib/vec3_directions.js");


var DangerousBlocks= [
	"SAPLING", "LEAVES", "BED", "COBWEB", "GRASS_TALL", "WOOL",	"FLOWER_YELLOW",
	"FLOWER_CYAN", "MUSHROOM_BROWN", "MUSHROOM_RED", "BOOKSHELF", "TORCH", "FIRE", "STAIRS_WOOD", "CHEST", "FARMLAND", "FURNACE_INACTIVE",
	"FURNACE_ACTIVE", "DOOR_WOOD", "LADDER", "STAIRS_COBBLESTONE",
	"DOOR_IRON", "SNOW",	"ICE", "CACTUS", "CLAY",	"SUGAR_CANE",	"FENCE", "BEDROCK_INVISIBLE", "GLASS_PANE", "MELON", "FENCE_GATE"
];

for (var i =0; i<DangerousBlocks.length ; i++) {
	delete Blocks[DangerousBlocks[i]];
}

var commandLineArgs = require('command-line-args');

var sBlocks =  "Blocks Types are "+JSON.stringify(Blocks, null, 0).replace(/,/g,", ").replace("{","").replace("}","").replace(/\"/g,"");

var cli = commandLineArgs([
	{ name: 'block', alias: 'b', type: Number, defaultOption: true, defaultValue: Blocks.GOLD_BLOCK, description: sBlocks},
	{ name: 'vertical', alias: 'v', type: Boolean, defaultValue: false, description: "Verticall filling,, false for water type behaviour"},
	{ name: 'flood', alias: 'f', type: Boolean, defaultValue: false, description: "Flowinbg Water fillout horizontally"},
	{ name: 'help', alias: 'h', type: Boolean, defaultValue: false }
]);

var options = cli.parse();

if(options.flood) {
	options.vertical = false;
	options.block = 8;
}


if(options.help) {
	
	console.log(options);
	console.log(cli.getUsage());	
	process.exit();
}

var client = new Minecraft('localhost', 4711, function() {
	client.chat('Testing');
	client.connection.setMaxListeners(50);

	var oVisiting = {};
	var iCount = 0;
	
	client.onQueueEnd();
	
	function onBlock(point, oldVal, newVal, vertical, Block){
		var currVal = parseInt(Block.toString(), 10);
		
		if(oldVal == null){
            //console.log("oldVal null");
            oldVal = currVal;
        }
		
		
        if(currVal == oldVal){
			//console.log("Setting Block");
			//console.log("onBlock", iCount, "point", point, "newVal", newVal, "vertical", vertical,  "Block", Block, "currVal", currVal, "oldVal", oldVal);
		
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
		client.getBlock(start, onBlock.bind(null, start, null, options.block , options.vertical ));
	};
		
	client.getTile(onTile);
	
});


