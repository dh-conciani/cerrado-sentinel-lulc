// generate training msk based in stable pixels from mapbiomas collection 7.0, reference maps and GEDI (only for problematic regions)
// dhemerson.costa@ipam.org.br

// set area of interest 
var reg = 
    ee.Geometry.Polygon(
        [[[-54.943523595415975, -18.56364918420516],
          [-54.943523595415975, -22.624835447308353],
          [-50.636882970415975, -22.624835447308353],
          [-50.636882970415975, -18.56364918420516]]], null, false);

// string to identify the output version
var version_out = '2'; 

// import the color ramp module from mapbiomas 
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// set directory for the output file
var dirout = 'users/dh-conciani/collection7/0_sentinel/masks/';

// brazilian states 
var assetStates = ee.Image('projects/mapbiomas-workspace/AUXILIAR/estados-2016-raster');

// get classification regions
var class_reg = ee.Image('users/dh-conciani/collection7/classification_regions/raster_10m_v2');
class_reg = class_reg.updateMask(class_reg.eq(27)).blend(class_reg.updateMask(class_reg.eq(23)));


// load mapbiomas collection 
var col = ee.Image('projects/mapbiomas-workspace/public/collection7/mapbiomas_collection70_integration_v2');

///////////// import data to mask stable pixels ////////// 
// PROBIO
var probioNV = ee.Image('users/felipelenti/probio_cerrado_ras');
    probioNV = probioNV.eq(1); // select only deforestation (value= 0)

// PRODES 00-21
var prodesNV = ee.Image('users/dh-conciani/basemaps/prodes_cerrado_00-21')
                  .remap([0, 2, 4, 6, 8, 10, 12, 13, 15, 14, 16, 17, 18, 19, 20, 21, 96, 97, 98, 99, 127],
                         [1, 1, 1, 1, 1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,   0]);
                         // deforestation equals to 1
    
// Inventário Florestal do Estado de São Paulo (World-View <1m)
var SEMA_SP = ee.Image('projects/mapbiomas-workspace/VALIDACAO/MATA_ATLANTICA/SP_IF_2020_2')
                .remap([3, 4, 5, 9, 11, 12, 13, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 29, 30, 31, 32, 33],
                       [3, 4, 3, 9, 11, 12, 12, 15, 19, 19, 19, 21, 25, 25, 25, 25, 33, 25, 25, 25, 25, 33]);
                       
                // select only native vegetation patches
                var SEMA_bin = SEMA_SP.remap([3, 4, 9, 11, 12, 15, 19, 21, 25, 33],
                                             [1, 1, 0,  1,  1,  0,  0,  0,  0,  0]);
                // crop only for são paulo's 
                var SEMA_bin = SEMA_bin.unmask(0).updateMask(assetStates.eq(35));

// Mapa Temático do CAR para áreas úmidas do Estado do Tocantins (RapidEye 2m)
var SEMA_TO = ee.Image('users/dh-conciani/basemaps/TO_Wetlands_CAR');
    SEMA_TO = SEMA_TO.remap([11, 50, 128],
                            [11, 11, 0]);
                            
// global tree canopy (Lang et al, 2022) http://arxiv.org/abs/2204.08322
var tree_canopy = ee.Image('users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1');
Map.addLayer(tree_canopy, {palette: ['red', 'orange', 'yellow', 'green'], min:0, max:30}, 'tree canopy', false);

//////// end of products to filter stable samples ////////// 

// remap collection 7
var colx = ee.Image([]);
ee.List.sequence({'start': 2016, 'end': 2021}).getInfo()
  .forEach(function(year_i) {
    // get year i
    var x = col.select(['classification_' + year_i])
              .remap( [3, 4, 5, 11, 12, 29, 15, 39, 20, 40, 41, 46, 47, 48, 21, 23, 24, 30, 25, 33, 31, 9],
                      [3, 4, 3, 11, 12, 29, 15, 19, 19, 19, 19, 19, 19, 19, 21, 25, 25, 25, 25, 33, 33, 9])
                      .rename('classification_' + year_i);
    // insert into col
    colx = colx.addBands(x);
    
  });
  
// get pixels that no changed
var nChanges = colx.reduce(ee.Reducer.countRuns()).subtract(1);

// get stable pixels
var stable = colx.select('classification_2021').updateMask(nChanges.eq(0)).updateMask(class_reg);
Map.addLayer(stable, vis, 'stable', false);

//////////////// process masks to improve stable pixels 
// mask native vegetation pixels by usign deforestation from PROBIO
var referenceMapRef = stable;
                        //.where(probioNV.eq(0)
                        //.and(referenceMap.eq(3)
                        //.or(referenceMap.eq(4)
                        //.or(referenceMap.eq(12)))), 27);
                        
// mask native vegetation by using PRODES (from 2000 to 2021)
var referenceMapRef = referenceMapRef.where(prodesNV.eq(1)
                        .and(referenceMapRef.eq(3)
                        .or(referenceMapRef.eq(4)
                        .or(referenceMapRef.eq(11)
                        .or(referenceMapRef.eq(12))))), 27);

