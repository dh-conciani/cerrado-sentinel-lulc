// temporal filter - cerrado biome 
// dhemerson.costa@ipam.org.br

// set root directory 
var root = 'users/dh-conciani/collection7/0_sentinel/c1-general-post/';

// set file to be processed
var file_in = 'CERRADO_sentinel_gapfill_temporal_v8';

// set metadata to export 
var version_out = '9';

// import mapbiomas color ramp
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// import classification 
var inputClassification = ee.Image(root + file_in);

// remap all anthopogenic classes only to single-one [21]
var recipe = ee.Image([])
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
    .forEach(function(year_i) {
      // get year [i]
      var classification_i = inputClassification.select(['classification_' + year_i])
        // remap
        .remap([3, 4, 11, 12, 15, 19, 21, 25, 33],
               [3, 3, 3,   3, 21, 21, 21, 25, 33])
               .rename('classification_' + year_i);
               // insert into classification
               recipe = recipe.addBands(classification_i);
    });

// apply non-vegetated area filter in 2016
// create mask in the 1st year
var to_mask = recipe.select(['classification_2016']).eq(25)    
              .and(recipe.select(['classification_2017']).neq(25));
// apply 
var filtered_16 = inputClassification.select(['classification_2016'])
                  .where(to_mask.eq(1), inputClassification.select(['classification_2017']));

// plot
Map.addLayer(inputClassification.select(['classification_2016']), vis, 'un-filtered 2016', false);
Map.addLayer(inputClassification.select(['classification_2017']), vis, 'un-filtered 2017', false);
Map.addLayer(to_mask.randomVisualizer(), {}, 'mask 2016 nonveg', false);
Map.addLayer(filtered_16, vis, 'filtered 2016', false);

// create mask in the 2nd year
var to_mask2 = recipe.select(['classification_2017']).eq(25)    
              .and(recipe.select(['classification_2018']).neq(25));

var to_mask3 = recipe.select(['classification_2016']).eq(3)    
              .and(recipe.select(['classification_2017']).eq(21))             
              .and(recipe.select(['classification_2018']).eq(3));

// apply filter
var filtered_17 = inputClassification.select(['classification_2017'])
                  .where(to_mask3.eq(1), inputClassification.select(['classification_2018']))
                  .where(to_mask2.eq(1), inputClassification.select(['classification_2018']));

// plot
Map.addLayer(to_mask2.randomVisualizer(), {}, 'mask 2017 nonveg', false);
Map.addLayer(to_mask3.randomVisualizer(), {}, 'mask 2017 agro', false);
Map.addLayer(filtered_17, vis, 'filtered 2017', false);

// build output
var toExport = filtered_16
                  .addBands(filtered_17)
                  .addBands(inputClassification.select(['classification_2018']))
                  .addBands(inputClassification.select(['classification_2019']))
                  .addBands(inputClassification.select(['classification_2020']))
                  .addBands(inputClassification.select(['classification_2021']))
                  .addBands(inputClassification.select(['classification_2022']));

// export 
Export.image.toAsset({
    'image': toExport,
    'description': 'CERRADO_sentinel_gapfill_freq_temporal2x_v' + version_out,
    'assetId': root +  'CERRADO_sentinel_gapfill_freq_temporal2x_v' + version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': inputClassification.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
