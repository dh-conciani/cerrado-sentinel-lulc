// get stable pixels
var x = ee.Image('users/dh-conciani/collection7/0_sentinel/c1-general-post/CERRADO_sentinel_gapfill_freq_temporal_spatial_12');

// get stable pixels
var nClasses = x.reduce(ee.Reducer.countDistinctNonNull());
var stable = x.select(0).multiply(nClasses.eq(1));

// import the color ramp module from mapbiomas 
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// plot
Map.addLayer(stable.selfMask(), vis, 'stable');
