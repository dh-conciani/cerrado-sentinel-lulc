//define mosaic input 
var mosaic = ee.ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')
  .filterMetadata('biome', 'equals', 'CERRADO')
  .filterMetadata('year', 'equals', 2023)
  .mosaic()
  
var getNDVI = function(image) {
  var x = image.select('nir_median').subtract(image.select('red_median'))
  var y = image.select('nir_median').add(image.select('red_median'))
  var z = x.divide(y)
  return z
};

var a = getNDVI(mosaic)

Map.addLayer(a)

