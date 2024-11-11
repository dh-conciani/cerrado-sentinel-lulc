// --- --- --- 10_integration
// Post-processing: integration of the classification of 'rocky outcrop' (individual flow) with the classification of native vegetation and anthropic class [21]
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br

// Define input files
var native = ee.Image('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/CERRADO_S2-C1_gapfill_v10_seg_v10_frequency_v6_temporal_v18_FalseRegrowth_v6_geomorpho_v4_spatial_v6');
var rocky = ee.Image('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/CERRADO_col2_rocky_gapfill_v1_seg_v1_frequency_v4_spatial_v2');

print('Input native vegetation classification', native);
print('Input rocky outcrop classification', rocky);

// Import MapBiomas color ramp
var vis = {
    min: 0,
    max: 62,
    palette: require('users/mapbiomas/modules:Palettes.js').get('classification8'),
    bands: 'classification_2018'
};

// Plot input version
Map.addLayer(native, vis, 'Native vegetation');
Map.addLayer(rocky, vis, 'Rocky outcrop');

// Define ecoregions layer
var regions = ee.Image(1).clip(ee.FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2'));
var geometry = regions.geometry();

var scale = 10;

// Avoid the rocky outcrop class overlapping the grassland class in the Chapada dos Veadeiros region
var geometryVeadeiros = ee.Image(1).clip(ee.FeatureCollection(ee.Geometry.Polygon(
    [[[-47.91136858164175, -13.828379924704489],
      [-47.91136858164175, -14.275996243879357],
      [-47.28377458750113, -14.275996243879357],
      [-47.28377458750113, -13.828379924704489]]], null, false)));

var mask = regions.where(geometryVeadeiros.eq(1), 4);

// Create a container
var container = ee.Image([]);

// Integrate layers
ee.List.sequence({start: 2016, end: 2023}).getInfo().forEach(function(year) {
    // Get year-specific images
    var nativeYear = native.select(['classification_' + year]);
    var rockyYear = rocky.select(['classification_' + year]);
    
    // Integrate classifications
    var integratedYear = nativeYear.where(rockyYear.eq(29).and(mask.neq(4)), 29);
    
    // Apply a post-integration spatial filter
    // Compute the focal model
    var focalMode = integratedYear
                    .unmask(0)
                    .focal_mode({radius: 10, kernelType: 'square', units: 'pixels'});

    // Compute the number of connections
    var connections = integratedYear
                      .unmask(0)
                      .connectedPixelCount({maxSize: 100, eightConnected: false});

    // Get the focal model when the number of connections of the same class is lower than the parameter
    var toMask = focalMode.updateMask(connections.lte(6));

    // Apply filter
    integratedYear = integratedYear
                     .blend(toMask)
                     .reproject('EPSG:4326', null, 10)
                     .updateMask(regions);

    // Add to container data
    container = container.addBands(integratedYear);
});

// Plot integrated maps
Map.addLayer(container, vis, 'Integrated');
print('Output integrated classification', container);

var root = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/';

// Export as GEE asset
Export.image.toAsset({
    image: container,
    description: 'CERRADO_col2_native6_rocky2',
    assetId: root + 'CERRADO_col2_native6_rocky2',
    pyramidingPolicy: {
        '.default': 'mode'
    },
    region: native.geometry(),
    scale: scale,
    maxPixels: 1e13
});
