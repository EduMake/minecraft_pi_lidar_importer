
var Minecraft = require('minecraft-pi');
var client = new Minecraft('localhost', 4711, function() {

 client.setBlocks(-128, -50, -128, 128, 0, 128, client.blocks['COBBLESTONE']);
 client.setBlocks(-128, 1, -128, 128, 100, 128, client.blocks['AIR']);
});
  
