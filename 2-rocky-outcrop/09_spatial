// -- -- -- -- 09_spatial
// post-processing filter: eliminate isolated or edge transition pixels, minimum area of 10 pixels
// barbara.silva@ipam.org.br 

// Set metadata
var input_version = '4';
var output_version = '2';

// Set root directory
var input = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/CERRADO_col2_rocky_gapfill_v1_seg_v1_frequency_v' + input_version;
var dirout = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-ROCKY-POST/';

// Import mapbiomas color ramp
var vis = {
      min:0,
      max:62,
      palette: require('users/mapbiomas/modules:Palettes.js').get('classification8'),
      bands: 'classification_2023'
    };

// Load input classification
var classification = ee.Image(input);
print ("input", classification);
Map.addLayer(classification, vis, 'input');

// Create an empty container
var filtered = ee.Image([]);

// Set filter size
var filter_size = 10;

// Apply first sequence of the spatial filter
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo()
      .forEach(function(year_i) {
        // Compute the focal model
        var focal_mode = classification.select(['classification_' + year_i])
                .unmask(0)
                .focal_mode({'radius': 10, 'kernelType': 'square', 'units': 'pixels'});
 
        // Compute the number of connections
        var connections = classification.select(['classification_' + year_i])
                .unmask(0)
                .connectedPixelCount({'maxSize': 120, 'eightConnected': false});
        
        // Get the focal model when the number of connections of same class is lower than parameter
        var to_mask = focal_mode.updateMask(connections.lte(filter_size));

        // Apply filter
        var classification_i = classification.select(['classification_' + year_i])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 10);

         // Stack into container
        filtered = filtered.addBands(classification_i.updateMask(classification_i.neq(0)));
        }
      );

// Plot first sequence of the spatial filter
Map.addLayer(filtered, vis, 'filtered - round 1');

// Set container 
var container2 = ee.Image([]);

// Apply second sequence of the spatial filter
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo()
      .forEach(function(year_i) {
        // Compute the focal model
        var focal_mode = filtered.select(['classification_' + year_i])
                .unmask(0)
                .focal_mode({'radius': 10, 'kernelType': 'square', 'units': 'pixels'});
 
        // Compute the number of connections
        var connections = filtered.select(['classification_' + year_i])
                .unmask(0)
                .connectedPixelCount({'maxSize': 120, 'eightConnected': false});
        
        // Get the focal model when the number of connections of same class is lower than parameter
        var to_mask = focal_mode.updateMask(connections.lte(filter_size));

        // Apply filter
        var classification_i = filtered.select(['classification_' + year_i])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 10);

        // Stack into container
        container2 = container2.addBands(classification_i.updateMask(classification_i.neq(0)));
        }
      );

// Plot second sequence of the spatial filter
Map.addLayer(container2, vis, 'filtered - round 2');
print('Output classification', container2);

// Export as GEE asset
Export.image.toAsset({
    'image': container2,
    'description': 'CERRADO_col2_rocky_gapfill_v1_frequency_v2_spatial_v' + output_version,
    'assetId': dirout + 'CERRADO_col2_rocky_gapfill_v1_frequency_v2_spatial_v' + output_version,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': classification.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
