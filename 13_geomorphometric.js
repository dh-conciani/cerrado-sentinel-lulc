// -- -- -- -- 13_geomorphometric
// post-processing filter:removes wetland areas located in regions with slopes greater than 10 degrees.
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br

// Import mapbiomas color schema 
var vis = {
    min: 0,
    max: 62,
    palette:require('users/mapbiomas/modules:Palettes.js').get('classification8'),
    bands: 'classification_2017'
};

// Set the root directory and output directory
var root = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';
var out = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';

// Metadata
var inputVersion = '6';
var outputVersion = '4';

// Define thr input file 
var inputFile = 'CERRADO_S2-C1_gapfill_v10_segmentation_v10_frequency_v6_temporal_v18_noFalseRegrowth_v' + inputVersion;

// Load the land cover classification image
var classification = ee.Image(root + inputFile);
print("Input file:", classification);
Map.addLayer (classification, vis, 'classification');

// Classification regions layer
var regions_img = ee.Image(1).clip(ee.FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2'));

// MERIT DEM: Multi-Error-Removed Improved-Terrain data
var dem = ee.Image("MERIT/DEM/v1_0_3").select('dem').updateMask(regions_img);

// Calculates slope in degrees using the 4-connected neighbors of each pixel
var slope = ee.Terrain.slope(dem);  

// Convert slope from degrees to percentage
var slopePercent = slope.expression(
  'tan(3.141593/180 * degrees)*100', {
    'tan': slope.tan(),
    'degrees': slope
  }).rename('slope').toInt16();
  
Map.addLayer(slopePercent, {min: 0, max: 15, palette: ["577590", "43aa8b", "90be6d", "f9c74f", "f8961e", "f3722c", "f94144"]}, 'Slope');

// Initialize an empty image to store the filtered classification data
var filtered = ee.Image([]);

// Loop through each year in the classification and apply the filter
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo()
    .forEach(function(year) {
      
      // Select the classification for the current year
      var collection_i = classification.select(['classification_' + year]);
      
      // Create a kernel for neighborhood analysis (Manhattan distance, 24-pixel radius)
      var kernel = ee.Kernel.manhattan({'radius': 24, 'units': 'pixels'});
      
      // Apply the mode filter to get the most common land cover within the neighborhood
      var mode = collection_i.reduceNeighborhood({
        reducer: ee.Reducer.mode(),
        kernel: kernel
      }).reproject('EPSG:4674', null, 10);
      
       // Replace wetland class (11) in areas with slopes greater than 10 degrees by the mode of the neighborhood
      var collection_p = collection_i.blend(collection_i.where(collection_i.eq(11).and(slopePercent.gte(10)), mode));

      filtered = filtered.addBands(collection_p.updateMask(collection_p.neq(0)));
 
  });

Map.addLayer(filtered, vis, 'Filtered');

// Write metadata
filtered = filtered.set('5-geomorphometric', outputVersion)
                    .copyProperties(classification);

print('Output classification', filtered);

// Export to a GEE asset
Export.image.toAsset({
    'image': filtered,
    'description': inputFile + '_geomorpho_v' + outputVersion,
    'assetId': root +  inputFile + '_geomorpho_v' + outputVersion,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region':filtered.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
