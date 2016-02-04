
function processLIDARine(sText){
  var aStrings = sText.trim().split(/\s+/);  
  //console.log("aStrings =", aStrings);
  var aNumbers = aStrings.map(function(sNum){
      return Math.round(parseFloat(sNum));
  });
  return aNumbers;
}

function processFile(inputFile, outFile) {
  var oSurfaceData = {LIDAR:[]};

    var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);
     
    rl.on('line', function (line) {
        if(line.length < 1000) {
          //one of the metadatalines
          //console.log(line);
          var aMeta = line.split(/\s+/);
          oSurfaceData[aMeta[0]] = aMeta[1];
        } else {
          //data
          
          var aCleanLIDAR = processLIDARine(line);
          oSurfaceData.LIDAR.push(aCleanLIDAR);
        }
    });
    
    rl.on('close', function (line) {
        //console.log(line);
        console.log('done reading file.');
        fs.writeFileSync(outFile, JSON.stringify(oSurfaceData));
        
        console.log('done writing file',outFile);
        //console.log("oSurfaceData =", oSurfaceData);

    });
}

var sSurfaceFilename = "data/sk3586_DSM_1m.asc";
var sSurfaceOut = "DSMtest.json";
processFile(sSurfaceFilename, sSurfaceOut);


var sTerrainFilename = "data/sk3586_DTM_1m.asc"
var sTerrainOut = "DTMtest.json";
processFile(sTerrainFilename, sTerrainOut);


