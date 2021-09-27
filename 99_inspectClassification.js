
// inspect classification result
var year = 2020;

// define inputs
var mosaic = 'projects/nexgenmap/MapBiomas2/SENTINEL/mosaics';
var classification = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO/SENTINEL/classification_sentinel';
var col6 = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1');
var landsat =  'projects/nexgenmap/MapBiomas2/LANDSAT/mosaics';

// import the color ramp module from mapbiomas 
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// import mosaic 
var mosaic = ee.ImageCollection(mosaic)
    .filterMetadata('year', 'equals', year)
    .filterMetadata('version', 'equals', '1')
    .filterMetadata('biome', 'equals', 'CERRADO')
    .mosaic();

// import classification
var classification = ee.ImageCollection(classification)
    .filterMetadata('year', 'equals', year)
    .filterMetadata('version', 'equals', 1)
    .mosaic();

// import col6
var col6 = col6.select(['classification_' + year])
            .updateMask(classification);
            
// import landsat mosaic
var landsat = ee.ImageCollection(landsat)
    .filterMetadata('year', 'equals', year)
    .filterMetadata('biome', 'equals', 'CERRADO')
    .filterMetadata('version', 'equals', '2')
    .mosaic();
    
// plot sentinel mosaic
Map.addLayer(mosaic, {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
}, 'Sentinel ' + year);

// Plot Landsat
Map.addLayer(landsat, {
        bands: ['swir1_median', 'nir_median', 'red_median'],
        gain: [0.08, 0.07, 0.2],
        gamma: 0.85
    },
    'Landsat ' + year);

// plot col6
Map.addLayer(col6, vis, 'Collection 6.0 ' + year);

// plot classification 
Map.addLayer(classification, vis, 'Collection Sentinel ' + year);
