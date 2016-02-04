var fs = require('fs');

var sSurfaceOut = "DSMtest.json";
var sTerrainOut = "DTMtest.json";

var DSM = JSON.parse(fs.readFileSync(sSurfaceOut).toString());
var DTM = JSON.parse(fs.readFileSync(sTerrainOut).toString());


var iSize = 10;

/*var aCombined = DSM.LIDAR.map(function(aRow, y){    
   return  aRow.map(function(iHeight, x){
       return {surface:iHeight, terrain:DTM.LIDAR[y][x]};
   });   
});*/

var aRowMaxes = DSM.LIDAR.map(function(aRow, y){    
    aRow.sort();
    iRowMax = aRow[aRow.length-1];
     return iRowMax;
  }).sort();

var iMaxHeight = aRowMaxes[aRowMaxes.length-1];
console.log("iMaxHeight =", iMaxHeight);

var aRowMines = DTM.LIDAR.map(function(aRow, y){    
    aRow.sort();
    iRowMin = aRow[0];
     return iRowMin;
  }).sort();

var iMinHeight = aRowMines[0];
console.log("iMinHeight =", iMinHeight);

//http://choas.github.io/minecraft-pi-promise/

var Minecraft = require('minecraft-pi');
var client = new Minecraft('localhost', 4711, function() {
	// Use the client variable to play with the server! 
	client.chat('HELLO! WELCOME TO THE PROGRAM WHICH IMPORTS LIDAR DATA INTO MINECRAFT PI EDITION PLEASE ENJOY!.');
    
  for(var y = 0 ; y < iSize; y++){
    for(var x = 0 ; x < iSize; x++){
  
      var yMC = y;
      var xMC = x;    
      var TerrainMCHeight = DTM.LIDAR[y][x]-50;
      var SurfaceMCHeight = DSM.LIDAR[y][x]-50;
      
      client.setBlock(xMC, TerrainMCHeight ,yMC, client.blocks['GRASS_BLOCK']);
      /*if(SurfaceMCHeight > TerrainMCHeight){
        client.setBlocks(xMC, yMC, TerrainMCHeight+1, xMC, yMC, SurfaceMCHeight, client.blocks['DIAMOND_BLOCK']);
      }*/
    }
  }
});
  
  
