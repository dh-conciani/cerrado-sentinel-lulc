// remove outliers from stable pixels by using segmentation, percentil reducer, validation and new samples
// dhemerson.costa@ipam.org.br

// define dir to export new samples
var dirout = 'projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-planet';
// define output version
var version = '31';

// cerrado extent
var cerrado_extent = ee.Geometry.Polygon(
        [[[-62.30982042125685, -0.9217170277068568],
          [-62.30982042125685, -25.759333772762382],
          [-39.63403917125685, -25.759333772762382],
          [-39.63403917125685, -0.9217170277068568]]], null, false);

// import datasets 
// stable samples 
var stable_pixels = ee.Image('projects/mapbiomas-workspace/AUXILIAR/CERRADO/CE_amostras_estaveis85a20_col6_v2');

// color ramp module from mapbiomas 
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// mapbiomas classification
var mapbiomas = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1')
                  .select('classification_2020')
                  .remap(
                  [3, 4, 5, 9,  11, 12, 13, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 29, 30, 31, 32, 33, 46, 47, 48],
                  [3, 4, 3, 9,  11, 12, 12, 15, 19, 19, 19, 21, 25, 25, 25, 25, 33, 25, 25, 25, 25, 33, 19, 19, 19]
                  )
                  .rename('classification_2020');

// sample points (un-filtered)
var sample_points = ee.FeatureCollection('projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-planet/samples_col6_CERRADO_v21');
/* color ponts using mapbiomas color ramp
var samplesStyled = sample_points.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(require('users/mapbiomas/modules:Palettes.js').get('classification6'))
                .get(feature.get('reference')),
            'width': 1,
        });
    }
).style(
    {
        'styleProperty': 'style'
    }
);
*/

// sentinel mosaic for the year of 2020 
var sentinel = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics')
                .filterMetadata('biome', 'equals', 'CERRADO')
                .filterMetadata('version', 'equals', '1')
                .filterMetadata('year', 'equals', 2020)
                .mosaic();

// plot sentinel mosaic
/*
Map.addLayer(sentinel, {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
}, 'Sentinel', true);
*/

// plot mapbiomas 
//Map.addLayer(mapbiomas, vis, 'mapbiomas [remmaped]', false);

// import cerrado vector 
var cerrado = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas-2019')
                .filterMetadata('Bioma', 'equals', 'Cerrado');
                
// import ibge cartas and filter to cerrado 
var cartas = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/cartas")
              .filterBounds(cerrado);

// create a list of values to iterate              
var summary = cartas.aggregate_array('grid_name');

// create an empty recipe
var recipe = ee.FeatureCollection([]);

