// temporal filter - cerrado biome 
// dhemerson.costa@ipam.org.br

// filter first year, apply temporal-window and filter last year 

// set root directory 
var root = 'users/dh-conciani/collection7/0_sentinel/c1-general-post/';

// set file to be processed
var file_in = 'CERRADO_sentinel_gapfill_freq_v4';

// set metadata to export 
var version_out = '8';

// import mapbiomas color ramp
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// import classification 
var inputClassification = ee.Image(root + file_in);

// define empty classification to receive data
var classification = ee.Image([]);

// remap all anthopogenic classes only to single-one [21]
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
    .forEach(function(year_i) {
      // get year [i]
      var classification_i = inputClassification.select(['classification_' + year_i])
        // remap
        .remap([3, 4, 11, 12, 15, 19, 21, 25, 33],
               [3, 4, 11, 12, 21, 21, 21, 25, 33])
               .rename('classification_' + year_i);
               // insert into classification
               classification = classification.addBands(classification_i);
    });
    
print('input', classification);
Map.addLayer(classification.select(['classification_2018']), vis, 'pre-2018');


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

// four years 
var rule_4yr = function(class_id, year, image) {
  // get pixels to be mask when the mid years is different of previous and next
  var to_mask = image.select(['classification_' + String(year - 1)]).eq(class_id)      // previous
           .and(image.select(['classification_' + year]).neq(class_id))                // current
           .and(image.select(['classification_' + String(year + 1)]).neq(class_id))    // next
           .and(image.select(['classification_' + String(year + 2)]).eq(class_id));    // next two
  
  // rectify value in the current year
  return image.select(['classification_' + year])
              .where(to_mask.eq(1), class_id);
};

// five years
var rule_5yr = function(class_id, year, image) {
  // get pixels to be mask when the mid years is different of previous and next
  var to_mask = image.select(['classification_' + String(year - 1)]).eq(class_id)      // previous
           .and(image.select(['classification_' + year]).neq(class_id))                // current
           .and(image.select(['classification_' + String(year + 1)]).neq(class_id))    // next
           .and(image.select(['classification_' + String(year + 2)]).neq(class_id))    // next two
           .and(image.select(['classification_' + String(year + 3)]).eq(class_id));    // next three
  
  // rectify value in the current year
  return image.select(['classification_' + year])
              .where(to_mask.eq(1), class_id);
};

////////////////////// set functions to apply rules over the time-series for mid years
// three years
var run_3yr = function(image, class_id) {
  // create recipe with the first year (without previous year)
  var recipe = image.select(['classification_2016']);
  // for each year in the window
  ee.List.sequence({'start': 2017, 'end': 2021}).getInfo()
      .forEach(function(year_i){
        // run filter
        recipe = recipe.addBands(rule_3yr(class_id, year_i, image));
      }
    );
  // insert last years (without suitable next yr to apply filter)
  recipe = recipe.addBands(image.select(['classification_2022']));
  
  return recipe;
};

// four years
var run_4yr = function(image, class_id) {
  // create recipe with the first year (without previous year)
  var recipe = image.select(['classification_2016']);
  // for each year in the window
  ee.List.sequence({'start': 2017, 'end': 2020}).getInfo()
      .forEach(function(year_i){
        // run filter
        recipe = recipe.addBands(rule_4yr(class_id, year_i, image));
      }
    );
  // insert last years (without suitable next yr to apply filter)
  recipe = recipe.addBands(image.select(['classification_2021']))
                 .addBands(image.select(['classification_2022']));
  
  return recipe;
};

// five years 
var run_5yr = function(image, class_id) {
  // create recipe with the first year (without previous year)
  var recipe = image.select(['classification_2016']);
  // for each year in the window
  ee.List.sequence({'start': 2017, 'end': 2019}).getInfo()
      .forEach(function(year_i){
        // run filter
        recipe = recipe.addBands(rule_5yr(class_id, year_i, image));
      }
    );
  // insert last years (without suitable next yr to apply filter)
  recipe = recipe.addBands(image.select(['classification_2020']))
                 .addBands(image.select(['classification_2021']))
                 .addBands(image.select(['classification_2022']));
  
  return recipe;
};

////////////////////////////// set rules to avoid deforestations from forest to grassland (or other inconsistent classes)
// three years
var rule_3yr_deforestation = function(class_id, year, image) {
  var to_mask = image.select(['classification_' + String(year - 1)]).eq(class_id[0])   // previous
           .and(image.select(['classification_' + year]).eq(class_id[1]))              // current
           .and(image.select(['classification_' + String(year + 1)]).eq(class_id[2])); // next
           
  // when transitions occurs from class_id 0 to 2, passing for the 1, use the value 3
    return image.select(['classification_' + year])
              .where(to_mask.eq(1), class_id[3]);
};

// four years
var rule_4yr_deforestation = function(class_id, year, image) {
  var to_mask = image.select(['classification_' + String(year - 1)]).eq(class_id[0])   // previous
           .and(image.select(['classification_' + year]).eq(class_id[1]))      // current
           .and(image.select(['classification_' + String(year + 1)]).eq(class_id[2]))  // next
           .and(image.select(['classification_' + String(year + 2)]).eq(class_id[3])); // next

           
  // when transitions occurs from class_id 0 to 3, passing for the 1 or 2, use the value 4
    return image.select(['classification_' + year])
              .where(to_mask.eq(1), class_id[4]);
};

