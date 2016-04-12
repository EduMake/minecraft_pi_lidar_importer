var fs = require('fs');

var sSurfaceOut = "DSMtest.json";
var sTerrainOut = "DTMtest.json";

var DSM = JSON.parse(fs.readFileSync(sSurfaceOut).toString());
var DTM = JSON.parse(fs.readFileSync(sTerrainOut).toString());

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

var iSize = 255;
//SK 35511 86617 [UTC Sheffield Grid reference number]

//var centreeast = 511;
//var centrenorth = 617;
var centreeast = 270;
var centrenorth = 800;



var Minecraft = require('minecraft-pi');
var client = new Minecraft('localhost', 4711, function() {
	// Use the client variable to play with the server! 
	
  client.chat('HELLO! IMPORTING LIDAR DATA INTO MINECRAFT PI EDITION. PLEASE ENJOY!.');
  for(var north = centrenorth - Math.round(iSize/2) ; north < centrenorth + Math.round(iSize/2); north++){
    for(var east = centreeast - Math.round(iSize/2) ; east < centreeast + Math.round(iSize/2); east++){
      var south = 1000 - north;
      
      var x = east - centreeast;
      var z = north - centrenorth;    
      var TerrainMCHeight = DTM.LIDAR[south][east]-iMinHeight;
      var SurfaceMCHeight = DSM.LIDAR[south][east]-iMinHeight;
      
      //console.log(north, east, x, z, "DTM",DTM.LIDAR[north][east],"DSM", DSM.LIDAR[north][east],"Terrain", TerrainMCHeight,"Surface", SurfaceMCHeight);
      
      client.setBlocks(x, 0 , z, x, TerrainMCHeight -1 , z, client.blocks.COBBLESTONE);
      client.setBlock(x, TerrainMCHeight ,z, client.blocks.GRASS);
      if(SurfaceMCHeight > TerrainMCHeight){
		if(SurfaceMCHeight > TerrainMCHeight+1){
          client.setBlocks(x, TerrainMCHeight+1, z, x, SurfaceMCHeight, z, client.blocks.IRON_BLOCK);
	    }else{
	      client.setBlocks(x, TerrainMCHeight, z, x, SurfaceMCHeight, z, client.blocks.OBSIDIAN);
	    }
      }
      
      client.setBlocks(x, SurfaceMCHeight + 1, z, x, 100, z, client.blocks['AIR']);
    }
    if(north % 10 == 0) {
      var message = 'north = '+north+ " z= "+ z;
      console.log(message);
      client.chat(message);
    }
  }
  console.log("Done");
  client.chat('Done');
  client.setPos(0, iMaxHeight - iMinHeight, 0);
  client.end();
});
  
  
