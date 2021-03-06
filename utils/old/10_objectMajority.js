// define year
var year = 2020;

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
Map.addLayer(mosaic.clip(geometry), {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
}, 'Sentinel ' + year, true);

// plot mapbiomas
Map.addLayer(collection.select(['classification_' + year]).clip(geometry), vis, 'classification ' + year);

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
var segments = getSegments(mosaic.select(segment_bands).clip(geometry), 10)
                  .reproject('EPSG:4326', null, 10);
                  
// inspect
Map.addLayer(segments.randomVisualizer(), {}, 'segments');

// get unique id values from segments
var getUnique = function (image, feature) {
  // apply pixel count
   var unique = image.reduceRegion({
                    reducer: ee.Reducer.frequencyHistogram(),
                    geometry : feature,
                    scale: 10, 
                    bestEffort: true,
                    tileScale: 7
                    });

    // remove all the unnecessary reducer output structure and make a list of values
    return ee.Dictionary(unique.get(image.bandNames().get(0)))
                .keys()
                .map(ee.Number.parse);
  };

// get unique values
var unique_values = getUnique(segments, geometry);

    //print (unique_values.map(function(i) {
    //  return i ;
    //}));

var data = unique_values.map(function (segment_n) {
  // get mapbiomas classification only for each segment
  var segment_i = collection.updateMask(segments.eq(ee.Number(segment_n)));
  
  // perform pixel count 
  var count = segment_i.reduceRegion({
                    reducer: ee.Reducer.frequencyHistogram(),
                    geometry : geometry,
                    scale: 10, 
                    bestEffort: true,
                    tileScale: 7
                    });
                    
  // create dictionary of pixel count
  var values = ee.Dictionary(count.get(segment_i.bandNames().get(0)));
  
  // extract the major class by using the position of the maximum per class pixel count
  var majority_class = ee.Number.parse(values.keys()
                              .get(values.values().indexOf(
                              values.values().reduce('max'))
                            )
                          );
                          
  // apply majority rule for all segments
  var segment_i_major = segment_i.remap(ee.List(values.keys().map(ee.Number.parse)), // from
                                        // to
                                          ee.List.sequence(0, values.keys().size().subtract(1), 1) //.getInfo()
                                          .map(function (i) {
                                            return majority_class }
                                            )
                                          );
  
  return segment_i_major.toInt();
});

// transform into a image
var data = ee.ImageCollection(data).mosaic();

// export as GEE asset
Export.image.toAsset({
    'image': data,
    'description': 'test_1',
    'assetId': 'users/dh-conciani/test-sentinel' + '/' + 'test_1',
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': geometry,
    'scale': 10,
    'maxPixels': 1e13
});

/*   
// create recipe 
var recipe = collection.clip(geometry);

// for each segment
unique_values.getInfo().forEach(function (segment_n) {
  
  // get mapbiomas classification only for each segment
  var segment_i = collection.updateMask(segments.eq(ee.Number(segment_n)));
                  //Map.addLayer(segment_i, vis, 'segment ' + segment_n);
                  
  // perform pixel count 
  var count = segment_i.reduceRegion({
                    reducer: ee.Reducer.frequencyHistogram(),
                    geometry : geometry,
                    scale: 10, 
                    bestEffort: true,
                    tileScale: 7
                    });
                    
  // create dictionary of pixel count
  var values = ee.Dictionary(count.get(segment_i.bandNames().get(0)));
  
  // extract the major class by using the position of the maximum per class pixel count
  var majority_class = ee.Number.parse(values.keys()
                              .get(values.values().indexOf(
                              values.values().reduce('max'))
                            )
                          );
                          
  // apply majority rule for all segments
  var segment_i_major = segment_i.remap(ee.List(values.keys().map(ee.Number.parse)), // from
                                        // to
                                          ee.List.sequence(0, values.keys().size().subtract(1), 1) //.getInfo()
                                          .map(function (i) {
                                            return majority_class }
                                            )
                                          );
                                          
  // blend over recipe
  recipe = recipe.blend(segment_i_major);
});

Map.addLayer(recipe, vis, 'rect');

*/
