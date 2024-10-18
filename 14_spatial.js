// -- -- -- -- 14_spatial
// post-processing filter: spatial filter to define a minimum area
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br

// Import mapbiomas color schema 
var vis = {
    min: 0,
    max: 62,
    palette:require('users/mapbiomas/modules:Palettes.js').get('classification8'),
    bands: 'classification_2017'
};

// Set root directory 
var root = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';
var out = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';

// Set metadata
var inputVersion = '4';
var outputVersion = '6';

// Define input file
var inputFile = 'CERRADO_S2-C1_gapfill_v10_segmentation_v10_frequency_v6_temporal_v18_noFalseRegrowth_v6_geomorpho_v'+inputVersion;

// Load classification
var classificationInput = ee.Image(root + inputFile);
print('Input classification', classificationInput);
Map.addLayer(classificationInput, vis, 'Input classification');

// Load another classification
var version_2 = ee.Image("projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/CERRADO_S2-C1_gapfill_v2_segmentation_v0_frequency_v0_temporal_v0");

// Define the old and new values for reclassification
var old_values = [3, 4, 11, 12, 15, 18, 25, 33];
var new_values = [3, 4, 11, 12, 21, 21, 25, 33];

// Apply the reclassification
old_values.forEach(function(value, i) {
  version_2 = version_2.where(version_2.eq(value), new_values[i]);
});

// Define the geometry for non-vegetated area in Araguaia (TO) region
var geometryNonVeg = ee.Image(1).clip(ee.Geometry.MultiPolygon(
  [[[-48.88849052214015,-9.62919167826987], 
    [-48.39959892057765,-9.62919167826987], 
    [-48.39959892057765,-7.429206092577588], 
    [-48.88849052214015,-7.429206092577588]]]
));

// Initialize an empty image to store the reclassified bands
var remapped = ee.Image([]);

// Iterate over the years and apply the non-vegetated condition
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo().forEach(function(year_i) {
  // Select the classification image for the corresponding year
  var imageYear = classificationInput.select('classification_' + year_i);
  var versionYear = version_2.select('classification_' + year_i);
  
  // Apply the reclassification condition for non-vegetated areas (25)
  imageYear = imageYear.where(geometryNonVeg.eq(1).and(imageYear.eq(25)), versionYear);
  
  // Add the reclassified band to the final filtered image
  remapped = remapped.addBands(imageYear.updateMask(imageYear.neq(0)));
});

Map.addLayer(remapped, vis, 'Remapped');
print('remapped', remapped);


// --- ---  Apply 1st sequence of the spatial filter
// Create an empty container
var filtered = ee.Image([]);

// Set filter size
var filter_size = 50;

// Iterate over the years
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo()
      .forEach(function(year_i) {
        // Compute the focal model
        var focal_mode = remapped.select(['classification_' + year_i])
                .unmask(0)
                .focal_mode({'radius': 1, 'kernelType': 'square', 'units': 'pixels'});
 
        // Compute the number of connections
        var connections = remapped.select(['classification_' + year_i])
                .unmask(0)
                .connectedPixelCount({'maxSize': 100, 'eightConnected': false});
        
        // Get the focal model when the number of connections of same class is lower than parameter
        var to_mask = focal_mode.updateMask(connections.lte(filter_size));

        // Apply filter
        var classification_i = remapped.select(['classification_' + year_i])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 10);

        // Stack into container
        filtered = filtered.addBands(classification_i.updateMask(classification_i.neq(0)));
        }
      );

// Plot 1st sequence of the spatial filter
Map.addLayer(filtered, vis, 'filtered - round 1');


// --- ---  Apply 2nd sequence of the spatial filter
// Set container 
var container = ee.Image([]);

// Iterate over the years
ee.List.sequence({'start': 2016, 'end': 2023}).getInfo()
      .forEach(function(year_i) {
        // Compute the focal model
        var focal_mode = filtered.select(['classification_' + year_i])
                .unmask(0)
                .focal_mode({'radius': 1, 'kernelType': 'square', 'units': 'pixels'});
 
        // Compute the number of connections
        var connections = filtered.select(['classification_' + year_i])
                .unmask(0)
                .connectedPixelCount({'maxSize': 100, 'eightConnected': false});
        
        //Get the focal model when the number of connections of same class is lower than parameter
        var to_mask = focal_mode.updateMask(connections.lte(filter_size));

        // Apply filter
        var classification_i = filtered.select(['classification_' + year_i])
                .blend(to_mask)
                .reproject('EPSG:4326', null, 10);

        // Stack into container
        container = container.addBands(classification_i.updateMask(classification_i.neq(0)));
        }
      );

// Plot 2nd sequence of the spatial filter
Map.addLayer(container, vis, 'filtered 2 - round 2');

// Write metadata
container = container.set('6-spatial', outputVersion)
                     .copyProperties(classificationInput);

print('Output classification', container);


// Export as GEE asset
Export.image.toAsset({
    'image': container,
    'description': (inputFile + '_spatial_v' + outputVersion).trim(),
    'assetId': (out + inputFile + '_spatial_v' + outputVersion).trim(),
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': container.geometry(),
    'scale': 10,
    'maxPixels': 1e13
});
