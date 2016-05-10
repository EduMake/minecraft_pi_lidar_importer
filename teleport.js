var Minecraft = require('minecraft-pi');

var client = new Minecraft('localhost', 4711, function() {
  client.setPos(0, 70, 0);
  client.end();
});


  
  
