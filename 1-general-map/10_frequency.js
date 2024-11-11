// -- -- -- -- 10_frequency
// post-processing filter: stabilize areas of native vegetation that have remained for at least 85% of the data time series
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br

// Import mapbiomas color schema 
var vis = {
    min: 0,
    max: 62,
    palette:require('users/mapbiomas/modules:Palettes.js').get('classification8'),
    bands: 'classification_2017'
};

// Set root directory 
var root = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';
var out = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';

// Set metadata
var inputVersion = '10';
var outputVersion = '6';

// Define input file
var inputFile = 'CERRADO_S2-C1_gapfill_v10_segmentation_v'+inputVersion;

// Load classification
var classification = ee.Image(root + inputFile);
print('Input classification', classification);
Map.addLayer(classification, vis, 'Input classification');

// Define the function to calculate the frequencies 
var filterFreq = function(image) {
  // Expression to get frequency
  var exp = '100*((b(0)+b(1)+b(2)+b(3)+b(4)+b(5)+b(6)+b(7))/8)';

  // Get per class frequency 
  var forest = image.eq(3).expression(exp);
  var savanna = image.eq(4).expression(exp);
  var wetland = image.eq(11).expression(exp);
  var grassland = image.eq(12).expression(exp);

  // Select pixels that were native vegetation in at least 85% of the time series
  var stable_native = ee.Image(0).where(forest
                                   .add(savanna)
                                   .add(wetland)
                                   .add(grassland)
                                   .gte(85), 1);
                                   
  // Stabilize native class when:
  var filtered = ee.Image(0).where(stable_native.eq(1).and(forest.gte(70)), 3)      // needs to occur at least 5 years
                            .where(stable_native.eq(1).and(wetland.gte(85)), 11)    // needs to occur at least 6 years
                            .where(stable_native.eq(1).and(savanna.gt(40)), 4)      // needs to occur at least 3 years
                            .where(stable_native.eq(1).and(grassland.gt(50)), 12);  // needs to occur at least 4 years

  // Get only pixels to be filtered
  filtered = filtered.updateMask(filtered.neq(0));
  
  return image.where(filtered, filtered);
};

// Apply function  
var classification_filtered = filterFreq(classification);

// Check filtered image
Map.addLayer(classification_filtered, vis, 'filtered');

// Write metadata
classification_filtered = classification_filtered.set('2-frequency', outputVersion)
                                                 .copyProperties(classification);
print('Output classification', classification_filtered);

// Export as GEE asset
Export.image.toAsset({
    'image': classification_filtered,
    'description': inputFile + '_frequency_v' + outputVersion,
    'assetId': out +  inputFile + '_frequency_v' + outputVersion,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region':classification_filtered.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
