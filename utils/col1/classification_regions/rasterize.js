// get vector
var table = ee.FeatureCollection("users/dh-conciani/collection7/classification_regions/vector_v2");

// rasterize
var r = table
  .reduceToImage({
    properties: ['mapb'],
    reducer: ee.Reducer.min() // apply minimum reducer 
});

// plot
Map.addLayer(r.randomVisualizer(), {}, 'classification regions');

// export 10m image
Export.image.toAsset({
    'image': r,
    'description': 'raster_10m_v2',
    'assetId': 'users/dh-conciani/collection7/classification_regions/raster_10m_v2',
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': geometry,
    'scale': 10,
    'maxPixels': 1e13
});

// export each region as a image 
ee.List.sequence({'start': 1, 'end': 38}).getInfo().forEach(function(reg_i) {
  // get region i (img)
  var x = r.updateMask(r.eq(reg_i))//.aside(Map.addLayer);
  // get region i (geometry)
  var y = table.filterMetadata('mapb', 'equals', reg_i)//.aside(Map.addLayer);
  // export 
  Export.image.toAsset({
    'image': x,
    'description': 'reg_' + reg_i,
    'assetId': 'users/dh-conciani/collection7/classification_regions/eachRegion_v2_10m/reg_' + reg_i,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': y.geometry(),
    'scale': 10,
    'maxPixels': 1e13
  });
})
