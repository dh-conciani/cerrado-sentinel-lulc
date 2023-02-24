// frequency filter 
// dhemerson.costa@ipam.org.br

// define root 
var root = 'users/dh-conciani/collection7/0_sentinel/c1-general-post/';

// define input file 
var file_in = 'CERRADO_sentinel_gapfill_v2';

// define output version 
var version_out = 5;

// load classification
var classification = ee.Image(root + file_in);

// import mapbiomas color ramp 
var vis = {
      min: 0,
      max: 49,
      palette:require('users/mapbiomas/modules:Palettes.js').get('classification6'),
    };

// define the function to calc frequencies 
var filterFreq = function(image) {
  // expression to get frequency
  var exp = '100*((b(0)+b(1)+b(2)+b(3)+b(4)+b(5)+b(6))/7)';

  // get per class frequency 
  var forest = image.eq(3).expression(exp);
  var savanna = image.eq(4).expression(exp);
  var wetland = image.eq(11).expression(exp);
  var grassland = image.eq(12).expression(exp);

  // select pixels that were native vegetation at least 95% of the time series
  var stable_native = ee.Image(0).where(forest
                                   .add(savanna)
                                   .add(wetland)
                                   .add(grassland)
                                   .gte(40), 1);
                                   
  // stabilize native class when:
  var filtered = ee.Image(0).where(stable_native.eq(1).and(forest.gte(1)), 3)      // need to occurs in at least 5 years
                            .where(stable_native.eq(1).and(wetland.gte(85)), 11)    //need to occurs in at least 6 years
                            .where(stable_native.eq(1).and(savanna.gt(40)), 4)      // if savanna occurs in at least 3 years
                            .where(stable_native.eq(1).and(grassland.gt(50)), 12);  // 

  // get only pixels to be filtered
  filtered = filtered.updateMask(filtered.neq(0));
  
  return image.where(filtered, filtered);
};

// apply function  
var classification_filtered = filterFreq(classification);

// plot
Map.addLayer(classification.select(['classification_2021']), vis, 'classification');
Map.addLayer(classification_filtered.select(['classification_2021']), vis, 'filtered');
Map.addLayer(classification, {}, 'cl', false)
Map.addLayer(classification_filtered, {}, 'cl-f', false)

// export as GEE asset
Export.image.toAsset({
    'image': classification_filtered,
    'description': 'CERRADO_sentinel_gapfill_freq_v' + version_out,
    'assetId': root + 'CERRADO_sentinel_gapfill_freq_v' + version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': classification.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
