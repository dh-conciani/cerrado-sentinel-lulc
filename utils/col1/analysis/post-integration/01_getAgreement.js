// avaliar diferenças no mapeamento de vegetação nativa entre landsat-8 e sentinel-2
// dhemerson.costa@ipam.org.br

// ler recorte de biomas
var biomes = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster');

// ler coleção 7
var col = ee.Image('projects/mapbiomas-workspace/public/collection7/mapbiomas_collection70_integration_v2')
            //recortar para o cerrado
            .updateMask(biomes.eq(4));

// ler coleção sentinel 
var sen = ee.ImageCollection('projects/mapbiomas-workspace/COLECAO7-S2/integracao')
              .filter(ee.Filter.eq('version', '0-1'))
              .mosaic()
              .updateMask(biomes.eq(4));


// listar anos para poerformar a análise
var years = [2016, 2017, 2018, 2019, 2020, 2021];

// listar classes para performar a análise 
var classes = [3, 4, 11, 12];

// para cada classe 
classes.forEach(function(class_i) {
  // para cada ano
  var images = ee.Image([]);

  years.forEach(function(year_j) {
    // selecionar a classificação do ano j
    var sen_j = sen.select(['classification_' + year_j]);
    var col_j = col.select(['classification_' + year_j]);
    
    // calcular concordância
    var conc = ee.Image(0).where(sen_j.eq(class_i).and(col_j.eq(class_i)), 1)   // [1]: Concordância
                          .where(sen_j.eq(class_i).and(col_j.neq(class_i)), 2)  // [2]: Apenas Sentinel
                          .where(sen_j.neq(class_i).and(col_j.eq(class_i)), 3)  // [3]: Apenas Landsat
                          .updateMask(biomes.eq(4));
    
    conc = conc.updateMask(conc.neq(0)).rename('territory_' + year_j);
    
    // build sinthetic image to compute areas
    var synt = ee.Image(0).where(conc.eq(1), sen_j)
                          .where(conc.eq(2), col_j)
                          .where(conc.eq(3), sen_j)
                          .updateMask(conc)
                          .rename(['classification_' + year_j]);
    // build database
    images = images.addBands(conc).addBands(synt);
    
      Map.addLayer(images.select(['territory_' + year_j]), {palette: [
        'gray', 'blue', 'red'], min:1, max:3}, year_j + ' Agreement - Class ' + class_i);

  });
  
  print('classe ' + class_i, images);


  // change the scale if you need.
  var scale = 10;
  
  // define a Google Drive output folder 
  var driverFolder = 'AREA-EXPORT-SENTINEL-C1';
  
  // get the classification for the file[i] 
  var asset_i = ee.Image(images);
    
  // Image area in km2
  var pixelArea = ee.Image.pixelArea().divide(10000);
    
  // Geometry to export
  var geometry = biomes.updateMask(biomes.eq(4)).geometry();
    
    // convert a complex object to a simple feature collection 
    var convert2table = function (obj) {
      obj = ee.Dictionary(obj);
        var territory = obj.get('territory');
        var classesAndAreas = ee.List(obj.get('groups'));
        
        var tableRows = classesAndAreas.map(
            function (classAndArea) {
                classAndArea = ee.Dictionary(classAndArea);
                var classId = classAndArea.get('class');
                var area = classAndArea.get('sum');
                var tableColumns = ee.Feature(null)
                    .set('territory', territory)
                    .set('class_id', classId)
                    .set('area', area)
                    .set('class_ref', class_i);
                    
                return tableColumns;
            }
        );
    
        return ee.FeatureCollection(ee.List(tableRows));
    };
    
    // compute the area
    var calculateArea = function (image, territory, geometry) {
        var territotiesData = pixelArea.addBands(territory).addBands(image)
            .reduceRegion({
                reducer: ee.Reducer.sum().group(1, 'class').group(1, 'territory'),
                geometry: geometry,
                scale: scale,
                maxPixels: 1e12
            });
            
        territotiesData = ee.List(territotiesData.get('groups'));
        var areas = territotiesData.map(convert2table);
        areas = ee.FeatureCollection(areas).flatten();
        return areas;
    };
    
    // perform per year 
    var areas = years.map(
        function (year) {
            var image = asset_i.select('classification_' + year);
            var territory = asset_i.select(['territory_' + year]);
            var areas = calculateArea(image, territory, geometry);
            // set additional properties
            areas = areas.map(
                function (feature) {
                    return feature.set('year', year);
                }
            );
            return areas;
        }
    );
    
    areas = ee.FeatureCollection(areas).flatten();
    
    Export.table.toDrive({
        collection: areas,
        description: 'agreement_' + class_i,
        folder: driverFolder,
        fileFormat: 'CSV'
    });
});
