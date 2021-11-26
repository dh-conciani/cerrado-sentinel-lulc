// import cerrado
var cerrado = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster');

// read collection
var collection = ee.Image('users/dhconciani/sentinel-beta/sentinel-classification/CERRADO_sentinel_gapfill_wetfor_spatial_freq_v31')
                  .updateMask(cerrado.eq(4));
                  
// read collection 6
var col6 = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1')
            .updateMask(cerrado.eq(4));
            
// import sentinel 
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics')
    .filterMetadata('year', 'equals', year)
    .filterMetadata('version', 'equals', '1')
    .filterMetadata('biome', 'equals', 'CERRADO')
    .mosaic()
    .updateMask(cerrado.eq(4));
                  
// import mapbiomas pallete
// import the color ramp module from mapbiomas 
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// plot sentinel mosaic
Map.addLayer(mosaic, {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
}, 'Sentinel ' + year, true);
