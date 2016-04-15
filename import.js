var fs = require('fs');
var LIDAR = require("./lidardata.js");
var Minecraft = require('minecraft-pi');

var iSize = 254;
var patch = new LIDAR("SK 35511 86617"); //[UTC Sheffield Grid reference number]
//var patch = new LIDAR("SK 35500 86500");
//var patch = new LIDAR("TQ 32088 81232"); //St Pauls
//var patch = new LIDAR("SK 35295 86079");//brammal lane part of 
//var patch = new LIDAR("SK 35500 86500");
//var patch = new LIDAR("TQ 32261 79492"); //Westminster
//var patch = new LIDAR("TQ 31674 80704"); //bridges in thames
patch.rounded = true;
const MinY = -64;
const MaxY = 64;

function doStuff(){
 console.log("Loaded");
 var oLIDAR = this;
 //console.log(oLIDAR);
 var client = new Minecraft('localhost', 4711, function() {
  // Use the client variable to play with the server! 
  
  var centrenorth = oLIDAR.oGrid.northing % 1000;
  var centreeast =  oLIDAR.oGrid.easting % 1000;
  
  var bottom = Math.max(0, centrenorth - Math.round(iSize /2));
  var top =    Math.min(oLIDAR.DSM.LIDAR.length, centrenorth + Math.round(iSize /2));
  
  var left =  Math.max(0, centreeast - Math.round(iSize /2));
  var right = Math.min(oLIDAR.DSM.LIDAR[0].length, centreeast + Math.round(iSize /2));
  
  var DTMzone = oLIDAR.DTM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
  
  var DSMzone = oLIDAR.DSM.LIDAR.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
	
  var Heights = oLIDAR.Heights.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
  
  fs.writeFileSync("Heights.json", JSON.stringify(Heights, null, 0).replace(/\[/g,"\n["));
  fs.writeFileSync("DSMzone.json", JSON.stringify(DSMzone, null, 0).replace(/\[/g,"\n["));
  fs.writeFileSync("DTMzone.json", JSON.stringify(DTMzone, null, 0).replace(/\[/g,"\n["));
  
  // TODO: sort out toomany messages maybe by clearing area first
  client.chat('Clearing!.');
  client.chat('HELLO! IMPORTING LIDAR DATA INTO MINECRAFT PI EDITION. PLEASE ENJOY!.');
  client.chat('Area Cleared!.');
  
  var half = Math.round(iSize/2);
  
  //client.setBlocks(-1-half, MinY, -1-half, 1+half, 64,   1+half, client.blocks['GLASS']);
  client.setBlocks(0-half,  MinY,     0-half,  half,  MinY,   half, client.blocks['COBBLESTONE']);
  client.setBlocks(0-half,  MinY +1 , 0-half,  half,  MaxY,   half, client.blocks['AIR']);
  client.chat('Area Cleared!.');
  
  console.log("iMinHeight", oLIDAR.iMinHeight );
    
  for(var i = 0 ; i < DTMzone.length; i++){ //north direction
    for(var j = 0 ; j < DTMzone[0].length; j++){ //east direction
      var x = j - half;
      var z = i - half;    
      //var TerrainMCHeight = (DTMzone[i][j] - oLIDAR.iMinHeight) + MinY;
      var TerrainMCHeight = (DTMzone[i][j] - oLIDAR.iMinHeight) + MinY;
      var SurfaceMCHeight = TerrainMCHeight + Heights[i][j];
      
      client.setBlocks(x, MinY , z, x, TerrainMCHeight , z, client.blocks.GRASS);
      
      if(SurfaceMCHeight > TerrainMCHeight){
		//if(SurfaceMCHeight > TerrainMCHeight+1){
          client.setBlocks(x, TerrainMCHeight+1, z, x, SurfaceMCHeight, z, client.blocks.IRON_BLOCK);
	    //}else{
	      //client.setBlocks(x, TerrainMCHeight+1, z, x, SurfaceMCHeight, z, client.blocks.OBSIDIAN);
	    //}
      }
    }
    if(i % 10 == 0) {
      var message = 'i = '+i+ " z= "+ z;
      console.log(message);
      client.chat(message);
     
    }
  }
  
  console.log("Done");
  client.chat('Done');
  client.setPos(0, Math.round(oLIDAR.iMaxHeight - oLIDAR.iMinHeight) -60, 0);
  client.end();
 });

}
patch.load(doStuff);


  
  