// mask using the "Inventario Florestal do Estado de São Paulo
// erase native vegetation samples that was not native vegetation on reference data
var referenceMapRef = referenceMapRef.where(SEMA_bin.eq(0)
                          .and(referenceMapRef.eq(3)
                          .or(referenceMapRef.eq(4)
                          .or(referenceMapRef.eq(11)
                          .or(referenceMapRef.eq(12))))), 27)
// erase anthropogenic classes from mapbiomas that was classified as natural on reference data
                        .where(SEMA_bin.eq(1)
                          .and(referenceMapRef.eq(15)
                          .or(referenceMapRef.eq(19)
                          .or(referenceMapRef.eq(21)))), 27);

// remove grassland pixels from sao paulo state
var referenceMapRef = referenceMapRef.where(referenceMapRef.eq(12).and(assetStates.eq(35)), 27);

// insert raw grassland from reference into são paulo state
var referenceMapRef = referenceMapRef.blend(SEMA_SP.updateMask(SEMA_SP.eq(12)));

// select  pixels that Mapbiomas and IF-SP agree that are tha same native vegetation class
    // forest
var referenceMapRef = referenceMapRef.where(referenceMapRef.eq(3).and(SEMA_SP.eq(3)), 3)
                                     .where(referenceMapRef.eq(3).and(SEMA_SP.neq(3)), 27)
                                     .where(referenceMapRef.neq(3).and(SEMA_SP.eq(3)), 3)
                                     // savanna
                                     .where(referenceMapRef.eq(4).and(SEMA_SP.eq(4)), 4)
                                     .where(referenceMapRef.eq(4).and(SEMA_SP.neq(4)), 27)
                                     .where(referenceMapRef.neq(4).and(SEMA_SP.eq(4)), 4)
                                     // wetland 
                                     .where(referenceMapRef.eq(11).and(SEMA_SP.eq(11)), 11)
                                     .where(referenceMapRef.eq(11).and(SEMA_SP.neq(11)), 11)
                                     .where(referenceMapRef.neq(11).and(SEMA_SP.eq(11)), 11);

// rect wetalnds from Tocantins state by using SEMA-CAR reference map
var referenceMapRef = referenceMapRef.where(SEMA_TO.eq(11).and(referenceMapRef.eq(11)), 11)
                                     .where(SEMA_TO.eq(11).and(referenceMapRef.eq(3)), 3)
                                     .where(SEMA_TO.eq(11).and(referenceMapRef.eq(4)), 11)
                                     .where(SEMA_TO.eq(11).and(referenceMapRef.eq(12)), 11)
                                     .where(SEMA_TO.eq(11).and(referenceMapRef.eq(27)), 11);
                                     
// discard masked pixels
var referenceMapRef = referenceMapRef.updateMask(referenceMapRef.neq(27));

// plot correctred stable samples
Map.addLayer(referenceMapRef, vis, 'filtered by basemaps', false);

// filter pixels by using GEDi derived tree canopy
var gedi_filtered = referenceMapRef.where(referenceMapRef.eq(3).and(tree_canopy.lt(8)), 50)
                                   .where(referenceMapRef.eq(4).and(tree_canopy.lte(2)), 50)
                                   .where(referenceMapRef.eq(4).and(tree_canopy.gte(12)), 50)
                                   .where(referenceMapRef.eq(11).and(tree_canopy.gte(15)), 50)
                                   .where(referenceMapRef.eq(12).and(tree_canopy.gte(6)), 50)
                                   .where(referenceMapRef.eq(15).and(tree_canopy.gte(8)), 50)
                                   .where(referenceMapRef.eq(19).and(tree_canopy.gt(7)), 50)
                                   .where(referenceMapRef.eq(25).and(tree_canopy.gt(0)), 50)
                                   //.where(referenceMapRef.eq(29).and(tree_canopy.gt(3)), 50)
                                   .where(referenceMapRef.eq(33).and(tree_canopy.gt(0)), 50);

// remove masked values
var stable_pixels = gedi_filtered.updateMask(gedi_filtered.neq(50));

// plot map                               
Map.addLayer(stable_pixels, vis, 'filtered + basemaps + gedi', false);

// remove small fragments
// get number of connections
var connections = stable_pixels.connectedPixelCount({'maxSize': 100, 'eightConnected': false});
// remove packs less than 3 hectare
var stable_pixels = stable_pixels.updateMask(connections.gte(33));

Map.addLayer(stable_pixels, vis, 'filtered + basemaps + gedi + area');

// explort to workspace asset
Export.image.toAsset({
    "image": stable_pixels.toInt8(),
    "description": 'cerrado_stablePixels_col7_v' + version_out,
    "assetId": dirout + 'cerrado_stablePixels_col7_v'+ version_out,
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": reg
});  
