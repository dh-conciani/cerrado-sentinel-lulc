// Compute area by ecoregion
// For clarification, write to <dhemerson.costa@ipam.org.br> and <felipe.lenti@ipam.org.br>

// input metadata
var version = '_v1';
var bioma = "CERRADO";

// output directory
var dirout = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO';

// cerrado classification regions
var regioesCollection = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/CERRADO/cerrado_regioes_c6');

// mapbiomas color pallete
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// define year to be used as reference
var ano = '2000';

// define function to compute area in squared kilometers
var pixelArea = ee.Image.pixelArea().divide(1000000);

// load collection 5.0 
var colecao6 = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1').select('classification_'+ano);

// reclassify only to classes that cerrado maps
colecao6 = colecao6.select('classification_'+ ano).remap(
                  [3, 4, 5,  9, 11, 12,13,15,18,19,20,21,22,23,24,25,26,29,30,31,32,33,39,40,41,46,47,48],
                  [3, 4, 3, 21, 11, 12,12,15,19,19,19,21,25,25,25,25,33,25,25,25,25,33,19,19,19,19,19,19]);

// plot 
Map.addLayer(colecao6, vis, 'Coleção 6 '+ano, false);

// generate a image by each one of the classes
  var area03 = pixelArea.mask(colecao6.eq(3));
  var area04 = pixelArea.mask(colecao6.eq(4));
  var area11 = pixelArea.mask(colecao6.eq(11));
  var area12 = pixelArea.mask(colecao6.eq(12));
  var area15 = pixelArea.mask(colecao6.eq(15));
  var area19 = pixelArea.mask(colecao6.eq(19));
  var area21 = pixelArea.mask(colecao6.eq(21));
  var area25 = pixelArea.mask(colecao6.eq(25));
  var area33 = pixelArea.mask(colecao6.eq(33));

// define .map function to apply area computation over each classification region
var processaReg = function(regiao) {
  regiao = regiao.set('floresta', ee.Number(area03.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('savana', ee.Number(area04.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('umida', ee.Number(area11.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('campo', ee.Number(area12.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('pasto', ee.Number(area15.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('agric', ee.Number(area19.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('mosaico', ee.Number(area21.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('nao_veg', ee.Number(area25.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  regiao = regiao.set('agua', ee.Number(area33.reduceRegion({reducer: ee.Reducer.sum(),geometry: regiao.geometry(), scale: 30,maxPixels: 1e13}).get('area')));
  return regiao;
};

// apply function 
var regiao2 = regioesCollection.map(processaReg);
print(regiao2);

// export computation as GEE asset
Export.table.toAsset(regiao2, 'Cerrado_regions_col6_area' + ano + version, dirout + '/Cerrado_regions_col6_area'+ano +version);

// plot 
var blank = ee.Image(0).mask(0);
var outline = blank.paint(regioesCollection, 'AA0000', 2); 
var visPar = {'palette':'000000','opacity': 0.6};
Map.addLayer(regioesCollection, visPar, 'Região', true);
