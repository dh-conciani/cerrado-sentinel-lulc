// Sort stratified spatialPoints by region using stable pixels
// For clarification, write to <dhemerson.costa@ipam.org.br> and <felipe.lenti@ipam.org.br>

// define string to use as metadata
var bioma = "CERRADO";     // ibge's biome
var versao = '21';         // label string

// define sample size
var sampleSize = 7000;     // by region
var nSamplesMin = 700;     // minimum sample size by class

// collection 6.0 stable pixels (generated by step 1)
var dirsamples = ee.Image('projects/mapbiomas-workspace/AUXILIAR/CERRADO/CE_amostras_estaveis85a20_col6_v2');

// Collection 6.0 - class area by region table (generated by step 2)
var regioesCollection = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/CERRADO/Cerrado_regions_col6_area2000_v2');

// output path
var dirout = 'projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-planet';

// import mapbiomas module
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'bands': ['reference'],
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// plot stable pixels
Map.addLayer(dirsamples, vis, 'stable samples', true);
print(regioesCollection.size());

////////////////////////////////////////////////////////
var getTrainingSamples = function (feature) {
  var regiao = feature.get('mapb');
  var floresta = ee.Number(feature.get('floresta'));
  var savana = ee.Number(feature.get('savana'));
  var silv = ee.Number(feature.get('silv'));
  var umida = ee.Number(feature.get('umida'));
  var campo = ee.Number(feature.get('campo'));
  var pasto = ee.Number(feature.get('pasto'));
  var agro = ee.Number(feature.get('agric'));
  var nao_veg = ee.Number(feature.get('nao_veg'));
  var agua = ee.Number(feature.get('agua'));
  
  // compute the total area 
  var total = floresta.add(savana).add(umida).add(campo)
              .add(pasto).add(agro).add(silv).add(nao_veg).add(agua);
  
  // compute the number of samples for each class   
  var sampleFloSize = ee.Number(floresta).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var sampleSavSize = ee.Number(savana).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var sampleWetSize = ee.Number(umida).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var sampleCamSize = ee.Number(campo).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var samplePasSize = ee.Number(pasto).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var sampleAgrSize = ee.Number(agro).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var sampleSilSize = ee.Number(silv).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var sampleNVeSize = ee.Number(nao_veg).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  var sampleAguSize = ee.Number(agua).divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  
  // balance samples
  var factor = ee.Number(1); // factor is the integral number, in which we add or subtract proportions
  sampleFloSize = sampleFloSize.multiply(factor.add(0.30)).int(); // add 30% for forest
  sampleCamSize = sampleCamSize.multiply(factor.add(0.30)).int(); // add 30% for grassland
  sampleWetSize = sampleWetSize.multiply(factor.subtract(0.15)).int(); // subtract 30% of wetlands
  
  // clip stable pixels only to feature  
  var clippedGrid = ee.Feature(feature).geometry();
  var referenceMap =  dirsamples.clip(clippedGrid);
                      
  // generate points
  var training = referenceMap.stratifiedSample({scale:30, classBand: 'reference', numPoints: 0, region: feature.geometry(), seed: 4589, geometries: true,
           classValues: [3, 4, 11, 12, 15, 19, 9, 25, 33], 
           classPoints: [sampleFloSize, sampleSavSize, sampleWetSize, sampleCamSize,
                         samplePasSize, sampleAgrSize, sampleSilSize, sampleNVeSize, sampleAguSize]
  });
  
  training = training.map(function(feat) {return feat.set({'mapb': regiao})});
    
  return training;
 };

// apply function
var mySamples = regioesCollection.map(getTrainingSamples).flatten();

// plot points
Map.addLayer(mySamples, vis, 'Pontos de treinamento');

// print diagnosis
print('umida', mySamples.filterMetadata('reference', 'equals', 11).size());
print('campo', mySamples.filterMetadata('reference', 'equals', 12).size());
print('floresta', mySamples.filterMetadata('reference', 'equals', 3).size());
print('savana', mySamples.filterMetadata('reference', 'equals', 4).size());
print('pasture', mySamples.filterMetadata('reference', 'equals', 15).size());

print(mySamples.limit(1));

// export as GEE asset
Export.table.toAsset(mySamples,
  'samples_col6_' + bioma + '_v' + versao,
  dirout + '/samples_col6_' + bioma + '_v' + versao,
  dirout + '/samples_col6_' + bioma + '_v' + versao);
