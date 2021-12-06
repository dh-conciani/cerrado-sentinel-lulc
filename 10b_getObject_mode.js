// generate statistical layers to be used in the object-based filtering 
// dhemerson.costa@ipam.org.br

// cerrado extent
var cerrado_extent = 
    ee.Geometry.Polygon(
        [[[-61.160259399019594, -1.7826472282717678],
          [-61.160259399019594, -25.148135834718577],
          [-40.857525024019594, -25.148135834718577],
          [-40.857525024019594, -1.7826472282717678]]], null, false);

/////////////////////   user parameters   /////////////////////
// define input file (sentinel beta classification)
var asset_id = 'users/dhconciani/sentinel-beta/sentinel-classification';
var file_in = 'CERRADO_sentinel_gapfill_wetfor_spatial_freq_v31';

// define years to be used 
var years_list = [2016, 2017, 2018, 2019, 2020];

// define classes mapped by the biome 
var classes = [3, 4, 11, 12, 21, 25, 33];

// define segment properties 
var segment_bands = ["red_median", "nir_median", "swir1_median"];
var segment_size = 10;

///////////////////////     palettes    ////////////////////////
// mapbiomas color ramp 
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// sentinel visualization parameters 
var vis_sentinel = {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
};

// palletes of segment properties
var vis_prop = { palette: ['black', 'yellow', 'orange', 'red'], min:0, max: 70 };
var vis_prop_max = { palette: ['green', 'yellow', 'orange', 'red'], min:49, max:99 };
var vis_prop_max2 = { palette: ['green', 'yellow', 'orange', 'red'], min:1, max:40 };

var vis_prop_res = { palette: ['green', 'yellow', 'orange', 'red'], min:1, max:51 };
var vis_ratio = { palette: ['black', 'yellow', 'orange', 'red'], min:0.1, max: 0.9 };

var vis_prop = { palette: ['black', 'yellow', 'orange', 'red'], min:0, max: 70 };
var vis_size = { palette: ['green', 'yellow', 'red'], min:0, max: 300};

var vis_nclass = {'min': 0, 'max': 5, 'palette': ["#C8C8C8","#FED266","#FBA713","#cb701b",
                                                     "#cb701b","#a95512","#a95512","#662000",
                                                     "#662000", "#cb181d"],'format': 'png'};

///////////////////////     imports    ////////////////////////
// biomes raster  
var biomes = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster');

// classification regions
var regions = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/CERRADO/cerrado_regioes_c6');
              //.limit(3);//.aside(print);
              
// classification regions (image)
var regions_img = ee.Image('users/dhconciani/base/cerrado_regioes_c6_raster');

// define empty recipe
var recipe = ee.Image([]);

