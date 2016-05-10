
var Minecraft = require('minecraft-pi');
var client = new Minecraft('localhost', 4711, function() {
 client.chat('Saving');
 client.saveCheckpoint();
 client.chat('Clearing');
 client.setBlocks(-128, -64, -128, 128, -64, 128, client.blocks['COBBLESTONE']);
 client.setBlocks(-128, -63, -128, 128,  64, 128, client.blocks['AIR']);
 client.chat('Clear Done');
 client.setPos(0, 50, 0);
 client.chat('Saving');
 client.saveCheckpoint();
 client.end();
});
  
