// temporal filter - cerrado biome 
// dhemerson.costa@ipam.org.br

// filter first year, apply temporal-window and filter last year 

// set root directory 
var root = 'users/dh-conciani/collection7/0_sentinel/c1-general-post/';

// set file to be processed
var file_in = 'CERRADO_sentinel_gapfill_freq_v5';

// set metadata to export 
var version_out = '13';

// import mapbiomas color ramp
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// import collection 7 and select 2013, 2014 and 2015
var collection = ee.Image('projects/mapbiomas-workspace/public/collection7/mapbiomas_collection70_integration_v2')
                    .slice(28,31);


// import collection 7 (2013, 2014, 2015)
var inputClassification = collection
          // and add sentinel collection)
          .addBands(ee.Image(root + file_in)).aside(print);


// define empty classification to receive data
var classification = ee.Image([]);

// remap all anthopogenic classes only to single-one [21]
ee.List.sequence({'start': 2013, 'end': 2022}).getInfo()
    .forEach(function(year_i) {
      // get year [i]
      var classification_i = inputClassification.select(['classification_' + year_i])
        // remap
       .remap( [3, 4, 5, 9, 11, 12, 29, 15, 19, 39, 20, 40, 41, 46, 47, 48, 21, 23, 24, 30, 25, 33, 31],
               [3, 4, 3, 9, 11, 12, 12, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 25, 25, 25, 25, 33, 33])
               .rename('classification_' + year_i)
               .updateMask(inputClassification.select(['classification_2022']));
               // insert into classification
               classification = classification.addBands(classification_i);
    });
    
print('input', classification);

Map.addLayer(classification.select(['classification_2016']), vis, 'pre-2016');


///////////////////////////// set rules to mask mid years 
// three years 
var rule_3yr = function(class_id, year, image) {
  // get pixels to be mask when the mid year is different of previous and next
  var to_mask = image.select(['classification_' + String(year - 1)]).eq(class_id)    // previous
           .and(image.select(['classification_' + year]).neq(class_id))              // current
           .and(image.select(['classification_' + String(year + 1)]).eq(class_id));  // next
           
  // rectify value in the current year 
  return image.select(['classification_' + year])
              .where(to_mask.eq(1), class_id);
};

////////////////////// set functions to apply rules over the time-series for mid years
// three years
var run_3yr = function(image, class_id) {
  // create recipe with the first year (without previous year)
  var recipe = image.select(['classification_2013']);
  // for each year in the window
  ee.List.sequence({'start': 2014, 'end': 2021}).getInfo()
      .forEach(function(year_i){
        // run filter
        recipe = recipe.addBands(rule_3yr(class_id, year_i, image));
      }
    );
  // insert last years (without suitable next yr to apply filter)
  recipe = recipe.addBands(image.select(['classification_2022']));
  
  return recipe;
};


////////////////////// set functions to apply filter to first and last years
// first year [2016]
var run_3yr_first = function(class_id, image) {
  // get pixels to be masked in the first year when next two were different
  var to_mask = image.select(['classification_2013']).neq(class_id)
           .and(image.select(['classification_2014']).eq(class_id))
           .and(image.select(['classification_2015']).eq(class_id));
           
  // rectify value in the first year
  var first_yr = image.select(['classification_2013'])
                      .where(to_mask.eq(1), class_id);
  
  // add bands of next years
  ee.List.sequence({'start': 2014, 'end': 2022}).getInfo()
      .forEach(function(year_i) {
        first_yr = first_yr.addBands(image.select(['classification_' + year_i]));
      });
  
  return first_yr;
};

//////////////////////// end of functions 
/////////////////////////////// start of conditionals 

// create object to be filtered
var to_filter = classification; 

////////////////// filter first year 
to_filter = run_3yr_first(12, to_filter);
to_filter = run_3yr_first(3, to_filter);
to_filter = run_3yr_first(4, to_filter);
to_filter = run_3yr_first(11, to_filter);


////////////// run time window general rules
///////////////// filter middle years
var class_ordering = [4, 3, 12, 11, 21, 9, 33, 25];

class_ordering.forEach(function(class_i) {
  // 3yr
   to_filter = run_3yr(to_filter, class_i);
});



// plot 
Map.addLayer(to_filter.select(['classification_2022']), vis, 'pre-last-year-filter');

// avoid that filter runs over small deforestation (as atlantic rainforest)
// remap native vegetation 
// create an empty recipe for the remmapd collection
var remap_col = ee.Image([]);
// for each year
ee.List.sequence({'start': 2013, 'end': 2022}).getInfo()
  .forEach(function(year_i) {
    // get year [i] clasification
    var x = to_filter.select(['classification_' + year_i])
      // perform remap
      .remap([3, 4, 11, 12, 21, 9, 25, 33],
             [3, 3,  3,  3, 21, 9, 25, 33])
             .rename('classification_' + year_i);
    // put it on recipe
    remap_col = remap_col.addBands(x);
  });


// get regenrations from 2021 to 2022
var reg_last = remap_col.select(['classification_2022']).eq(3)
                  .and(remap_col.select(['classification_2021']).eq(21))
                  .selfMask();

// get regeneration sizes
var reg_size = reg_last.selfMask().connectedPixelCount(128,true).reproject('epsg:4326', null, 10);

// get pixels with regenerations lower than 1 ha (100 * 100) and retain 2021 class
var excludeReg = to_filter.select(['classification_2021'])
                    .updateMask(reg_size.lte(100).eq(1));

// update 2022 year discarding only small regenerations
var x22 = to_filter.select(['classification_2022']).blend(excludeReg);

// remove 2022 from time-series and add rectified data
to_filter = to_filter.slice(3,9).addBands(x22.rename('classification_2022')).aside(print);

Map.addLayer(to_filter.select(['classification_2022']), vis, 'post-last-year');
Map.addLayer(to_filter.select(['classification_2016']), vis, 'post-2016');
Map.addLayer(to_filter.select(['classification_2017']), vis, 'post-2017');
Map.addLayer(to_filter.select(['classification_2018']), vis, 'post-2018');

Export.image.toAsset({
    'image': to_filter,
    'description': 'CERRADO_sentinel_gapfill_temporal_v' + version_out,
    'assetId': root +  'CERRADO_sentinel_gapfill_temporal_v' + version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': classification.geometry(),
    'scale': 10,
    'maxPixels': 1e13});
