// define year
var year = 2020;

// define classes to compute proportions
var classes = [3, 4, 11, 12, 21, 25, 33];

// import cerrado
var cerrado = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster');

// read collection
var collection = ee.Image('users/dhconciani/sentinel-beta/sentinel-classification/CERRADO_sentinel_gapfill_wetfor_spatial_freq_v31')
                  .select(['classification_' + year])
                  .updateMask(cerrado.eq(4));
                  
// read collection 6
var col6 = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1')
            .updateMask(cerrado.eq(4));
            
// import sentinel 
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics')
    .filterMetadata('year', 'equals', year)
    .filterMetadata('version', 'equals', '1')
    .filterMetadata('biome', 'equals', 'CERRADO')
    .mosaic()
    .updateMask(cerrado.eq(4));
                  
// import mapbiomas pallete
// import the color ramp module from mapbiomas 
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// plot sentinel mosaic
Map.addLayer(mosaic, {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
}, 'Sentinel ' + year, true);

// plot mapbiomas
Map.addLayer(collection.select(['classification_' + year]), vis, 'classification ' + year);

// define bands to be used in segmentation 
var segment_bands = ["red_median", "nir_median", "swir1_median"];

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
var segments = getSegments(mosaic.select(segment_bands), 10)
                  .reproject('EPSG:4326', null, 10);
                  
// inspect
Map.addLayer(segments.randomVisualizer(), {}, 'segments');

// define function to compute general statistics (size, mode, nclass) per segment
var getStats = function (spatial, image, scale) {
  // compute the total number of pixels 
  var size = spatial.addBands(image)
                        .reduceConnectedComponents({
                          'reducer': ee.Reducer.count(),
                          'labelBand': 'segments'
                          }
                        ).reproject('EPSG:4326', null, scale)
                      .rename('segment_size');
                      
  // compute the mode class 
  var mode = spatial.addBands(image)
                        .reduceConnectedComponents({
                          'reducer': ee.Reducer.mode(), 
                          'labelBand': 'segments'
                          }
                        ).reproject('EPSG:4326', null, scale)
                      .rename('mode_class');
                      
  // compute the number of classes 
  var nclass = spatial.addBands(image)
                          .reduceConnectedComponents({
                            'reducer': ee.Reducer.countDistinctNonNull(), 
                            'labelBand': 'segments'
                            }
                          ).reproject('EPSG:4326', null, scale)
                        .rename('n_class');
                        
  return size.addBands(mode).addBands(nclass);
};

// compute general stats
var stats = getStats(segments, collection, 10);





                  


// per class proportion function 
var getProportion = function (class_k) {
  // compute the per class pixel count  
  var class_size = segments.addBands(collection.updateMask(collection.eq(class_k)))
                            .reduceConnectedComponents({
                              'reducer': ee.Reducer.count(), 
                              'labelBand': 'segments'
                              }
                            ).reproject('EPSG:4326', null, 10);
                          
  // compute proportion 
  var class_proportion = class_size.divide(size).multiply(100)
                                    .rename('prop_' + class_k);
                                    
    return class_proportion;
  };
  
//var proportions = classes.map(getProportion);

//print (proportions)
                      
//Map.addLayer(size, vis, 'total_size');
//Map.addLayer(forest_size, vis, 'forest size');
//Map.addLayer(class_proportion, {palette: ['black', 'yellow', 'orange', 'red', 'purple'],
//                                min:0, max: 51},
//                                'prop');


// bind data
//var data = major.addBands(nclass);

