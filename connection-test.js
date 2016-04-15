
var Minecraft = require('minecraft-pi');
var client = new Minecraft('localhost', 4711, function() {
 client.chat('Testing');
 client.chat('Saving');
 client.saveCheckpoint();
 client.end();
});
  
