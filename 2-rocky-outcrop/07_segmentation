// -- -- -- -- 07_segmentation
// Post-processing filter: Apply Sentinel-2 mosaics segmentation to refine the land cover classification.
// This process applies a mode filter to the classification, based on the Sentinel-derived segments.
// barbara.silva@ipam.org.br

// Import mapbiomas color schema 
var vis = {
    min: 0, 
    max: 62, 
    palette: require('users/mapbiomas/modules:Palettes.js').get('classification8'),
    bands: 'classification_2023'  
};

// Define root and output directories
var root = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/';
var out = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/';

// Metadata 
var inputVersion = '1';
var outputVersion = '1';

// Load the gap-filled classification data for the Cerrado biome
var classification = ee.Image(root + 'CERRADO_col2_rocky_gapfill_v'+inputVersion);
Map.addLayer(classification, vis, 'classification');

// Load the segmentation image and mask it using the classification data
var segments = ee.Image('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/CERRADO_S2-C1_getSeg_v5').updateMask(classification);
print('Segments input:', segments);

Map.addLayer(segments.select(['segments_2023']).randomVisualizer(), {}, 'Segmentation');

// Define the range of years to process
var years = ee.List.sequence(2016, 2023).getInfo();

// Function to apply the mode filter to classification data for each year
var applyModePerYear = function(year) {
  
  // Select the bands for the given year
  var classBand = classification.select('classification_' + year);
  var segmentBand = segments.select('segments_' + year);
  
  // Combine the classification and segmentation, and apply a mode filter within each segment
  // This assigns the most frequent (mode) classification value within each segment
  var mode = segmentBand.addBands(classBand)
    .reduceConnectedComponents({
      reducer: ee.Reducer.mode(),  
      labelBand: 'segments_' + year
    })
    .reproject('EPSG:4326', null, 10);

  // Return the mode-filtered classification for this year
  return mode;
};

// Apply the mode filter function over all the years and store the results in a list
var modePerYearList = years.map(applyModePerYear);

// Convert the list of yearly mode-filtered images into an ImageCollection, and then convert it into a multi-band image
var modePerYearImage = ee.ImageCollection(modePerYearList)
  .toBands()
  .rename(years.map(function(year) {
    return 'classification_' + year;
  }));

Map.addLayer(modePerYearImage, vis, 'classification + segmentation');

// Ensure the output image is stored as 8-bit integer format (int8) and set relevant metadata
modePerYearImage = modePerYearImage.int8()
                                   .set('1-segmentation', outputVersion)  
                                   .copyProperties(classification);

print('Mode classification:', modePerYearImage);

// Export to a GEE asset
Export.image.toAsset({
    'image': modePerYearImage, 
    'description': 'CERRADO_col2_rocky_gapfill_v1_seg_v' + outputVersion,
    'assetId': out + 'CERRADO_col2_rocky_gapfill_v1_seg_v' + outputVersion,
    'pyramidingPolicy': {
        '.default': 'mode'  
        },
    'region': classification.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
