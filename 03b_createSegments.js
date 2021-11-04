// remove outliers from stable pixels by using segmentation 
// dhemerson.costa@ipam.org.br

// import datasets 
// stable samples 
var stable_pixels = ee.Image('projects/mapbiomas-workspace/AUXILIAR/CERRADO/CE_amostras_estaveis85a20_col6_v2');

// sample points (un-filtered)
var sample_points = ee.FeatureCollection('projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-planet/samples_col6_CERRADO_v21');

// sentinel mosaic for the year of 2020 
var sentinel = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics')
                .filterMetadata('biome', 'equals', 'CERRADO')
                .filterMetadata('version', 'equals', '1')
                .filterMetadata('year', 'equals', 2020)
                .mosaic()
                .select(['swir1_median', 'nir_median', 'red_median']);

// color ramp module from mapbiomas 
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// plot sentinel mosaic
Map.addLayer(sentinel, {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.07, 0.2],
    'gamma': 0.85
}, 'Sentinel', true);

// plot stable pixels
Map.addLayer(stable_pixels, vis, 'stable pixels');

// segment sentinel mosaic usign SNIC
var segments = ee.Algorithms.Image.Segmentation.SNIC({
                  image: sentinel,
                  compactness: 0,
                  connectivity: 8,
                  size: 25,
  });

// plot segments
Map.addLayer(segments.select(['clusters']).randomVisualizer(), {}, 'segments', false);

// plot sample points
Map.addLayer(sample_points, {}, 'points', false);

// function to build buffers 
var getBuffer = function (obj) {
  // generate buffer
  return(obj.buffer({
              'distance': 500})
  );
};

// execute function to generate buffer
var sample_buffer = sample_points.map(getBuffer);

// plot buffers
Map.addLayer(sample_buffer, {}, 'buffer', false);

/* vectorize segments within each buffer 
var vecSegments = function (obj) {
  // clip segments 
  var buffered_segment = segments.select(['clusters']).clip(obj);
  // vectorize segments
  return(buffered_segment.reduceToVectors({
          crs: buffered_segment.projection(),
          scale: 10,
          geometryType: 'polygon',
          eightConnected: false,
          labelProperty: 'clusters',
          maxPixels: 60366972215
    }).flatten()
  );
};
*/

// execute function to vectorize segments within buffers
// var vectorized_segments = sample_buffer.map(vecSegments);

// clip segments using the buffer
var clipped_segments = segments.select(['clusters']).clipToCollection(sample_buffer);

// plot clipped segments
Map.addLayer(clipped_segments.randomVisualizer(), {}, 'clipped segments');


