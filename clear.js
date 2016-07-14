
var Minecraft = require('minecraft-pi-vec3');
var v = require("minecraft-pi-vec3/lib/vec3_directions.js");
var client = new Minecraft('localhost', 4711, function() {
 client.chat('Saving');
 client.saveCheckpoint();
 client.chat('Clearing');
 client.setBlocks(v(-128, -64, -128), v(128, -64, 128), client.blocks['COBBLESTONE']);
 client.setBlocks(v(-128, -63, -128), v(128,  64, 128), client.blocks['AIR']);
 client.setBlocks(v(-128, 65, -128), v(128,  128, 128), client.blocks['AIR']);
 client.chat('Clear Done');
 client.setPos(0, 50, 0);
 client.chat('Saving');
 client.saveCheckpoint();
 client.end();
});
  
