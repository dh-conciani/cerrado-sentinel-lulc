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

// compute the total number of pixels per segment
var size = segments.addBands(collection)
                      .reduceConnectedComponents({
                        'reducer': ee.Reducer.count(),
                        'labelBand': 'segments'
                        }
                      ).reproject('EPSG:4326', null, 10)
                    .rename('segment_size');

// compute the major class 
var major = segments.addBands(collection)
                    .reduceConnectedComponents({
                        'reducer': ee.Reducer.mode(), 
                        'labelBand': 'segments'
                        }
                      ).reproject('EPSG:4326', null, 10)
                    .rename('major_class');
                      
// compute the number of classes per segment
var nclass = segments.addBands(collection)
                    .reduceConnectedComponents({
                      'reducer': ee.Reducer.countDistinctNonNull(), 
                      'labelBand': 'segments'
                      }
                    ).reproject('EPSG:4326', null, 10)
                  .rename('n_class');

// per class proportion function 
// compute the per class pixel count  
var forest_size = segments.addBands(collection.updateMask(collection.eq(3)))
                          .reduceConnectedComponents({
                            'reducer': ee.Reducer.count(), 
                            'labelBand': 'segments'
                            }
                          ).reproject('EPSG:4326', null, 10)
                        .rename('size_forest');
                          

                      
                      
Map.addLayer(forest_size, vis, 'forest size');


// bind data
var data = major.addBands(nclass);

