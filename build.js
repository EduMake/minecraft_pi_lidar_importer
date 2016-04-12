var fs = require('fs');

var sSurfaceOut = "DSMtest.json";
var sTerrainOut = "DTMtest.json";

var DSM = JSON.parse(fs.readFileSync(sSurfaceOut).toString());
var DTM = JSON.parse(fs.readFileSync(sTerrainOut).toString());


var iSize = 10;



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
    
  for(var north = 0 ; north < iSize; north++){
    for(var east = 0 ; east < iSize; east++){
  
      var x = east;
      var z = north;    
      var TerrainMCHeight = DTM.LIDAR[north][east]-iMinHeight;
      var SurfaceMCHeight = DSM.LIDAR[north][east]-iMinHeight;
      
      //console.log(north, east, x, z, "DTM",DTM.LIDAR[north][east],"DSM", DSM.LIDAR[north][east],"Terrain", TerrainMCHeight,"Surface", SurfaceMCHeight);
      
      client.setBlock(x, TerrainMCHeight ,z, client.blocks['GRASS']);
      if(SurfaceMCHeight > TerrainMCHeight){
        client.setBlocks(x, TerrainMCHeight+1, z, x, SurfaceMCHeight, z, client.blocks['DIAMOND_BLOCK']);
      }
    }
  }
});
  
  
