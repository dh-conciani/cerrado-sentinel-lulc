// -- -- -- -- 08_getSegments
// Post-processing filter: Apply segmentation over classification to refine results
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br

// Set visualization parameters for displaying images
var vis = {
  bands: ['swir1_median', 'nir_median', 'red_median'], 
  gain: [0.08, 0.06, 0.2], 
  gamma: 0.85
};

// Define the extent of the Cerrado biome
var geometry = ee.Geometry.Polygon(
      [[[-61.23436115564828, -1.2109638051779688],
        [-61.23436115564828, -26.098552002927054],
        [-40.31639240564828, -26.098552002927054],
        [-40.31639240564828, -1.2109638051779688]]], null, false);

// Set root and output directories
var root = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';
var out = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';

// Metadata
var outputVersion = '7'; 

// Load the Sentinel image collection filtered for the Cerrado biome
var imageCollection = ee.ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')
  .filter(ee.Filter.eq('biome', 'CERRADO'));

print('Image Collection', imageCollection);
Map.addLayer(imageCollection.filter(ee.Filter.eq('year', 2023)), vis, 'Sentinel 2023');

// Function to apply SNIC (Simple Non-Iterative Clustering) segmentation algorithm
var getSegments = function (image, size){
  var snic = ee.Algorithms.Image.Segmentation.SNIC({
    image: image, 
    size: size, // Size of the segments
    compactness: 0.1, // Compactness parameter for SNIC
    connectivity: 8, // Connectivity (8-connected neighbors)
    neighborhoodSize: 2 * size, // Size of the neighborhood for segmentation
    seeds: ee.Algorithms.Image.Segmentation.seedGrid({size:size, gridType: 'square'}) // Grid seeds for segmentation
  });
  
  return snic.select(['clusters'], ['segments']);
};

// Define the years of interest for segmentation
var years = ee.List.sequence({'start': 2016, 'end': 2023}).getInfo();

// Function to process and segment images for each year
var processYear = function(year) {
  // Filter the image collection by the current year
  var yearlyImages = imageCollection
    .filter(ee.Filter.eq('year', year)) // Filter by year
    .select(['swir1_median', 'nir_median', 'red_median']); // Select bands to use in segmentation
  
  // Create a median mosaic from the images of the current year
  var mosaic = yearlyImages.median();
  
  // Apply segmentation using SNIC and reproject the result
  var segments = getSegments(mosaic, 5)
    .reproject('EPSG:4326', null, 10);
    
  return segments.rename('segments_' + year)
    .set('year', year);
};

// Apply the segmentation process to each year and create an ImageCollection
var segmentsCollection = ee.ImageCollection.fromImages(years.map(processYear));

// Convert the segmented ImageCollection into a multi-band image
var segmentsByYear = segmentsCollection.toBands();

// Rename the bands to include the corresponding year in the band name
var renamedBandNames = years.map(function(year) {
  return ee.String('segments_').cat(ee.Number(year).format());
});

segmentsByYear = segmentsByYear.rename(renamedBandNames);

Map.addLayer(segmentsByYear.select('segments_2023').randomVisualizer(), {}, 'Segments 2023');
print('Segments image', segmentsByYear);

// Export to a GEE asset
Export.image.toAsset({
    image: segmentsByYear,
    description: 'CERRADO_S2-C1_getSeg_v' + outputVersion, 
    assetId: out + 'CERRADO_S2-C1_getSeg_v' + outputVersion, 
    pyramidingPolicy: {
        '.default': 'mode'
    },
    region: geometry, 
    scale: 10,
    maxPixels: 1e13 
});
