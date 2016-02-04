var Minecraft = require('minecraft-pi');
var client = new Minecraft('localhost', 4711, function() {
    // Use the client variable to play with the server!
    client.chat('Yo dawg, I heard you like Node.js, so I put some Node.js in your Pi so you can Node.js while you Pi.');
    client.setBlock(10, 11, 1, client.blocks['GOLD_BLOCK']);
    client.setBlock(10, 10, 1, client.blocks['GOLD_BLOCK']);
    client.setBlock(10, 9, 1, client.blocks['GOLD_BLOCK']);
    client.setBlock(10, 8, 1, client.blocks['GOLD_BLOCK']);
    client.setBlock(10, 7, 1, client.blocks['GOLD_BLOCK']);
    client.setBlock(11, 11, 1, client.blocks['GOLD_BLOCK']);  
    client.setBlock(12, 11, 1, client.blocks['GOLD_BLOCK']);  
});
