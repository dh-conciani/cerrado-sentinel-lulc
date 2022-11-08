// stabilize temporal patches of native vegetation 
// dhemerson.costa@ipam.org.br

// set root directory 
var root = 'users/dh-conciani/collection7/0_sentinel/c1-general-post/';

// set file to be processed
var file_in = 'CERRADO_col1_gapfill_v1';

// set metadata to export 
var version_out = '10';

// import mapbiomas color ramp
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// import classification 
var inputClassification = ee.Image(root + file_in);

Map.addLayer(inputClassification.select(['classification_2021']), vis, 'data 2021');

// create recipe 
var binary = ee.Image([]);
// binarize native vegetation
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
  .forEach(function(year_i) {
    var image_i = inputClassification.select(['classification_' + year_i])
                                 .remap([3, 4, 11, 12, 15, 19, 21, 25, 33],
                                        [1, 1,  1,  1,  0,  0,  0,  0,  0])
                                        .rename('binary_' + year_i);
    // bind
    binary = binary.addBands(image_i.updateMask(image_i.eq(1)));
  });

// plot
Map.addLayer(binary, {}, 'binary', false);
Map.addLayer(inputClassification, {}, 'input', false);
//Map.addLayer(inputClassification.reduce(ee.Reducer.countDistinctNonNull()).randomVisualizer());

// update collection only with native vegetation temporal patches
var patches = ee.Image([]);
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
  .forEach(function(year_i) {
    // get classification
    var image_i = inputClassification.select(['classification_' + year_i])
      // select only native vegetation pixels
      .updateMask(binary.select(['binary_' + year_i]).eq(1))
        // rename
        .rename('native_' + year_i);
    // bind
    patches = patches.addBands(image_i);
  });
  
// get the mode for the native vegetation temporal patches
var native_mode = patches.reduce(ee.Reducer.mode());
Map.addLayer(native_mode, vis, 'native mode', false);

// get the frequency of savanna class
var exp = '100*((b(0)+b(1)+b(2)+b(3)+b(4)+b(5)+b(6))/7)';
// get frequency
var savanna_freq = inputClassification.eq(4).expression(exp);
//Map.addLayer(savanna_freq.randomVisualizer())

// create filtered recipe
var filtered = ee.Image([]);

// apply mode for the temporal patches of native vegetation
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
  .forEach(function(year_i) {
    var image_i = inputClassification.select(['classification_' + year_i])
                    // replace native vegetation by the mode
                    .where(binary.select(['binary_' + year_i]).eq(1), native_mode)
                    // when mode is wetland but savanna appears in at least 40% of the time, keep savanna in years with NV
                    .where(binary.select(['binary_' + year_i]).eq(1).and(native_mode.eq(11))
                                                                    .and(savanna_freq.gt(40)), 4);
  // bind
  filtered = filtered.addBands(image_i);
  });
  
// plot filtered
Map.addLayer(filtered.select(['classification_2021']), vis, 'filtered 2021');
Map.addLayer(filtered, {}, 'all', false);

// export as GEE asset
Export.image.toAsset({
    'image': filtered,
    'description': 'CERRADO_sentinel_gapfill_stab_v' + version_out,
    'assetId': root + 'CERRADO_sentinel_gapfill_stab_v' + version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': inputClassification.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
