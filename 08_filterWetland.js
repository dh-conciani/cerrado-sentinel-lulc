// filter wetlands (11) by using an AOI created from HAND (15m)
// convert wetland outside AOI to mosaic (21) 
// convert wetland outside AOI and within protected areas to grassland (12)
// dhemerson.costa@ipam.org.br

// import sentinel classification
var dir = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO/SENTINEL/classification_sentinel';
var file_in = 'CERRADO_sentinel_gapfill_v2';
var file_out = 'CERRADO_sentinel_gapfill_wetland_v2';

// import sentinel classification
var classification = ee.Image(dir + '/' + file_in);

// import AOI
var aoi = ee.Image('projects/mapbiomas-workspace/AUXILIAR/CERRADO/c6-wetlands/input_masks/aoi_wetlands_c6');

// import protected areas
var ucs = ee.Image('users/dhconciani/base/raster_ucs_cerrado_2019_withoutAPAs_mask');

// define years to be assessed
var list_years = ['2016', '2017', '2018', '2019', '2020'];

// import mapbiomas color ramp
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// define recipe
var recipe = ee.Image([]);
// filter wetlands
list_years.forEach(function(year_i) {
  // read classification for the year [i]
  var classification_i = classification.select(['classification_' + year_i]);

  // subset classification in areas with HAND > 15m (AOI = 0)
  var classification_naoi = classification_i.updateMask(aoi.eq(0));

  // filter wetlands outside AOI 
  var filtered_i =  classification_naoi.remap([3, 4, 11, 12, 15, 19, 21, 25, 33],
                                              [3, 4, 21, 12, 15, 19, 21, 25, 33]);
                                           
  // blend with original data
     filtered_i = classification_i.blend(filtered_i);
     
  // if wetland is outside AOI (HAND > 15m) and within protected area, convert to grassland
  var filtered_uc = classification_naoi.updateMask(ucs.eq(1));
      filtered_uc = filtered_uc.remap([3, 4, 11, 12, 15, 19, 21, 25, 33],
                                      [3, 4, 12, 12, 15, 19, 21, 25, 33]);
                                      
  // blend
      filtered_i = filtered_i.blend(filtered_uc);
                                      
  // add bands into recipe
  recipe = recipe.addBands(filtered_i);
  });

// plot AOI
//Map.addLayer(aoi, {palette: ['black', 'red', 'red'], min:0, max:2}, 'aoi');
Map.addLayer(classification.select(['classification_2020']), vis, 'classification');
print (recipe);
Map.addLayer(recipe.select(['classification_2020']), vis, 'filtered');

// export as GEE asset
Export.image.toAsset({
    'image': recipe,
    'description': file_out,
    'assetId': dir + '/' + file_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': recipe.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