// for each carta
summary.getInfo().forEach(function(carta_i) {
    // clip sentinel mosaic to carta [i]
    var sentinel_i = sentinel.clip(cartas.filterMetadata('grid_name', 'equals', carta_i));
      /*
      Map.addLayer(sentinel_i, {
      'bands': ['swir1_median', 'nir_median', 'red_median'],
      'gain': [0.08, 0.07, 0.2],
      'gamma': 0.85
      }, 'Sentinel IC. ' + carta_i, true);
      */

    // clip mapbiomas to region [i]
    var mapbiomas_i = mapbiomas.clip(cartas.filterMetadata('grid_name', 'equals', carta_i));
    //Map.addLayer(mapbiomas_i, vis, 'mapbiomas IC. ' + carta_i, false);
    
    // filterbounds of the points
    var sample_points_i = sample_points.filterBounds(cartas.filterMetadata('grid_name', 'equals', carta_i));
        //print ('number of points IC. ' + carta_i, sample_points_i.size());
        // apply mapbiomas style to points
        var samplesStyled = sample_points_i.map(
            function (feature) {
                return feature.set('style', {
                    'color': ee.List(require('users/mapbiomas/modules:Palettes.js').get('classification6'))
                        .get(feature.get('reference')),
                    'width': 1,
                });
            }
        ).style(
            {
                'styleProperty': 'style'
            }
        );
        
    // plot sample points
    //Map.addLayer(samplesStyled, {}, 'raw samples IC.' + carta_i, false);
        
    // define bandnames to be used in the segmentation 
    var segment_bands = ["blue_median", "green_median", "red_median", "nir_median", "swir1_median", "swir2_median"];
  
    // define function to create segments
    var getSegments = function (image, size) {
      // define the seed
      var seeds = ee.Algorithms.Image.Segmentation.seedGrid(
          {
              size: size,
              gridType: 'square'
          }
      );
      // create segments
      var snic = ee.Algorithms.Image.Segmentation.SNIC({
          image: image,
          size: size,
          compactness: 1,
          connectivity: 8,
          neighborhoodSize: 2 * size,
          seeds: seeds
      });
      // paste properties
      snic = ee.Image(
          snic.copyProperties(image)
              .copyProperties(image, ['system:footprint'])
              .copyProperties(image, ['system:time_start']));
      // out
      return snic.select(['clusters'], ['segments']);//.int64();
  };
  
  // create segments
  var segments = getSegments(sentinel_i.select(segment_bands), 25);
      // reproject
      segments = segments.reproject('EPSG:4326', null, 10);
      //print ('raw segments', segments);
      
  // plot segments
  //Map.addLayer(segments.randomVisualizer(), {}, 'segments IC. ' + carta_i, false);
      
  // define function to select only segments that overlaps sample points
  var selectSegments = function (segments, validateMap, samples) {
    // extract training sample class 
      var samplesSegments = segments.sampleRegions({
          collection: samples,
          properties: ['reference'],
          scale: 10,
          // geometries: true
      });
      
    // extract the segment number 
      var segmentsValues = ee.List(
          samplesSegments.reduceColumns(
              ee.Reducer.toList().repeat(2),
              ['reference', 'segments']
          ).get('list')
      );
  
      //print(segmentsValues.get(1),
      //      segmentsValues.get(0));
  
      var similiarMask = segments.remap(
          ee.List(segmentsValues.get(1)),
          ee.List(segmentsValues.get(0)),
          0
      );
  
      return similiarMask.rename(['class']);
  };
  
  // apply function to select segments
  var selectedSegments = selectSegments(segments, mapbiomas_i, sample_points_i);
      selectedSegments = selectedSegments.selfMask().rename(['class']);
  
  //print ('filtered segments', selectedSegments);
  //Map.addLayer(selectedSegments, vis, 'selected segments IC. ' + carta_i, false);
  
  // create percentil rule
  var percentil = segments.addBands(mapbiomas_i).reduceConnectedComponents(ee.Reducer.percentile([5, 95]), 'segments');
  
  // validate and retain only segments with satifies percentil rule
  var validated = percentil.select(0).multiply(percentil.select(0).eq(percentil.select(1)));
  var selectedSegmentsValidated = selectedSegments.mask(selectedSegments.eq(validated)).rename('class');
  
  // plot validated
  print ('validated segments', selectedSegmentsValidated);
  //Map.addLayer(selectedSegmentsValidated, vis, 'validated segments', false);
  
  // create a new set of samples based on the validated segments
  var newSamples = selectedSegmentsValidated
      .sample({
          region: sentinel_i.geometry(),
          scale: 10,
          factor: 0.01, // select 1% of the validated pixels as new samples
          dropNulls: true,
          geometries: true
      });
      
      print (carta_i, 'raw: ', ee.Number(sample_points_i.size()),
                      'new: ', ee.Number(newSamples.size()));
      
  // apply style to new points
  var newSamplesStyled = newSamples.map(
      function (feature) {
          return feature.set('style', {
               'color': ee.List(require('users/mapbiomas/modules:Palettes.js').get('classification6'))
                  .get(feature.get('class')),
              'width': 1,
          });
      }
  ).style(
      {
          'styleProperty': 'style'
      }
  );
  
  // plot new points
  //Map.addLayer(newSamplesStyled, {}, 'new samples', true);
  
  // merge into recipe
  recipe = recipe.merge(newSamples);
});

// export new training points
// export as GEE asset
Export.table.toAsset(recipe,
  'samples_col6_' +'CERRADO' + '_v' + version,
  dirout + '/samples_col6_' + 'CERRADO' + '_v' + version);
