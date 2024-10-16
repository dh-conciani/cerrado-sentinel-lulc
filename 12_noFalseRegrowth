// -- -- -- -- 12_noFalseRegrowth
// post-processing filter: avoid the regrowth of native forests in silviculture areas
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
var inputVersion = '18';
var outputVersion = '6';

// Define the input file
var inputFile = 'CERRADO_S2-C1_gapfill_v10_segmentation_v10_frequency_v6_temporal_v' + inputVersion;

// Load the land cover classification image
var classificationInput = ee.Image(root + inputFile);
print('Input classification', classificationInput);
Map.addLayer(classificationInput, vis, 'Input classification');

// Define the years in the series
var years = ee.List.sequence(2016, 2023).getInfo();

// Create the condition for the conversion of forest (3) to silviculture (21)
var forestToSilviculture = function(image) {
  // Get the two first years (2016 and 2017)
  var firstYear = image.select('classification_2016').eq(21)
                       .or(image.select('classification_2017').eq(21));
  
  // Create an empty image to store results of other years
  var hasSilviculture = ee.Image.constant(0);
  
  // Loop through the other years and check for the occurrence of class 21
  years.slice(1).forEach(function(year) {
    var currentYear = image.select('classification_' + year).eq(21);
    hasSilviculture = hasSilviculture.or(currentYear);
  });

  // Combine the condition: class 21 in 2016 OR 2017 AND at least one more occurrence in the series
  var condition = firstYear.and(hasSilviculture);

  // Apply the rule: if the condition is met, change class 3 (forest) to class 21 (silviculture)
  var updatedImage = image;
  years.forEach(function(year) {
    updatedImage = updatedImage.where(condition.and(image.select('classification_' + year).eq(3)), 21);
  });

  return updatedImage;
};

// Apply the function to the input image
var classificationOutput = forestToSilviculture(classificationInput);

Map.addLayer(classificationOutput, vis, 'Post-processed classification');

// Write metadata
classificationOutput = classificationOutput.set('4-noFalseRegrowth', outputVersion)
                                           .copyProperties(classificationInput);

print ('Output classification', classificationOutput);

// Export to a GEE asset
Export.image.toAsset({
    'image': classificationOutput,
    'description': inputFile + '_noFalseRegrowth_v' + outputVersion,
    'assetId': out +  inputFile + '_noFalseRegrowth_v' + outputVersion,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region':classificationOutput.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
