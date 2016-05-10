var fs = require('fs');
var LIDAR = require("./lidardata.js");
var Minecraft = require('minecraft-pi');
var Blocks = require('minecraft-pi/lib/blocks.json');

var commandLineArgs = require('command-line-args');
 
var cli = commandLineArgs([

  //{ name: 'list_blocks', alias: 'l', type: Boolean, defaultValue: false },
  { name: 'gridref', type: String, alias:'g', defaultOption: true, defaultValue:'SK 35526 86610' },
  { name: 'build', alias: 'b', type: Boolean, defaultValue: false},
  { name: 'terrain_block', alias: 't', type: Number, defaultValue: Blocks.GRASS, description: "Blocks Types are "+JSON.stringify(Blocks, null, 0).replace(/,/g,", ").replace("{","").replace("}","")},
  { name: 'surface_block', alias: 's', type: Number, defaultValue: Blocks.IRON_BLOCK},
  { name: 'quarter', alias: 'q', type: Number, defaultValue: 0},
  { name: 'size', alias: 'i', type: Number, defaultValue: 128},
  { name: 'help', alias: 'h', type: Boolean, defaultValue: false },
  { name: 'list_knownrefs', alias: 'k', type: Boolean, defaultValue: false },

]);


var options = cli.parse();

if(options.help){
	console.log(cli.getUsage());	
	process.exit();
}

var iSize = options.size;

if(options.list_knownrefs){
    var knowns = [
	"SK 35526 86610  UTC Sheffield",
	"TQ 32088 81232  St Pauls Cathedral",
	"SK 35295 86079  Brammal Lane", 
	"TQ 32261 79492  Westminster",
	"TQ 31674 80704  Bridges on the Thames",
	"SK 35393 87144  Peace Gardens",
	"SK 38530 71173  Church of St Mary Chesterfield",
	"TQ 30627 79939  London Eye"
    ];
    console.log(knowns);
	process.exit();
}

if(options.list_blocks){
	console.log(Blocks);
	process.exit();
}


var patch = new LIDAR(options.gridref);
patch.rounded = true;
const MinY = -64;
const MaxY = 64;
2
function doStuff(){
 console.log("LIDAR Loaded");
 var oLIDAR = this;
  //console.log(oLIDAR);

  var qx = options.quarter % 2;
  var qz = Math.floor(options.quarter / 2);
  var cx = 0-(128/2)+(qx * 128);
  var cz = 0-(128/2)+(qz * 128);

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

  if(patch.rounded){	
   var Heights = oLIDAR.Heights.slice(bottom, top).map(function(line){
		return line.slice(left,right);
	});
  }

  fs.writeFileSync("Heights.json", JSON.stringify(Heights, null, 0).replace(/\[/g,"\n["));
  fs.writeFileSync("DSMzone.json", JSON.stringify(DSMzone, null, 0).replace(/\[/g,"\n["));
  fs.writeFileSync("DTMzone.json", JSON.stringify(DTMzone, null, 0).replace(/\[/g,"\n["));

var pad = "   ";
if(options.build == false){
 var Out = DSMzone.map(function(line){
	return line.map(function(num){
		var str = num.toString();
		return pad.substring(0, pad.length - str.length) + str
	}).join(" ");
 }).join("\n");
 console.log(Out);
 //console.log("Out", Out, "Heights", Heights, "DSMzone",DSMzone, "DTMzone",DTMzone);
 fs.writeFileSync("data.txt", Out);
 console.log("DSM Data Saved to data.txt");

}else{

  var client = new Minecraft('localhost', 4711, function() {
  // Use the client variable to play with the server!   
  
  // TODO: sort out toomany messages maybe by clearing area first
  client.chat('HELLO! IMPORTING LIDAR DATA INTO MINECRAFT PI EDITION. PLEASE ENJOY!.');
  
  var half = Math.round(iSize/2);
  
  client.setPos(cx, Math.round(oLIDAR.iMaxHeight - oLIDAR.iMinHeight) + MinY +10, cz);

  client.chat('Clearing!.');
  client.setBlocks(cx-half,  MinY,     cz-half,  half,  MinY,   cx+half, client.blocks['COBBLESTONE']);
  client.setBlocks(cx-half,  MinY +1 , cz-half,  half,  MaxY,   cz+half, client.blocks['AIR']);
  client.chat('Area Cleared!.');
  
  console.log("iMinHeight", oLIDAR.iMinHeight );
    
  for(var i = 0 ; i < DTMzone.length; i++){ //north direction
    for(var j = 0 ; j < DTMzone[0].length; j++){ //east direction
      var x = cx + j - half;
      var z = cz + i - half;    
      var TerrainMCHeight = (DTMzone[i][j] - oLIDAR.iMinHeight) + MinY;
      var SurfaceMCHeight = TerrainMCHeight + Heights[i][j];
      
      client.setBlocks(x, MinY , z, x, TerrainMCHeight , z, options.terrain_block);
      
      if(SurfaceMCHeight > TerrainMCHeight){
               client.setBlocks(x, TerrainMCHeight+1, z, x, SurfaceMCHeight, z, options.surface_block);
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
  client.setPos(cx, Math.round(oLIDAR.iMaxHeight - oLIDAR.iMinHeight) + MinY +10, cz);
  client.end();
 });
}
}
patch.load(doStuff);


  
  
