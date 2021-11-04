// vectorize segments
// dhemerson.costa@ipam.org.br

// import cerrado extent
var cerrado = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-61.4311646830829, -2.175406912450765],
          [-61.4311646830829, -25.463689469703258],
          [-40.5131959330829, -25.463689469703258],
          [-40.5131959330829, -2.175406912450765]]], null, false);

// import segments
var segments = ee.Image('users/dh-conciani/segments/size_25');

// plot segments as images
Map.addLayer(segments.randomVisualizer(), {}, 'image');

// vectorize segments
var vectors = segments.reduceToVectors({
  geometry: cerrado,
  crs: segments.projection(),
  scale: 10,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'cluster',
  maxPixels: 60366972215
});

// plot vectors
Map.addLayer(vectors, {}, 'vector');

// Export an ee.FeatureCollection as an Earth Engine asset.
Export.table.toAsset({
  collection: vectors,
  description:'size_25_vector',
  assetId: 'users/dh-conciani/segments/size_25_vector',
});
