// define geometry (raw extent of cerrado)
var geometry = /* color: #98ff00 */ee.Geometry.Polygon(
        [[[-42.306314047317365, -1.7207103925816054],
          [-44.415689047317365, -1.4571401339250152],
          [-54.259439047317365, -10.451581892159153],
          [-61.202798422317365, -10.624398320896237],
          [-61.202798422317365, -14.739254413487872],
          [-57.775064047317365, -18.027281070807337],
          [-59.005532797317365, -23.85214541157912],
          [-48.370767172317365, -25.84584109333063],
          [-40.548501547317365, -17.52511660076233],
          [-40.636392172317365, -2.774571568871124]]]);

var bioma = "CERRADO";
var dirout = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO/SENTINEL/classification_sentinel/';
var file_in = 'CERRADO_sentinel_gapfill_wetland_temporal_v1';
var file_out = 'CERRADO_sentinel_gapfill_wetland_temporal_spatial_v';
var version_out = 1;

// read image
var class4GAP = ee.Image(dirout + file_in);

// spatial filter (0.5 ha)
var filter_lte = 50;

// mapbiomas color ramp
var vis = {
      bands: 'classification_2016',
      min:0,
      max:49,
      palette: require('users/mapbiomas/modules:Palettes.js').get('classification6'),
      format: 'png'
    };

// plot classification 
Map.addLayer(class4GAP, vis, 'classification');

// start year
var ano = '2016';

// extract mode by using neighbors
var moda_16 = class4GAP.select('classification_'+ ano).focal_mode(1, 'square', 'pixels');

// compute number of connections with same class
var conn = class4GAP.select('classification_'+ ano).connectedPixelCount(100,false).rename('connect_' + ano);

// mask pixels connect with less than [x] of same class 
moda_16 = moda_16.mask(conn.select('connect_'+ ano).lte(filter_lte));

// define values to be used in case of replace 
var class_outTotal = class4GAP.select('classification_'+ ano).blend(moda_16);

// plot values to be used in case of replace
Map.addLayer(class_outTotal, vis, 'filtered');

// define years to be filtered
var anos = ['2017','2018', '2019', '2020'];

// filter 
// for each year
for (var i_ano=0;i_ano<anos.length; i_ano++) {  
  // extract year vlaue
  var ano = anos[i_ano];
  // compute the neighbor mode
  var moda = class4GAP.select('classification_'+ ano).focal_mode(1, 'square', 'pixels');
  // compute the numbver of connections with same class
  var conn = class4GAP.select('classification_'+ano).connectedPixelCount(100,false).rename('connect_'+ ano);
  // filter using the number of connections
  moda = moda.mask(conn.select('connect_'+ ano).lte(filter_lte));
  var class_out = class4GAP.select('classification_'+ ano).blend(moda);
  // add filtered as band
  class_outTotal = class_outTotal.addBands(class_out);
}

// print result
print(class_outTotal);
class_outTotal = class_outTotal.set("version", version_out)
                               .set("step", "spatial");
                               
// export as GEE asset
Export.image.toAsset({
    'image': class_outTotal,
    'description': file_out + version_out,
    'assetId': dirout + file_out + version_out,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': geometry,
    'scale': 30,
    'maxPixels': 1e13
});
