// pseudo-integrate preliminar Cerrado sentinel classification with collection 6.0 cross-cutting themes
// dhemerson.conciani@ipam.org.br

// load mapbiomas assets
var public_col6 = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1');
var prelim_sentinel = ee.Image('projects/mapbiomas-workspace/AUXILIAR/CERRADO/SENTINEL/classification_sentinel/CERRADO_sentinel_gapfill_wetland_temporal_spatial_freq_v2');

// define export parameters
var dir = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO/SENTINEL/classification_sentinel/';
var file = 'CERRADO_sentinel_pseudo_v2';

// list of years to be pseudo-integrated
var years_list = ['2016', '2017', '2018', '2019', '2020'];

// load mapbiomas palette module
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// create empty files to receive data
var recipe = ee.Image([]);  // recipe to concatenate pseudo-integration time-series
var col6_i = ee.Image([]);  // empty object to receive yearly col5 data
var sentinel_i = ee.Image([]);  // empty object to receive yearly sentinel

// for each year
years_list.forEach(function(process_year) {
   // read data for the year [i]
    sentinel_i = prelim_sentinel.select('classification_' + process_year);
    col6_i = public_col6.select('classification_' + process_year)
             .updateMask(sentinel_i);
             
    // pseudo-integrate cross-cutting themes from collection 6 into sentinel beta
    sentinel_i = sentinel_i.blend(col6_i.updateMask(col6_i.eq(9)))      // forestry
                   .blend(col6_i.updateMask(col6_i.eq(15)))     // pasture
                   .blend(col6_i.updateMask(col6_i.eq(18)))     // agriculture
                   .blend(col6_i.updateMask(col6_i.eq(19)))     // temporary-crop
                   .blend(col6_i.updateMask(col6_i.eq(20)))     // sugar-cane
                   .blend(col6_i.updateMask(col6_i.eq(24)))     // urban-infrastructure
                   .blend(col6_i.updateMask(col6_i.eq(30)))     // mining
                   .blend(col6_i.updateMask(col6_i.eq(31)))     // aquaculture
                   .blend(col6_i.updateMask(col6_i.eq(36)))     // perennial crop
                   .blend(col6_i.updateMask(col6_i.eq(39)))     // soybean
                   .blend(col6_i.updateMask(col6_i.eq(41)))
                   .blend(col6_i.updateMask(col6_i.eq(46)))
                   .blend(col6_i.updateMask(col6_i.eq(47)))
                   .blend(col6_i.updateMask(col6_i.eq(48)));   
  
    // stack pseudo-integratated data as a new band into recipe 
    recipe = recipe.addBands(sentinel_i);
});

// plot data
Map.addLayer(col6_i, vis, 'col6 2019');
Map.addLayer(sentinel_i, vis, 'sentinel 2019');
//Map.addLayer(cerrado_col6.select(['classification_2019']), vis, 'raw');

// print pseudo-integrated dataset
print (recipe);

// export as asset 
Export.image.toAsset({
    'image': recipe,
    'description': file,
    'assetId': dir + file,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': col6_i.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});

//Map.addLayer(recipe.select(['classification_2019']), vis, 'post int');
//Map.addLayer(prelim_col6.select(['classification_2019']), vis, 'pre int');
//Map.addLayer(image.updateMask(image.eq(14)));