////////////////////// set functions to apply rules over the time-series for deforestation
// three years
var run_3yr_deforestation = function(image, class_id) {
  // create recipe with the first year (without previous year)
  var recipe = image.select(['classification_2016']);
   // for each year in the window
  ee.List.sequence({'start': 2017, 'end': 2021 }).getInfo()
      .forEach(function(year_i){
        // run filter
        recipe = recipe.addBands(rule_3yr_deforestation(class_id, year_i, image));
      }
    );
  // insert last years (without suitable next yr to apply filter)
  recipe = recipe.addBands(image.select(['classification_2022'])); 
  
  return recipe;
};

// four years
var run_4yr_deforestation = function(image, class_id) {
  // create recipe with the first year (without previous year)
  var recipe = image.select(['classification_2016']);
   // for each year in the window
  ee.List.sequence({'start': 2017, 'end': 2020 }).getInfo()
      .forEach(function(year_i){
        // run filter
        recipe = recipe.addBands(rule_4yr_deforestation(class_id, year_i, image));
      }
    );
  // insert last years (without suitable next yr to apply filter)
  recipe = recipe.addBands(image.select(['classification_2021']))
                 .addBands(image.select(['classification_2022'])); 
  
  return recipe;
};

////////////////////// set functions to apply filter to first and last years
// first year [2016]
var run_3yr_first = function(class_id, image) {
  // get pixels to be masked in the first year when next two were different
  var to_mask = image.select(['classification_2016']).neq(class_id)
           .and(image.select(['classification_2017']).eq(class_id))
           .and(image.select(['classification_2018']).eq(class_id));
           
  // rectify value in the first year
  var first_yr = image.select(['classification_2016'])
                      .where(to_mask.eq(1), class_id);
  
  // add bands of next years
  ee.List.sequence({'start': 2017, 'end': 2022}).getInfo()
      .forEach(function(year_i) {
        first_yr = first_yr.addBands(image.select(['classification_' + year_i]));
      });
  
  return first_yr;
};

// last year [2021]
/*
var run_3yr_last = function(class_id, image) {
  // get pixels to be masked in the last year when previous two were different
  var to_mask = image.select(['classification_2022']).neq(class_id)
           .and(image.select(['classification_2021']).eq(class_id))
           .and(image.select(['classification_2020']).eq(class_id));
           
  // rectify value in the last year
  var last_yr = image.select(['classification_2022'])
                      .where(to_mask.eq(1), class_id);
  
  // create recipe with time series from first to last [-1]
  var recipe = ee.Image([]);
  // insert data into recipe
  ee.List.sequence({'start': 2016, 'end': 2021}).getInfo()
      .forEach(function(year_i) {
        recipe = recipe.addBands(image.select(['classification_' + year_i]));
      });
  
  // insert filtered last year
  return recipe.addBands(last_yr);
  
};
*/

//////////////////////// end of functions 
/////////////////////////////// start of conditionals 

// create object to be filtered
var to_filter = classification; 

////////////////// apply 'deforestation' filters
// 4yr
to_filter = run_4yr_deforestation(to_filter, [3, 12, 12, 12, 21]);
to_filter = run_4yr_deforestation(to_filter, [3, 12, 12, 21, 21]);
// 3yr
to_filter = run_3yr_deforestation(to_filter, [3, 12, 21, 21]);
to_filter = run_3yr_deforestation(to_filter, [3, 12, 12, 21]);
to_filter = run_3yr_deforestation(to_filter, [3, 11, 21, 21]);
to_filter = run_3yr_deforestation(to_filter, [3, 11, 11, 3]);
to_filter = run_4yr_deforestation(to_filter, [3, 11, 11, 11, 3]);
to_filter = run_3yr_deforestation(to_filter, [4, 12, 21, 21]);
to_filter = run_3yr_deforestation(to_filter, [11, 12, 21, 21]);
to_filter = run_3yr_deforestation(to_filter, [12, 11, 21, 21]);


////////////////// filter first year 
to_filter = run_3yr_first(12, to_filter);
to_filter = run_3yr_first(3, to_filter);
to_filter = run_3yr_first(4, to_filter);
to_filter = run_3yr_first(11, to_filter);


////////////// run time window general rules
///////////////// filter middle years
var class_ordering = [4, 3, 12, 11, 21, 33, 25];

class_ordering.forEach(function(class_i) {
  // 5 yr
  to_filter = run_5yr(to_filter, class_i);
   // 4 yr
  to_filter = run_4yr(to_filter, class_i);
  // 3yr
   to_filter = run_3yr(to_filter, class_i);
});



// plot 
Map.addLayer(to_filter.select(['classification_2022']), vis, 'pre-last-year-filter');

////////////////// filter last year
//var filtered = run_3yr_last(21, to_filter);

// insert metadata
//print('filtered', filtered);
//to_filter = to_filter.set("version", version_out);

//Map.addLayer(classification.select(['classification_2022']), vis, 'unfiltered 2021');
//Map.addLayer(filtered.select(['classification_2022']), vis, 'post-last-year-filter');

// avoid that filter runs over small deforestation (as atlantic rainforest)
// remap native vegetation 
// create an empty recipe for the remmapd collection
var remap_col = ee.Image([]);
// for each year
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
  .forEach(function(year_i) {
    // get year [i] clasification
    var x = to_filter.select(['classification_' + year_i])
      // perform remap
      .remap([3, 4, 11, 12, 21, 25, 33],
             [3, 3,  3,  3, 21, 25, 33])
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
to_filter = to_filter.slice(0,6).addBands(x22.rename('classification_2022'));

Map.addLayer(to_filter.select(['classification_2022']), vis, 'post-last-year');
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
    'maxPixels': 1e13
});
