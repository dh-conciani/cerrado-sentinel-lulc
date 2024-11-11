// -- -- -- -- 13_toWorkspace
// Export cerrado classification as a multiband image for the integration step
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br

// Input asset
var assetInput = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';
var fileName = 'CERRADO_col2_native6_rocky2';

// Classification input
var collection = ee.Image(assetInput + fileName);
print('Processing file', fileName);
print('Input collection', collection);

Map.addLayer(collection, {}, 'Input data');

// Output asset
var assetOutput = 'projects/mapbiomas-workspace/COLECAO9-S2/classificacao';

// Output version
var outputVersion = '7';

// Set the MapBiomas collection launch ID
var collectionId = 2.0;

// Define the biome or cross-cutting theme
var theme = {type: 'biome', name: 'CERRADO'};

// Define the data source
var source = 'ipam';

// Import MapBiomas color ramp
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification8');

// List of years
var years = [
  '2016', '2017', '2018', '2019', 
  '2020', '2021', '2022', '2023'
];

// Define the bounding box for Brazil
var geometry = ee.Geometry.Polygon(
    [
        [
            [-75.46319738935682, 6.627809464162168],
            [-75.46319738935682, -34.62753178950752],
            [-32.92413488935683, -34.62753178950752],
            [-32.92413488935683, 6.627809464162168]
        ]
    ], null, false
);


// Loop through each year
years.forEach(function(year) {
    var imageYear = collection.select('classification_' + year);

    imageYear = imageYear.rename('classification');

    // Set properties for the image
    imageYear = imageYear
        .set('territory', 'BRAZIL')
        .set('biome', 'CERRADO')
        .set('collection_id', collectionId)
        .set('version', outputVersion)
        .set('source', source)
        .set('year', parseInt(year, 10))
        .set('description', fileName);

    var vis = {
        min: 0,
        max: 62,
        palette: palette,
        format: 'png'
    };

    var name = year + '-' + outputVersion;

    if (theme.type === 'biome') {
        name = theme.name + '-' + name;
    }
    
    // Reclassify the mosaic of uses in Alto Paraguai watershed (BAP) with the Pantanal biome
    var assetPantanal = ee.Image('projects/mapbiomas-workspace/COLECAO9-S2/classificacao-pant/pant_s2_final_v1');
    var pantanalYear = assetPantanal.select('classification_' + year);
    var bapBoundaries = ee.Image(1).clip(ee.FeatureCollection('projects/barbaracosta-ipam/assets/collection-9/BAP_limit'));

    imageYear = imageYear.where(imageYear.eq(21)
        .and(pantanalYear.eq(3))
        .and(bapBoundaries.eq(1)), 4);
    
    imageYear = imageYear.where(imageYear.eq(21)
      .and(pantanalYear.eq(4))
      .and(bapBoundaries.eq(1)), 4);

    imageYear = imageYear.where(imageYear.eq(21)
        .and(pantanalYear.eq(12))
        .and(bapBoundaries.eq(1)), 12);

    // Add the processed image to the map
    Map.addLayer(imageYear, vis, theme.name + ' ' + year, false);
    print('Output year: ' + year, imageYear);

    // Export the image to an asset
    Export.image.toAsset({
        image: imageYear,
        description: name,
        assetId: assetOutput + '/' + name,
        pyramidingPolicy: {'.default': 'mode'},
        region: geometry,
        scale: 10,
        maxPixels: 1e13
    });

});

// Add the Cerrado boundary to the map
var cerrado = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas-2019').filter(ee.Filter.eq('Bioma', 'Cerrado'));
var line = ee.Image().paint(cerrado, 'empty', 3).visualize({palette: 'FF0000'});
Map.addLayer(line, {min: 0, max: 1}, 'Cerrado limit');
