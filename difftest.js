var fs = require('fs');

var sSurfaceOut = "DSMtest.json";
var sTerrainOut = "DTMtest.json";

var DSM = JSON.parse(fs.readFileSync(sSurfaceOut).toString());
var DTM = JSON.parse(fs.readFileSync(sTerrainOut).toString());

var Diff = DSM.LIDAR.map(function(aRow, y){    
   return  aRow.map(function(iHeight, x){
       return iHeight - DTM.LIDAR[y][x];
   });   
});

var total = 0;
var BuildingCoverage = Diff.map(function(aRow, y){    
   var aBuilding = aRow.filter(function(iDiff, x){
       return iDiff > 0;
   });  
   total += aBuilding.length;
   return aBuilding.length;
});


    console.log("BuildingCoverage =", BuildingCoverage);

console.log("total =", total);
var coverage = Math.round((total/1000000) * 100);
console.log("coverage =", coverage ,"% of this square km is building");

//console.log("Diff =", Diff);
