//define mosaic input 
var mosaic = ee.ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')
  .filterMetadata('biome', 'equals', 'CERRADO')
  .filterMetadata('year', 'equals', 2023)
  .mosaic()

// normalized differecen vegetation index
var getNDVI = function(image) {
  var x = image.select('nir_median').subtract(image.select('red_median'))
  var y = image.select('nir_median').add(image.select('red_median'))
  var z = x.divide(y)
  return z.rename('ndvi')
};

// normalized difference built-up index
var getNDBI = function(image) {
  var x = image.select('swir1_median').subtract(image.select('nir_median'))
  var y = image.select('swir1_median').add(image.select('nir_median'))
  var z = x.divide(y)
  return z.rename('ndbi')
};

// normalized difference water index
var getNDWI = function(image) {
  var x = image.select('nir_median').subtract(image.select('swir1_median'))
  var y = image.select('nir_median').add(image.select('swir1_median'))
  var z = x.divide(y)
  return z.rename('ndwi')
};

// normalized difference water index
var getMNDWI = function(image) {
  var x = image.select('green_median').subtract(image.select('swir1_median'))
  var y = image.select('green_median').add(image.select('swir1_median'))
  var z = x.divide(y)
  return z.rename('mndwi')
};

// normalized difference water index
var getPRI = function(image) {
  var x = image.select('blue_median').subtract(image.select('green_median'))
  var y = image.select('blue_median').add(image.select('green_median'))
  var z = x.divide(y)
  return z.rename('pri')
};

// cellulose absorption index 
var getCAI = function(image) {
  var x = image.select('swir2_median').divide(image.select('swir1_median'))
  return x.rename('cai')
};

// green chlorofyll vegetation index 
var getGCVI = function(image) {
  var x = image.select('nir_median').divide(image.select('green_median'))
  var y = x.subtract(1)
  return y.rename('gcvi')
}

// enchanced vegetation index 2
var getEVI2 = function(image) {
  var x = image.select('nir_median').subtract(image.select('red_median'))
  var yi = image.select('red_median').multiply(2.4)
  yi = yi.add(image.select('nir_median')).add(1)
  var zi = x.divide(yi).multiply(2.5)
  return zi.rename('evi2')
}

// soil adjusted vegetation index
var getSAVI = function(image) {
  var x = image.select('nir_median').subtract(image.select('red_median'))
  var y = image.select('nir_median').add(image.select('red_median')).add(0.5)
  var z = x.divide(y).multiply(1.5)
  return z.rename('savi')
}

// normalized difference phenology index
var getNDPI = function(image) {
  var xi = image.select('red_median').multiply(0.74)
  var xj = image.select('swir1_median').multiply(0.26)
  var xij = xi.add(xj)
  var x = image.select('nir_median').subtract(xij)
  var y = image.select('nir_median').add(xij)
  var z = x.divide(y)
  return (z.rename('ndpi'))
}

/////// specific for sentinel-2

// normalized differecen vegetation index with red edge 
var getNDVIRED = function(image) {
  var x = image.select('red_edge_1_median').subtract(image.select('red_median'))
  var y = image.select('red_edge_1_median').add(image.select('red_median'))
  var z = x.divide(y)
  return z.rename('ndvired')
};

// vegetation index 700nm
var getVI700 = function(image) {
  var x = image.select('red_edge_1_median').subtract(image.select('red_median'))
  var y = image.select('red_edge_1_median').add(image.select('red_median'))
  var z = x.divide(y)
  return z.rename('VI700')
}

// inveted red-edge chlorophyll index 
var getIRECI = function(image) {
  var x = image.select('red_edge_3_median').subtract(image.select('red_median'))
  var y = image.select('red_edge_1_median').divide(image.select('red_edge_2_median'))
  var z = x.divide(y)
  return z.rename('IRECI')
}

// chlorofyll index red edge
var getCIRE = function(image) {
  var x = image.select('nir_median').divide(image.select('red_edge_1_median')).subtract(1)
  return x.rename('cire')
}

// transformed chlorophyll absorption in reflectance index.
var getTCARI = function(image) {
  var xi = image.select('red_edge_1_median').subtract(image.select('red_median'))
  var xj = image.select('red_edge_1_median').subtract(image.select('green_median'))
  var xk = image.select('red_edge_1_median').divide(image.select('red_median'))
  xj = xj.multiply(0.2)
  var xl = xi.subtract(xj)
  var xm = xl.multiply(xk).multiply(3)
  return xm.rename('tcari')
}

// spectral feature depth vegetation index
var getSFDVI = function(image) {
  var x = image.select('green_median').add(image.select('nir_median'))
  x = x.divide(2)
  var y = image.select('red_median').add(image.select('red_edge_1_median'))
  y = y.divide(2)
  var z = x.subtract(y)
  return z.rename('sfdvi')
}

// normalized difference red edge index 
var getNDRE = function(image) {
  var x = image.select('nir_median').subtract(image.select('red_edge_1_median'))
  var y = image.select('nir_median').add(image.select('red_edge_1_median'))
  var z = x.divide(y)
  return z.rename('NDRE')
}

var a = getNDRE(mosaic)
Map.addLayer(a, {palette: ['black', 'white'], min:-0.1, max: 0.9})






