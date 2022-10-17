// compute area
// dhemerson.costa@ipam.org.br

// import ibges biome
var biomas = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster');
var cerrado = biomas.updateMask(biomas.eq(4));

// function to compute area in hectares
var pixelArea = ee.Image.pixelArea().divide(10000);
// define resoltion 
var resolution = 10;

// define input file (sentinel)
var file_path = 'users/dhconciani/sentinel-beta/sentinel-classification/';
// users/dhconciani/sentinel-beta/sentinel-classification/
// users/dh-conciani/test-sentinel/

var file_name = 'CERRADO_sentinel_gapfill_wetfor_spatial_freq_temporal_v31';
// CERRADO_sentinel_gapfill_wetfor_spatial_freq_temporal_v31
// CERRADO_sentinel_gapfill_wetfor_spatial_freq_v31
// mode_filtered_v31

// define output file
var dir_out = 'EXPORT';
var export_name = file_name;

// define cerrado regions asset
var regioesCollection = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/CERRADO/cerrado_regioes_c6');

// regions to compute class area
var regioes = [ 
                 1,  2,  3,  4,  5,  6,  7,  8, 
                 9, 10, 11, 12, 13, 14, 15, 16,
                 17, 18, 19, 20, 21, 22, 23, 24,
                 25, 26, 27, 28, 29, 30, 31, 32,
                 33, 34, 35, 36, 37, 38
                ];

// years to compute class area
var anos = [ 
             2016, 2017, 2018, 2019, 2020
            ];

// create an empty recipe to receive data
var recipe = ee.FeatureCollection([]);

anos.forEach(function(process_year) {
  // for each year
  // load classification
  var img_i = ee.Image(file_path + file_name).select(['classification_' + process_year]);
  img_i = img_i.updateMask(cerrado);
  
  regioes.forEach(function(process_region) {
    // for each region
    // select region polygon
    var pol_reg = regioesCollection.filterMetadata('mapb', 'equals', process_region); 
    
    // clip yearly image to each region 
    var img_clip = img_i.clip(pol_reg);
    
    // compute area 
    var area03 = pixelArea.mask(img_clip.eq(3));
    var area04 = pixelArea.mask(img_clip.eq(4));
    var area11 = pixelArea.mask(img_clip.eq(11));
    var area12 = pixelArea.mask(img_clip.eq(12));
    var area21 = pixelArea.mask(img_clip.eq(21));
    var area25 = pixelArea.mask(img_clip.eq(25));
    var area33 = pixelArea.mask(img_clip.eq(33));
    
    // paste area as metadata into region polygon 
    pol_reg = ee.Feature(pol_reg.geometry())
          .set('forest', ee.Number(area03.reduceRegion({reducer: ee.Reducer.sum(),
              geometry: pol_reg.geometry(),
              scale: resolution,
              maxPixels: 1e13}).get('area')))
          .set('savanna', ee.Number(area04.reduceRegion({reducer: ee.Reducer.sum(),
              geometry: pol_reg.geometry(),
              scale: resolution,
              maxPixels: 1e13}).get('area')))
          .set('wetland', ee.Number(area11.reduceRegion({reducer: ee.Reducer.sum(),
              geometry: pol_reg.geometry(),
              scale: resolution,
              maxPixels: 1e13}).get('area')))
          .set('grassland', ee.Number(area12.reduceRegion({reducer: ee.Reducer.sum(),
              geometry: pol_reg.geometry(),
              scale: resolution,
              maxPixels: 1e13}).get('area')))
          .set('mosaic', ee.Number(area21.reduceRegion({reducer: ee.Reducer.sum(),
              geometry: pol_reg.geometry(),
              scale: resolution,
              maxPixels: 1e13}).get('area')))
          .set('other_nonVeg', ee.Number(area25.reduceRegion({reducer: ee.Reducer.sum(),
              geometry: pol_reg.geometry(),
              scale: resolution,
              maxPixels: 1e13}).get('area')))
          .set('water', ee.Number(area33.reduceRegion({reducer: ee.Reducer.sum(),
              geometry: pol_reg.geometry(),
              scale: resolution,
              maxPixels: 1e13}).get('area')))
          .set('region', process_region)
          .set('year', process_year);
    
    // bind into recipe
    recipe = recipe.merge(pol_reg);
  });
});


// empty .geo column
recipe.map(function(feature){
return feature.setGeometry(null);
});

//Map.addLayer(recipe,{},'recipe');

// exporto to gDrive
Export.table.toDrive({
  collection: recipe,
  description: 'area_' + export_name,
  folder: dir_out,
  fileFormat: 'CSV'
});
