
var Minecraft = require('minecraft-pi');
var client = new Minecraft('localhost', 4711, function() {
 client.chat('Saving');
 client.saveCheckpoint();
 client.chat('Clearing');
 //Overkill but none centred worlds appear to be possible
 //client.setBlocks(-200, -50, -200, 200, 0, 200, client.blocks['COBBLESTONE']);
 //client.setBlocks(-200, 1, -200, 200, 100, 200, client.blocks['AIR']);
 client.setBlocks(-128, -50, -128, 128, 0, 128, client.blocks['COBBLESTONE']);
 client.setBlocks(-128, 1, -128, 128, 100, 128, client.blocks['AIR']);
 client.chat('Clear Done');
 client.setPos(0, 50, 0);
 client.chat('Saving');
 client.saveCheckpoint();
 client.end();
});
  
