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
Map.addLayer(mosaic, {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
}, 'Sentinel ' + year, true);

// plot mapbiomas
Map.addLayer(collection.select(['classification_' + year]), vis, 'classification ' + year);

// define bands to be used in segmentation 
var segment_bands = ["blue_median", "green_median", "red_median", "nir_median", "swir1_median", "swir2_median"];

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
        compactness: 1,
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
var segments = getSegments(mosaic.select(segment_bands).clip(geometry), 25)
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

// get mapbiomas classification only for each segment
var classification_i = collection.updateMask(segments.eq(ee.Number(unique_values.get(0))));
                       Map.addLayer(classification_i, vis, 'classification_i');
                       
// perform pixel count 
var count = classification_i.reduceRegion({
                  reducer: ee.Reducer.frequencyHistogram(),
                  geometry : geometry,
                  scale: 10, 
                  bestEffort: true,
                  tileScale: 7
                  });

// create dictionary of pixel count
var values = ee.Dictionary(count.get(classification_i.bandNames().get(0)));

// extract majority class
var majority_n = values.values().reduce('max'); 




print (majority_n)
print (values.getNumber(majority_n))
