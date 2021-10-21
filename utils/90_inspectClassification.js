// import cerrado
var biomes = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster');

// inspect classification result
var year = 2020;

// define inputs
var mosaic = 'projects/nexgenmap/MapBiomas2/SENTINEL/mosaics';
var classification = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO/SENTINEL/classification_sentinel';
var classification_version = '2';

var col6 = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1');
var landsat =  'projects/nexgenmap/MapBiomas2/LANDSAT/mosaics';
var sentinel_grid = ee.FeatureCollection('users/joaovsiqueira1/sentinel-2-acquisition-plans');


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
var gapfill = ee.Image(classification + '/' + 'CERRADO_sentinel_gapfill_v' + classification_version)
              .select(['classification_' + year])
              .updateMask(biomes.eq(4));
              
var wetland = ee.Image(classification + '/' + 'CERRADO_sentinel_gapfill_wetland_v' + classification_version)
              .select(['classification_' + year])
              .updateMask(gapfill);
              
var temporal = ee.Image(classification + '/' + 'CERRADO_sentinel_gapfill_wetland_temporal_v' + classification_version)
              .select(['classification_' + year])
              .updateMask(gapfill);
              
var spatial = ee.Image(classification + '/' + 'CERRADO_sentinel_gapfill_wetland_temporal_spatial_v' + classification_version)
              .select(['classification_' + year])
              .updateMask(gapfill);
              
var freq = ee.Image(classification + '/' + 'CERRADO_sentinel_gapfill_wetland_temporal_spatial_freq_v' + classification_version)
              .select(['classification_' + year])
              .updateMask(gapfill);
              
// import col6
var col6 = col6.select(['classification_' + year])
            .updateMask(gapfill);
            
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
}, 'Sentinel ' + year, true);

// Plot Landsat
Map.addLayer(landsat, {
        bands: ['swir1_median', 'nir_median', 'red_median'],
        gain: [0.08, 0.07, 0.2],
        gamma: 0.85
    },
    'Landsat ' + year, false);

// plot col6
Map.addLayer(col6, vis, 'Collection 6.0 ' + year, false);

// plot classification 
Map.addLayer(gapfill, vis, 'gapfill ' + year, false);
Map.addLayer(wetland, vis, 'gapfill+wetland ' + year, false);
Map.addLayer(temporal, vis, 'gapfill+wetland_temporal ' + year, false);
Map.addLayer(spatial, vis, 'gapfill+wetland+temporal+spatial ' + year, false);
Map.addLayer(freq, vis, 'gapfill+wetland+temporal+spatial+freq ' + year);
Map.addLayer(sentinel_grid, {}, 'grid sentinel');
