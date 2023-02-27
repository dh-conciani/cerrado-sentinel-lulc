// merge versions
// dhemerson.costa@ipam.org.br

// load v1
var v1 = ee.Image('users/dh-conciani/collection7/0_sentinel/c1-general-post/CERRADO_sentinel_gapfill_freq_temporal_spatial_12');

// load version 2 (to correct forestry)
var v2 = ee.Image('users/dh-conciani/collection7/0_sentinel/c1-general-post/CERRADO_sentinel_gapfill_freq_temporal_spatial_13');

// get regions to be updated
var class_reg = ee.Image('users/dh-conciani/collection7/classification_regions/raster_10m_v2');
class_reg = class_reg.updateMask(class_reg.eq(27)).blend(class_reg.updateMask(class_reg.eq(23)));


var recipe = ee.Image([]);
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo().forEach(function(year_i) {
  var v1_i = v1.select(['classification_' + year_i]).updateMask(class_reg);
  var v2_i = v2.select(['classification_' + year_i]);
  
  //merge
  recipe = recipe.addBands(v1_i.where(v1_i.eq(3).and(v2_i.eq(9)), 21).rename(['classification_' + year_i]));
  
});

// import the color ramp module from mapbiomas 
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

Map.addLayer(v1.select(['classification_2016']), vis, 'v1');
Map.addLayer(v2.select(['classification_2016']), vis, 'v2');
Map.addLayer(recipe.select(['classification_2016']), vis, 'recipe');

// apply spatial filter
print(recipe);

// create an empty recipe
var filtered = ee.Image([]);

// apply filter
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo()
      .forEach(function(year_i) {
        // compute the focal model
        var focal_mode = recipe.select(['classification_' + year_i])
                .unmask(0)
                .focal_mode({'radius': 1, 'kernelType': 'square', 'units': 'pixels'});
 
        // compute te number of connections
        var connections = recipe.select(['classification_' + year_i])
                .unmask(0)
                .connectedPixelCount({'maxSize': 100, 'eightConnected': false});
        
        // get the focal model when the number of connections of same class is lower than parameter
        var to_mask = focal_mode.updateMask(connections.lte(50));

        // apply filter
        var classification_i = recipe.select(['classification_' + year_i])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 10);

        // stack into recipe
        filtered = filtered.addBands(classification_i.updateMask(classification_i.neq(0)));
        }
      );

// print filtered
Map.addLayer(filtered.select(['classification_2016']), vis, 'filtered 2016');
print(filtered);

// merge
var export_x = ee.Image([]);
ee.List.sequence({'start': 2016, 'end': 2022}).getInfo().forEach(function(year_i) {
  export_x = export_x.addBands(
    v1.select(['classification_' + year_i]).blend(filtered.select(['classification_' + year_i]))
      .rename('classification_' + year_i));
});

Map.addLayer(export_x.select(['classification_2016']), vis, 'to export');
print('xx', export_x);

Export.image.toAsset({
    'image': export_x,
    'description': 'CERRADO_sentinel_gapfill_freq_temporal_spatial_revised_v16',
    'assetId': 'users/dh-conciani/collection7/0_sentinel/c1-general-post/' + 'CERRADO_sentinel_gapfill_freq_temporal_spatial_revised_v16',
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': v1.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
