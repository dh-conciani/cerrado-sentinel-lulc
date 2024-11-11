// -- -- -- -- 11_temporal
// post-processing filter: applies a temporal filter to remove implausible land cover transitions from the classification data.
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
var outputVersion = '18';

// Define the input file
var inputFile = 'CERRADO_S2-C1_gapfill_v10_segmentation_v10_frequency_v'+inputVersion;

// Load the land cover classification image
var classificationInput = ee.Image(root + inputFile);
print('Input classification', classificationInput);
Map.addLayer(classificationInput, vis, 'Input classification');

// Create an empty image to store the result
var classification = ee.Image([]);

// Remap anthropogenic classes into a single class [21]
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo()
    .forEach(function(year_i) {

       // Select the classification for the current year and remap classes
      var classification_i = classificationInput.select(['classification_' + year_i])
        .remap([3, 4, 11, 12, 15, 18, 25, 33],
               [3, 4, 11, 12, 21, 21, 25, 33])
               .rename('classification_' + year_i);

               // Add the remapped classification to the result image
               classification = classification.addBands(classification_i);
    });

// -- -- -- -- Define temporal filter rules for middle years (3-year window)
var rule_3yr = function(class_id, year, image) {
   // Identify pixels to be corrected based on surrounding years
  var to_mask = image.select(['classification_' + String(year - 1)]).eq(class_id)    // previous
           .and(image.select(['classification_' + year]).neq(class_id))              // current
           .and(image.select(['classification_' + String(year + 1)]).eq(class_id));  // next

  // Rectify the class in the current year where conditions are met
  return image.select(['classification_' + year])
              .where(to_mask.eq(1), class_id);
};

// Function to apply the 3-year temporal filter to the entire time series
var run_3yr = function(image, class_id) {
  // Initialize the container with the first year's classification
  var container = image.select(['classification_2016']);
  
 // Apply the temporal filter for each year from 2017 to 2022
  ee.List.sequence({'start': 2017, 'end': 2022}).getInfo()
      .forEach(function(year_i){
        container = container.addBands(rule_3yr(class_id, year_i, image));
      }
    );
    
  // Add the last year (2023) to the container without filtering it
  container = container.addBands(image.select(['classification_2023']));
  
  return container;
};

// -- -- -- -- Define filter for the last year (2023)
var run_3yr_last = function(class_id, image) {
  // Identify pixels to be corrected in 2023 if the class matches in 2021 and 2022 but differs in 2023
  var to_mask = image.select(['classification_2023']).neq(class_id)
           .and(image.select(['classification_2022']).eq(class_id))
           .and(image.select(['classification_2021']).eq(class_id));

  // Rectify the class in 2023 where conditions are met
  var last_yr = image.select(['classification_2023'])
                      .where(to_mask.eq(1), class_id);
  
  // Create an empty container to store the filtered time series
  var container = ee.Image([]);
  
  // Add all years from 2016 to 2022 to the container
  ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
      .forEach(function(year_i) {
        container = container.addBands(image.select(['classification_' + year_i]));
      });
  
  // Add the filtered 2023 classification to the container
  return container.addBands(last_yr);
  
};


// -- -- -- -- End of functions

// ** ** **

// -- -- -- -- Start of conditionals 


// Create object to be filtered
var to_filter = classification; 

// Apply the 3-year temporal filter to middle years (2017 to 2022)
var class_ordering = [4, 12, 3, 11, 21, 25, 33];

class_ordering.forEach(function(class_i) {
   to_filter = run_3yr(to_filter, class_i);
});

Map.addLayer(to_filter, vis, 'post-middle-year-filter');


// Apply the temporal filter to the last year (2023)
to_filter = run_3yr_last(21, to_filter);

Map.addLayer(to_filter, vis, 'post-last-year-filter');



// -- -- -- -- Avoid that filter runs over small deforestation (as atlantic rainforest)

// Create an empty image to store the remapped classification
var remap_col = ee.Image([]);

// Remap vegetation classes (3, 4, 11, 12) to class 3, for each year
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo()
  .forEach(function(year_i) {
    var x = to_filter.select(['classification_' + year_i])
      .remap([3, 4, 11, 12, 21],
             [3, 3,  3,  3, 21])
             .rename('classification_' + year_i);
 
    // Add the remapped year to the container
    remap_col = remap_col.addBands(x);
  });

// Identify regenerations between 2022 and 2023 (class change from 21 to 3)
var reg_last = remap_col.select(['classification_2023'])
                      .eq(3)
                      .and(remap_col.select(['classification_2022']).eq(21));

// Calculate the size of regenerated areas (connected pixel count)
var reg_size = reg_last.selfMask().connectedPixelCount(128, true).reproject('epsg:4326', null, 10);

// Exclude small regenerations (areas smaller than 1 ha, 11 pixels of 900 m² each)
var excludeReg = to_filter.select(['classification_2022'])
                          .updateMask(reg_size.lte(11).eq(1));

// Update 2023 by excluding only small regenerations
var x23 = to_filter.select(['classification_2023']).blend(excludeReg);

// Replace 2023 in the time series with the updated classification
to_filter = to_filter.slice(0,7).addBands(x23.rename('classification_2023'));

Map.addLayer(to_filter, vis, 'big-reg-filter');

// Write metadata
to_filter = to_filter.set('3-temporal', outputVersion)
                     .copyProperties(classificationInput);

print ('Output classification', to_filter);

// Export to a GEE asset
Export.image.toAsset({
    'image': to_filter,
    'description': inputFile + '_temporal_v' + outputVersion,
    'assetId': out +  inputFile + '_temporal_v' + outputVersion,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region':to_filter.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
