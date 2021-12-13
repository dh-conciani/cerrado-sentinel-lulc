// Post-processing - Temporal filter
// For clarification, write to <dhemerson.costa@ipam.org.br> and <felipe.lenti@ipam.org.br>

// define input 
var bioma = "CERRADO";
var file_in = bioma + '_sentinel_gapfill_wetfor_spatial_freq_v31';

// define output
var dirout = 'users/dhconciani/sentinel-beta/sentinel-classification/';
var file_out = bioma + '_sentinel_gapfill_wetfor_spatial_freq_temporal_v';
var version_out = 31;

// import mapbiomas color ramp
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// read image 
var image_gapfill = ee.Image(dirout + file_in)
                      .slice(0, 5)
                      .aside(print);

// define rule (3 years)
var mask3 = function(valor, ano, imagem) {
  // replace different value in the middle when start and final years are the same class 
  var mask = imagem.select('classification_'+ (parseInt(ano) - 1)).eq (valor)
        .and(imagem.select('classification_'+ (ano)              ).neq(valor))
        .and(imagem.select('classification_'+ (parseInt(ano) + 1)).eq (valor))
  var muda_img = imagem.select('classification_'+ (ano)    ).mask(mask.eq(1)).where(mask.eq(1), valor);  
  var img_out = imagem.select('classification_'+ano).blend(muda_img);
  return img_out;
};

// define temporal window of each filter
var anos3 = ['2017', '2018', '2019'];

// set function to compare each by for each year
var window3years = function(imagem, valor){
   var img_out = imagem.select('classification_2016');
   for (var i_ano=0;i_ano<anos3.length; i_ano++) {  
     var ano = anos3[i_ano];   
     img_out = img_out.addBands(mask3(valor, ano, imagem)) }
     img_out = img_out.addBands(imagem.select('classification_2020'));
   return img_out;
};


var mask3valores = function(valor, ano, imagem){
  var mask = imagem.select('classification_'+ (parseInt(ano) - 1)).eq(valor[0])
        .and(imagem.select('classification_'+ (ano)              ).eq(valor[1]))
        .and(imagem.select('classification_'+ (parseInt(ano) + 1)).eq(valor[2]))
  var muda_img = imagem.select('classification_'+ (ano)    ).mask(mask.eq(1)).where(mask.eq(1), valor[3]);  
  var img_out = imagem.select('classification_'+ano).blend(muda_img);
  return img_out;
};

var window3valores = function(imagem, valor){
   var img_out = imagem.select('classification_2016');
   for (var i_ano=0;i_ano<anos3.length; i_ano++){  
     var ano = anos3[i_ano];   
     img_out = img_out.addBands(mask3valores(valor,ano, imagem)) }
     img_out = img_out.addBands(imagem.select('classification_2020'));
   return img_out;
};

// put "classification_2020 in the end of bands 
var original = image_gapfill.select('classification_2016');
for (var i_ano=0;i_ano<anos3.length; i_ano++){  
  var ano = anos3[i_ano]; 
  original = original.addBands(image_gapfill.select('classification_'+ano)) ;
}
original = original.addBands(image_gapfill.select('classification_2020')).aside(print);

// define recipe
var filtered = original;

// apply functions
var mask3first = function(valor, imagem){
  var mask = imagem.select('classification_2016').neq (valor)
        .and(imagem.select('classification_2017').eq(valor))
        .and(imagem.select('classification_2018').eq (valor));
  var muda_img = imagem.select('classification_2016').mask(mask.eq(1)).where(mask.eq(1), valor);  
  var img_out = imagem.select('classification_2016').blend(muda_img);
  img_out = img_out.addBands([imagem.select('classification_2017'),
                              imagem.select('classification_2018'),
                              imagem.select('classification_2019'),
                              imagem.select('classification_2020')]);
  return img_out;
};

// filter
//filtered = mask3first(12, filtered);
//filtered = mask3first(11, filtered);
//filtered = mask3first(4, filtered);
//filtered = mask3first(3, filtered);
//filtered = mask3first(21, filtered);

var mask3last = function(valor, imagem){
  var mask = imagem.select('classification_2018').eq (valor)
        .and(imagem.select('classification_2019').eq(valor))
        .and(imagem.select('classification_2020').neq (valor))
  var muda_img = imagem.select('classification_2019').mask(mask.eq(1)).where(mask.eq(1), valor);  
  var img_out = imagem.select('classification_2016')
  img_out = img_out.addBands([imagem.select('classification_2017'),
                              imagem.select('classification_2018'),
                              imagem.select('classification_2019')]);
  var img_out = img_out.addBands(imagem.select('classification_2020').blend(muda_img))
  return img_out;
}

// filter
//filtered = mask3last(21, filtered)
//print(filtered)

// define rules
filtered = window3valores(filtered, [21, 21, 11, 11])     // "deforestation" of wetland to mosaic rather than grassland
filtered = window3valores(filtered, [11, 21, 21, 12])     // "deforestation" of wetland to mosaic rather than grassland
filtered = window3valores(filtered, [21, 21, 12, 12])     // "deforestation" of grassland to mosaic rather than grassland
filtered = window3valores(filtered, [12, 21, 21, 12])     // "deforestation" of grassland to mosaic rather than grassland
filtered = window3valores(filtered, [3, 12, 21, 21])      // "deforestation" of forest to mosaic rather than grassland
filtered = window3valores(filtered, [3, 12, 12, 21])      // "deforestation" of forest to mosaic rather than grassland
filtered = window3valores(filtered, [4, 12, 21, 21])      // "deforestation" of savanna to mosaic rather than grassland
filtered = window3valores(filtered, [4, 12, 12, 21])      // "deforestation" of savana to mosaic rather than grassland

filtered = window3valores(filtered, [3, 33, 3, 3])        // avoid that forest change to water only one year
filtered = window3valores(filtered, [4, 33, 4, 4])        // avoid that savanna change to water only one year
filtered = window3valores(filtered, [12, 33, 12, 12])     // avois that grassland change to water only one year

// run order
var ordem_exec = [4, 12, 11, 3, 21, 33]; 

// apply
for (var i_class=0;i_class<ordem_exec.length; i_class++){  
   var id_class = ordem_exec[i_class]; 
   filtered = window3years(filtered, id_class);
}

// filtrar pontas
filtered = mask3first(12, filtered);
filtered = mask3first(11, filtered);
filtered = mask3first(4, filtered);
filtered = mask3first(3, filtered);
filtered = mask3first(21, filtered);
//////////
filtered = mask3last(21, filtered)


// mapbiomas color ramp
var vis = {
    'bands': 'classification_2020',
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// set properties 
filtered = filtered.set ("version", version_out).set ("step", "temporal");

// inspect and plot 
print(filtered)
Map.addLayer(original, vis, 'original');
Map.addLayer(filtered, vis, 'filtered');

// export ass GEE asset
Export.image.toAsset({
    'image': filtered,
    'description': file_out + version_out,
    'assetId': dirout + file_out + version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': filtered.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
