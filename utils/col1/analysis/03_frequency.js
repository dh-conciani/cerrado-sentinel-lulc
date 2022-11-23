//////// link do ppt, checar slide 12
//////// https://docs.google.com/presentation/d/1tohmIpkUNGQ2CQlpCQTbpuGkTneb4Kz4/edit#slide=id.gbfe6e5bbce_0_598


var palettes = require('users/mapbiomas/modules:Palettes.js');
var myPalette = palettes.get('classification2');
myPalette.push("grey");
print(myPalette);
// var Map = require('users/jeffjeff20072/hackthon_modual:Map.js');
// Map.setBasemap('Dark');
Map.setCenter(-49.33, -11.39, 5);
// // Add new themes
// Map.addThemes();

var dir = "projects/mapbiomas-workspace/public/collection3_1/mapbiomas_collection31_integration_v1";
var dirRegions = 'projects/mapbiomas-workspace/AUXILIAR/regioes2_1';
var brasil = ee.Image(dirRegions).eq(30);
var collection = ee.Image(dir).updateMask(brasil);

// Limite do BIOMA 
// Fonte: IBGE 2019
var biomasDir = "projects/mapbiomas-workspace/AUXILIAR/biomas-2019";
var biomaFeatureCollection = ee.FeatureCollection(biomasDir).filterMetadata("Bioma", "equals", "Cerrado").aside(Map.addLayer);
var ft_bioma  = biomaFeatureCollection;
Map.addLayer(ft_bioma)

// Grid com cartas 1:250.000
var gridFusionTable = 'ft:1wCmguQD-xQs2gMH3B-hdOdrwy_hZAq4XFw1rU8PN';
var gridFeatureCollection = ee.FeatureCollection(gridFusionTable);
                              

var fmap = function(feature){
  return feature;
};

var listCartas = gridFeatureCollection.map(fmap);
//var cartas = ee.List(listCartas.aggregate_array('name')).getInfo();

var anosMapa = ["2000", "2017"]
var anos = ['1985','1986','1987','1988','1989', '1990','1991','1992','1993','1994','1995','1996','1997','1998','1999','2000','2001','2002','2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017'];

var level3 = ee.List([
                 3, 4, 5, //Natural Forest Formation,
                 15, //Pasture,
                 9, //Forest Plantation,
                 11, 12, 13, 32, //Non Forest Formation,
                 21, //Mosaic of Agriculture and Pasture,
                 19, 20, 28, 36, 39, 41, //Agriculture,
                 23, 24, 25, 29, 30, //Non Vegetated Areas,
                 26, 33, 31, //Water Bodies,
                 27 //Non Observed
                 ]);
                 
var aggregate = ee.List([
                1, 1, 1,
                2,
                2, 
                1, 1, 1, 1,
                2,
                2, 2, 2,2,2,2,
                2, 2, 2, 2, 2,
                2, 2, 2,
                2
                ]);
                 
var ListClassBins = ee.List([]);

var collection2multiband = function (collection) {

    var imageList = collection.toList(collection.size()).slice(1);

    var multiBand = imageList.iterate(
        function (band, image) {

            return ee.Image(image).addBands(ee.Image(band));
        },
        ee.Image(collection.first())
    );

    return ee.Image(multiBand);
};


var remap2bin = function (listedYear) {
  var img = collection.select(ee.List(anos).indexOf(listedYear));
  var name = img.bandNames().get(0);
  img = img.remap(level3, aggregate, 0);
  
  return(img.rename(ee.String(name)));
} ;

var classBin = collection2multiband(ee.ImageCollection.fromImages(ee.List(anos).map(remap2bin).flatten()));
    print("teste", classBin);

var stable = classBin.reduce(ee.Reducer.countDistinct()).eq(1); 
var naturalStable = stable.eq(1).and(classBin.select(0).eq(1)); 
var naturalStableClasses = classBin.eq(1).updateMask(classBin.eq(1)).where(naturalStable.eq(1),
                                          collection);
    naturalStableClasses = naturalStableClasses.updateMask(naturalStableClasses.gt(1))  ;                                        
anosMapa.forEach(function(ano){
  Map.addLayer(naturalStableClasses.select("classification_"+ano),
                {min:0, max: 34, palette: myPalette}, "img", true);
});                                          

var classes = [3, 4, 11, 12];

var freq = ee.List(classes).map(function (k){
  k = ee.Number(k);
  var freqClass = naturalStableClasses.eq(ee.Image(k)).reduce(ee.Reducer.sum());
      freqClass = freqClass.updateMask(freqClass.neq(0));
  return (freqClass.rename(ee.String("class_").cat(ee.String(k))).unmask(0));
});
freq = collection2multiband(ee.ImageCollection.fromImages(freq)).aside(print);
freq = freq.updateMask(freq.gt(1));
Map.addLayer(freq.select(0),{min:1, max: 35, palette: myPalette}, "freq", true);

// separar por classe
var r_floresta = freq.select(['class_3'])
var r_savana = freq.select(['class_4'])
var r_campo = freq.select(['class_12'])
var r_wet = freq.select(['class_11'])

//// seguir com calculo de area para cada imagem
