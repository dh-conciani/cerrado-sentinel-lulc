// Post-processing - Compute per pixel incidence (number of changes) 
// For clarification, write to <dhemerson.costa@ipam.org.br> and <felipe.lenti@ipam.org.br>

// define input 
var version_in = 'CERRADO_sentinel_gapfill_v1';
var bioma = "CERRADO";

// define output
var version_out = 1;
var dirout = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO/SENTINEL/classification_sentinel/';

// import mapbiomas color ramp
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// load input
var imc_carta2 = ee.Image(dirout + version_in);

// define years to be assessed
var anos = ['2016', '2017', '2018', '2019', '2020'];

// define reclassification rules
var classeIds =    [3, 4, 11, 12, 15, 19, 21, 25, 33];
var newClasseIds = [3, 3, 12, 12, 21, 21, 21, 25, 27];

// define max frequency for each class
var options = {
    "classFrequency": {
        "3":  5, 
        "4":  5,
        "11": 5,
        "12": 5,
        "15": 5,
        "19": 5,
        "21": 5,
        "25": 5,
        "27": 5,
        "33": 5,
    },
};

var colList = ee.List([]);
for (var i_ano=0;i_ano<anos.length; i_ano++){
  var ano = anos[i_ano];
  var colList = colList.add(imc_carta2.select(['classification_'+ano],['classification']));
}
var imc_carta = ee.ImageCollection(colList);

var img1 =  ee.Image(imc_carta.first());

var image_moda = imc_carta2.reduce(ee.Reducer.mode());

// ******* incidence **********
var imagefirst = img1.addBands(ee.Image(0)).rename(["classification", "incidence"]);

var incidence = function(imgActual, imgPrevious){
  
  imgActual = ee.Image(imgActual);
  imgPrevious = ee.Image(imgPrevious);
  
  var imgincidence = imgPrevious.select(["incidence"]);
  
  var classification0 = imgPrevious.select(["classification"]);
  var classification1 = imgActual.select(["classification"]);
  
  
  var change  = ee.Image(0);
  change = change.where(classification0.neq(classification1), 1);
  imgincidence = imgincidence.where(change.eq(1), imgincidence.add(1));
  
  return imgActual.addBands(imgincidence);
  
};

var imc_carta4 = imc_carta.map(function(image) {
    image = image.remap(classeIds, newClasseIds, 27)
    image = image.mask(image.neq(27));
    return image.rename('classification');
});

Map.addLayer(imc_carta4, vis, 'imc_carta4');

var image_incidence = ee.Image(imc_carta4.iterate(incidence, imagefirst)).select(["incidence"]);
//image_incidence = image_incidence.clip(geometry);

var palette_incidence = ["#C8C8C8","#FED266","#FBA713","#cb701b", "#cb701b", "#a95512", "#a95512", "#662000",  "#662000", "#cb181d"];
imc_carta2 = imc_carta2.select(['classification_2016', 'classification_2017', 'classification_2018', 'classification_2019',
                                'classification_2020'], ['2016', '2017', '2018', '2019', '2020']);
                                
Map.addLayer(imc_carta2.select(['2020']), vis, 'MapBiomas'); 

// build incidence image and paste metadata
image_incidence = image_incidence.mask(image_incidence.gt(1))
                       .set("version", version_out)
                       .set("biome", "CERRADO")
                       .set("step", "prep_incid");

image_incidence = image_incidence.addBands(image_incidence.where(image_incidence.gt(1),1).rename('valor1'));
image_incidence = image_incidence.addBands(image_incidence.select('valor1').connectedPixelCount(100,false).rename('connect'));
image_incidence = image_incidence.addBands(image_moda);
print(image_incidence);
Map.addLayer(image_incidence, {}, "incidents");

// Export as GEE asset
Export.image.toAsset({
    'image': image_incidence,
    'description': 'CERRADO_sentinel_incidMask_v'+ version_out,
    'assetId': dirout+'CERRADO_sentinel_incidMask_v'+ version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': image_incidence.geometry(),
    'scale': 30,
    'maxPixels': 1e13
});
