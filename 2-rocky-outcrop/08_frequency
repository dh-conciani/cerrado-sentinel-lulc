// --- --- --- 08_frequency
// post-processing filter: stabilize areas of rocky outcrop that have remained for at least 50% of the data time series
// barbara.silva@ipam.org.br 

// Import Mapbiomas color schema 
var vis = {
    min: 0,
    max: 62,
    palette:require('users/mapbiomas/modules:Palettes.js').get('classification8'),
    bands: 'classification_2023'
};

// Set metadata 
var input_version = '1';
var output_version = '4';

// Set root directory 
var input = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/CERRADO_col2_rocky_gapfill_v1_seg_v' + input_version;
var dirout = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/';

// load classification
var classification = ee.Image(input);
print ("Input classification", classification);
Map.addLayer(classification, vis, 'classification');

// Define the function to calc frequencies 
var filterFreq = function(image) {
     // Expression to get frequency
     var exp = '100*((b(0)+b(1)+b(2)+b(3)+b(4)+b(5)+b(6)+b(7))/8)';
    
    // Get per class frequency 
    var rocky = image.eq(29).expression(exp);
    Map.addLayer(rocky, {palette:['purple', 'red', 'orange', 'yellow', 'green', 'darkgreen'], min:20, max:70}, 'frequency');
    
    // Stabilize rocky when:
    var filtered = ee.Image(0).where(rocky.gte(50), 29)
                              .where(rocky.lt(50), 99);
    
    // Get only pixels to be filtered
    filtered = filtered.updateMask(filtered.neq(0));

    return image.where(filtered, filtered);
};

// Apply function  
var classification_filtered = filterFreq(classification);

// Plot frequency filter result
Map.addLayer(classification_filtered, vis, 'classification_filtered');
print ('Output classification', classification_filtered);

// Adjust rocky outcrop comission with collection 9 dataset
var cerrado = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-raster-41').eq(4);
var collection_9 = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1')
                  .updateMask(cerrado)
                  .slice(31,39);

var old_values = [3, 4, 5, 6, 49, 11, 12, 32, 29, 50, 15, 19, 39, 20, 40, 62, 41, 36, 46, 47, 35, 48, 21, 9, 23, 24, 30, 25, 33, 31];
var new_values = [3, 4, 3, 3,  3, 11, 12, 12, 29, 12, 15, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 21, 9, 23, 24, 30, 25, 33, 33];

old_values.forEach(function(value, i) {
  collection_9 = collection_9.where(collection_9.eq(value), new_values[i]);
});

var filtered = classification_filtered.where(
  classification_filtered.eq(29)
    .and(collection_9.neq(29))
    .and(collection_9.neq(23))
    .and(collection_9.neq(25)), 99
);

Map.addLayer(filtered, vis, 'filtered');

// Export as GEE asset
Export.image.toAsset({
    'image': filtered,
    'description': 'CERRADO_col2_rocky_gapfill_v1_seg_v1_frequency_v' + output_version,
    'assetId': dirout + 'CERRADO_col2_rocky_gapfill_v1_seg_v1_frequency_v' + output_version,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': filtered.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
