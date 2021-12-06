// define root folder for the classification data
var file_path = 'users/dhconciani/sentinel-beta/sentinel-classification/';
// users/dhconciani/sentinel-beta/sentinel-classification/
// projects/mapbiomas-workspace/public/collection6/

var file_name = 'CERRADO_sentinel_gapfill_wetfor_spatial_freq_v31';
// CERRADO_sentinel_gapfill_wetfor_spatial_freq_v31
// mapbiomas_collection60_integration_v1

// import classification data - each band needs to correspond to one year 
var classification = ee.Image(file_path + file_name);

// import validation points 
var assetPoints = ee.FeatureCollection('projects/mapbiomas-workspace/VALIDACAO/MAPBIOMAS_100K_POINTS_utf8');
// import classification regions
var regionsCollection = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/CERRADO/cerrado_regioes_c6');

// import biomes vector
var biomes = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster');
// filter biomes vector only to Cerrado 
var vec_cerrado = biomes.updateMask(biomes.eq(4)); 

// define years to be assessed 
var years = [ 
            2016, 2017, 2018
            ];
            
// exclude this classes from validation points (for col6)
var excludedClasses = [
    "Não Observado",
    "Erro",
    "-",
    "Não consolidado",
    "Não consolidado",
    "Silvicultura",
    "silvicultura",
    "Floresta Plantada",
    "Cultura Anual",
    "Cultura Semi-Perene",
    "Mangue",
    "Mineração",
    "Outra Formação não Florestal",
    "Apicum",
    "Praia e Duna",
    "�rea �mida Natural n�o Florestal",
    "Área Úmida Natural não Florestal",
    "�rea �mida Natural N�o Florestal",
    "Área Úmida Natural Não Florestal",
    "Outra Forma��o Natural N�o Florestal",
    "Outra Formação Natural Não Florestal",
    "Rengeração",
    "Desmatamento"
]; 

// define pixel value that corresponds to each LAPIG class for col 6
var classes = ee.Dictionary({
  "Cultura Anual": 21,
  "Cultura Perene": 21,
  "Cultura Semi-Perene": 21,
  "Infraestrutura Urbana": 25,
  "Mineração": 25,
  "Pastagem Cultivada": 21,
  "Formação Florestal": 3,
  "Rio, Lago e Oceano": 33,
  "Outra Área não Vegetada": 25,
  "Formação Campestre": 12,
  "Afloramento Rochoso": 25,
  "Formação Savânica": 4,
  "Pastagem Natural": 12,
  "Aquicultura": 33,
  "Outra �rea N�o Vegetada": 25,
  "Outra Área Não Vegetada": 25
}); 

// create empty recipe to receive data
var recipe = ee.FeatureCollection([]);

// for each year:
years.forEach(function(year_i){
  // import image classification for the year [i]
  var classification_i = classification.select('classification_' + year_i);
  // use only vlaid pixels, that is, not equal to zero
      classification_i = classification_i.updateMask(classification_i.neq(0));
      
  // import validation points and filter only to Cerrado 
  var valPoints_i = assetPoints
                    .filterMetadata('POINTEDITE', 'not_equals', 'true')
                    .filterMetadata('BIOMA', 'equals', 'CERRADO')
                    .filter(ee.Filter.inList('CLASS_' + year_i, excludedClasses).not())
                    .map(function(feature) {
                      return feature.set('year', year_i).set('reference', classes.get(feature.get('CLASS_' + year_i)));
                    });
  
  // for each region:
  var computeAccuracy = regionsCollection.map(function(feature) {
    // clip classification for the year [i]
    var classification_ij = classification_i.clip(feature);
    
    // filter validation points to the year [i] 
    var valPoints_ij = valPoints_i.filterBounds(feature.geometry());
    
    // extract classification value for each point and pair it with the reference data
    var paired_data = classification_ij.sampleRegions({
                      collection: valPoints_ij, 
                      properties: ['reference'], 
                      scale: 30, 
                      geometries: false});
    
    // compute confusion matrix
    var confusionMatrix= paired_data.errorMatrix('classification_' + year_i, 'reference');
    
    // compute accuracy metrics
    var global_accuracy = confusionMatrix.accuracy();
    //var user_accuracy = confusionMatrix.consumersAccuracy();
    //var producer_accuracy = confusionMatrix.producersAccuracy();
   
    // insert accuracy metrics as metadata for each vector
    return feature.set('GLOBAL_ACC', global_accuracy)
                  .set('VERSION', file_name)
                  .set('YEAR', year_i);
    });
  
  // update recipe with yearly data
  recipe = recipe.merge(computeAccuracy);
  
  // set geometries to null
  recipe = recipe.map(function (feature) {
    return feature.setGeometry(null);
   }
  );
 
});

print(recipe);

//print (recipe);

// export result as CSV
Export.table.toDrive({
  collection: recipe,
  description: 'accuracy_' + file_name,
  folder: 'EXPORT',
  fileFormat: 'CSV'
});