//////////////////////     functions   ///////////////////////
// for each year
years_list.forEach(function(year_i) {
  // read sentinel beta classification  
  var collection = ee.Image(asset_id + '/' + file_in)
                      .select(['classification_' + year_i])
                      .updateMask(biomes.eq(4));
                       
  // read sentinel mosaic 
  var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics')
      .filterMetadata('year', 'equals', year_i)
      .filterMetadata('version', 'equals', '1')
      .filterMetadata('biome', 'equals', 'CERRADO')
      .mosaic()
      .updateMask(collection);
      
  // plot on the map 
  Map.addLayer(mosaic, vis_sentinel, 'mosaic ' + year_i);
  // plot on the map 
  Map.addLayer(collection, vis, 'classification ' + year_i);
      
  // define function to compute segments
  var getSegments = function (image, size) {
    // define seed
    var seeds = ee.Algorithms.Image.Segmentation.seedGrid(
        {
            size: size,
            gridType: 'square'
        }
    );
    
    // create segments by using SNIC
    var snic = ee.Algorithms.Image.Segmentation.SNIC({
        image: image,
        size: size,
        compactness: 0.1,
        connectivity: 8,
        neighborhoodSize: 2 * size,
        seeds: seeds
    });
    
    // paste proerties
    snic = ee.Image(
        snic.copyProperties(image)
            .copyProperties(image, ['system:footprint'])
            .copyProperties(image, ['system:time_start']));

    return snic.select(['clusters'], ['segments']);
    };
    
  // create segments
  var segments = getSegments(
                             // image:
                             mosaic.select(segment_bands), 
                             // size:
                             segment_size
                             ).reproject('EPSG:4326', null, 10);
                                   
  // plot on the map
  Map.addLayer(segments.randomVisualizer(), {}, 'segments', false);

  // define function to compute general statistics (size, mode, nclass) per segment
  var getStats = function (spatial, image, scale) {
  // compute the total number of pixels 
  var size = spatial.addBands(image)
                        .reduceConnectedComponents({
                          'reducer': ee.Reducer.count(),
                          'labelBand': 'segments'
                          }
                        ).reproject('EPSG:4326', null, scale)
                      .rename('size');
                      
  // compute the mode class 
  var mode = spatial.addBands(image)
                        .reduceConnectedComponents({
                          'reducer': ee.Reducer.mode(), 
                          'labelBand': 'segments'
                          }
                        ).reproject('EPSG:4326', null, scale)
                      .rename('mode');
                      
  // compute the second mode
  var second_mode = spatial.addBands(image.updateMask(image.neq(mode)))
                        .reduceConnectedComponents({
                          'reducer': ee.Reducer.mode(), 
                          'labelBand': 'segments'
                          }
                        ).reproject('EPSG:4326', null, scale)
                      .rename('second_mode');
                      
  // compute the number of classes 
  var nclass = spatial.addBands(image)
                          .reduceConnectedComponents({
                            'reducer': ee.Reducer.countDistinctNonNull(), 
                            'labelBand': 'segments'
                            }
                          ).reproject('EPSG:4326', null, scale)
                        .rename('n_class');

  return size.addBands(mode).addBands(second_mode).addBands(nclass);
};

  // compute general stats
  var stats = getStats(
                        // spatial:
                        segments, 
                        // image:
                        collection,
                        // scale
                        10
                        );

  // create an empty recipe to receive proportions as bands
  var proportions = ee.Image([]);
  
  // define function to get proportions (0-100) per segment~class 
  classes.forEach(function(class_j) {
    // compute the per class pixel count
    var class_size = segments.addBands(collection.updateMask(collection.eq(class_j)))
                              .reduceConnectedComponents({
                                'reducer': ee.Reducer.count(), 
                                'labelBand': 'segments'
                                }
                              ).reproject('EPSG:4326', null, 10);
                              
    // compute proportion 
    var class_proportion = class_size.divide(stats.select(['size'])).multiply(100)
                                     .rename('prop_' + class_j);
                                     
    // insert into recipe
    proportions = proportions.addBands(class_proportion);
  });
  
  // compute descriptive proportions 
    // maximum proportion value (mode)
    proportions = proportions.addBands(proportions.reduce('max').rename('mode_prop'))
                            // residual proportion (max - 100)
                           .addBands(proportions.reduce('max').subtract(100).multiply(-1).rename('residual_prop'));
  
  // create an empty recipe to receive proportions as bands
  var proportions_second = ee.Image([]);
  
  // define function to get the second mode proportion 
  classes.forEach(function(class_j) {

    // remove pixels from the mode
    var masked = collection.updateMask(collection.eq(class_j));
                 masked = masked.updateMask(collection.neq(stats.select(['mode'])));

    // compute the per class pixel count
    var class_size = segments.addBands(masked)
                              .reduceConnectedComponents({
                                'reducer': ee.Reducer.count(), 
                                'labelBand': 'segments'
                                }
                              ).reproject('EPSG:4326', null, 10);
                              
    // compute proportion 
    var class_proportion = class_size.divide(stats.select(['size'])).multiply(100)
                                     .rename('prop_' + class_j);
                                     
    // insert into recipere
    proportions_second = proportions_second.addBands(class_proportion);
  });
  
   // proportion value (second mode)
    proportions_second = proportions_second.reduce('max').rename('second_mode_prop');

  // merge proportions with general stats
  stats = stats.addBands(proportions).addBands(proportions_second);
  
  // compute the ratio (second mode size / mode size)
  var ratio = stats.select(['second_mode_prop']).divide(stats.select(['mode_prop'])).rename('ratio');
      stats = stats.addBands(ratio);
      
  // compute the level-2 residual
  var residual_prop_l2 = stats.select(['residual_prop']).subtract(stats.select(['second_mode_prop']));
      stats = stats.addBands(residual_prop_l2.rename('residual_prop_l2'));
  
  // inspect results
  print (stats);
  Map.addLayer(stats.select(['size']), vis_size, 'size', false);
  Map.addLayer(stats.select(['mode']), vis, 'mode', true);
  Map.addLayer(stats.select(['second_mode']), vis, 'second_mode', false);
  //Map.addLayer(stats.select(['n_class']), vis_nclass, 'n_class', false);
  //Map.addLayer(stats.select(['prop_3']), vis_prop, 'prop_3', false);
  //Map.addLayer(stats.select(['prop_4']), vis_prop, 'prop_4', false);
  //Map.addLayer(stats.select(['prop_11']), vis_prop, 'prop_11', false);
  //Map.addLayer(stats.select(['prop_12']), vis_prop, 'prop_12', false);
  //Map.addLayer(stats.select(['prop_21']), vis_prop, 'prop_21', false);
  //Map.addLayer(stats.select(['prop_25']), vis_prop, 'prop_25', false);
  //Map.addLayer(stats.select(['prop_33']), vis_prop, 'prop_33',false);
  //Map.addLayer(stats.select(['mode_prop']), vis_prop_max, 'mode_prop', false);
  //Map.addLayer(stats.select(['residual_prop']), vis_prop_res, 'residual_prop', false);
  //Map.addLayer(stats.select(['second_mode_prop']), vis_prop_max2, 'second_mode_prop', false);
  Map.addLayer(stats.select(['ratio']), vis_ratio, 'ratio', false);
  Map.addLayer(stats.select(['residual_prop_l2']), vis_prop_res, 'residual_prop_l2', false);
  
  // round residual prop level-2 to as statistical-stratifier
  //stats = stats.addBands(stats.select(['residual_prop_l2']).round().rename('rounded_residual_l2'));
   
   // paste into recipe
   recipe = recipe.addBands(stats.select(['mode'], ['classification_' + year_i]));
   
   /*
   
  // define function to get sample points (for statistical analisys)
  var getPoints = function(feature) {
    var memory_points = ee.FeatureCollection.randomPoints({
                    region: feature.geometry(),
                    points: 1000,
                    seed: 1000 * 2
              }
          );
          return memory_points;
      };
      
      // apply function to get points
      var points = regions.map(getPoints).flatten();
    
    // define function to extract pixel values for each point
    var extractValues = function (object) {
        return  object.set(stats.addBands(regions_img.rename('region')).reduceRegion({
                reducer: 'mean',
                geometry: object.geometry(),
                scale: 10
                }
            )
          ).setGeometry(null);  
        };
              
    // extract values
    var sampled = points.map(extractValues);
    print (sampled.limit(100));
    print (sampled.size());
    

  // export 
    Export.table.toDrive({
      collection: ee.FeatureCollection(sampled),
      description: 'sample_objects_1000',
      folder: 'EXPORT',
      fileFormat: 'CSV'
    });
  
    */
});

print (recipe)

// export as gee asset
Export.image.toAsset({
        "image": recipe,
        "description": 'mode_filtered_v31',
        "assetId": 'users/dh-conciani/test-sentinel' + '/' + 'mode_filtered_v31',
        "scale": 10,
        "pyramidingPolicy": {
            '.default': 'mode'
        },
        "maxPixels": 1e13,
        "region": cerrado_extent
    });  
