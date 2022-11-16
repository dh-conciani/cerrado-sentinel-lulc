// send mapping to pre-integration folder
// dhemerson.costa@ipam.org.br
           
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification6');

// Defina seu asset de entrada
var assetInput = 'users/dh-conciani/collection7/0_sentinel/c1-general-post';
var file_name = 'CERRADO_sentinel_gapfill_freq_temporal_spatial_12';

// Carregue a sua coleção aqui
var collection = ee.Image(assetInput + '/' + file_name);

// Defina seu asset de saída
var assetOutput = 'projects/mapbiomas-workspace/COLECAO7-S2/classificacao';

// Defina a versão de saída
var outputVersion = '1';

// Defina o id de lançamento da coleção mapbiomas
var collectionId = 1;

// Se for bioma use este.
var theme = { 'type': 'biome', 'name': 'CERRADO' };

// Defina a fonte produto do dado
var source = 'ipam';

// Todos os anos mapeados na coleção 6
var years = [
    '2016', '2017', '2018', '2019', '2020', '2021', '2022'
];

// Boundary box de todo o Brasil
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

// get hand
var hand = ee.ImageCollection("users/gena/global-hand/hand-100")
  .mosaic()
  .toInt16()
  .clip(geometry)
  .rename('hand')
  .gte(15);
  //Map.addLayer(hand.randomVisualizer());
  
var tree_canopy = ee.Image('users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1');
Map.addLayer(tree_canopy, {palette: ['red', 'orange', 'yellow', 'green'], min:0, max:30}, 'tree canopy', false);
  
// A digital elevation model.
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
// Calculate slope. Units are degrees, range is [0,90).
var slope = ee.Terrain.slope(dem);
//Map.addLayer(slope, {palette:['green', 'yellow', 'orange', 'red'], min:0, max:5}, 'slope');

// mask 1
var wetland_to_savanna = ee.Image(1).clip(wetland_to_savanna);

// mask 2
var savanna_to_forest = ee.Image(1).clip(reg_1_2);
Map.addLayer(savanna_to_forest);

years.forEach(
    function (year) {

        var imageYear = collection.select('classification_' + year);

        imageYear = imageYear.rename('classification');

        imageYear = imageYear
            .set('territory', 'BRAZIL')
            .set('biome', 'CERRADO')
            .set('year', parseInt(year, 10))
            .set('version', outputVersion)
            .set('collection', collectionId)
            .set('source', source)
            .set('description', 'native9_rocky3');

        var vis = {
            'min': 0,
            'max': 49,
            'palette': palette,
            'format': 'png'
        };

       var name = year + '-' + outputVersion;

        if (theme.type === 'biome') {
            name = theme.name + '-' + name;
        }
        
        print(imageYear);
        Map.addLayer(imageYear, vis, theme.name + ' PRE-INT ' + year, false);
        
        // perform reclassification of mosaic of agriculture and pasture to pasture into protected areas (except APAs and TIs)
        // build mask
        // import protected areas
        var pa = ee.Image(1).clip(
                    ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/areas-protegidas')
                            .filterMetadata('categoria', 'not_equals', 'APA')
                            .filterMetadata('categoria', 'not_equals', ''));

        // remap mosaic of uses into PAs to pasture
        imageYear = imageYear.where(imageYear.eq(21).and(pa.eq(1)), 15)
          // remap wetland with hand greater to 15m and within PAs to grassland 
          .where(imageYear.eq(11).and(hand.eq(1).and(pa.eq(1))), 12)
          // remap wetland into mask to savanna (brasília)
          .where(imageYear.eq(11).and(wetland_to_savanna.eq(1)), 4)
          // remap savanna into mask and with tree heigth greater than x to forest (border betweens regions 1-2)
          .where(imageYear.eq(4).and(savanna_to_forest.eq(1).and(tree_canopy.gt(10))), 3);

        
        Map.addLayer(imageYear, vis, theme.name + ' ' + year, false);

        Export.image.toAsset({
            'image': imageYear,
            'description': name,
            'assetId': assetOutput + '/' + name,
            'pyramidingPolicy': {
                '.default': 'mode'
            },
            'region': geometry,
            'scale': 10,
            'maxPixels': 1e13
        });
    }
);
