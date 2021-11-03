// remove outliers from stable pixels by using segmentation 
// dhemerson.costa@ipam.org.br

// import stable samples 
var stable_pixels = ee.Image('projects/mapbiomas-workspace/AUXILIAR/CERRADO/CE_amostras_estaveis85a20_col6_v2');

// import sample points (un-filtered)
var sample_points = ee.Image('projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-planet/samples_col6_CERRADO_v21');

// import sentinel mosaic for the year of 2020 
var sentinel = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics')
                .filterMetadata('biome', 'equals', 'CERRADO')
                .filterMetadata('version', 'equals', '1')
                .filterMetadata('year', 'equals', 2020)
                .mosaic()
                // update mask using the stable pixels
                .updateMask(stable_pixels.neq(0))
                .select(['swir1_median', 'nir_median', 'red_median']);

// import the color ramp module from mapbiomas 
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
                  size: 100,
  });

// plot segments
Map.addLayer(segments.select(['clusters']).randomVisualizer(), {}, 'segments');

// export segments
Export.image.toAsset({
    "image": segments.select(['clusters']),
    "description": 'size_100',
    "assetId": 'users/dh-conciani/segments/size_100',
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": stable_pixels.geometry()
});  
