// sort stratified spatialPoints by region using stable pixels
// dhemerson.costa@ipam.org.br

// define string to use as metadata
var version = '1';  // label string

// define output
var output = 'users/dh-conciani/collection7/0_sentinel/sample/points/';

// define classes to generate samples
var classes = [3, 4, 11, 12, 15, 19, 21, 25, 33];

// define sample size
var sampleSize = 7000;     // by region
var nSamplesMin = 700;     // minimum sample size by class

// collection 7.0 stable pixels (generated by step 1)
var stablePixels = ee.Image('users/dh-conciani/collection7/0_sentinel/masks/cerrado_stablePixels_col7_v1')
                      .remap([3, 4, 5, 11, 12, 29, 15, 19, 39, 20, 40, 41, 46, 47, 48, 21, 23, 24, 30, 25, 33, 31],
                             [3, 4, 3, 11, 12, 12, 15, 19, 19, 19, 19, 19, 19, 19, 19, 21, 25, 25, 25, 25, 33, 33])
                      .rename('reference');

// Collection 7.0 - class area by region table (generated by step 2)
var regionsCollection = ee.FeatureCollection('users/dh-conciani/collection7/0_sentinel/sample/area/2000_v1');

// import mapbiomas module
var palettes = require('users/mapbiomas/modules:Palettes.js');
var vis = {
    'min': 0,
    'max': 49,
    'palette': palettes.get('classification6')
};

// plot stable pixels
Map.addLayer(stablePixels, vis, 'stablePixels', true);

// define function to get trainng samples
var getTrainingSamples = function (feature) {
  // for each region 
  var region_i = feature.get('mapb');
  // read the area for each class
  var forest = ee.Number(feature.get('3'));
  var savanna = ee.Number(feature.get('4'));
  var wetland = ee.Number(feature.get('11'));
  var grassland = ee.Number(feature.get('12'));
  var pasture = ee.Number(feature.get('15'));
  var agriculture = ee.Number(feature.get('19'));
  var mosaic = ee.Number(feature.get('21'));
  var non_vegetated = ee.Number(feature.get('25'));
  var water = ee.Number(feature.get('33'));
  
  // compute the total area 
  var total = forest
              .add(savanna)
              .add(wetland)
              .add(grassland)
              .add(pasture)
              .add(agriculture)
              .add(mosaic)
              .add(non_vegetated)
              .add(water);
              
  // define the equation to compute the n of samples
  var computeSize = function (number) {
    return number.divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  };
  
  // apply the equation to compute the number of samples
  var n_forest = computeSize(ee.Number(forest));
  var n_savanna = computeSize(ee.Number(savanna));
  var n_wetland = computeSize(ee.Number(wetland));
  var n_grassland = computeSize(ee.Number(grassland));
  var n_pasture = computeSize(ee.Number(pasture));
  var n_agriculture = computeSize(ee.Number(agriculture));
  var n_mosaic = computeSize(ee.Number(mosaic));
  var n_non_vegetated = computeSize(ee.Number(non_vegetated));
  var n_water = computeSize(ee.Number(water));

  // get the geometry of the region
  var region_i_geometry = ee.Feature(feature).geometry();
  // clip stablePixels only to the region 
  var referenceMap =  stablePixels.clip(region_i_geometry);
                      
  // generate the sample points
  var training = referenceMap.stratifiedSample(
                                {'scale': 30,
                                 'classBand': 'reference', 
                                 'numPoints': 0,
                                 'region': feature.geometry(),
                                 'seed': 1,
                                 'geometries': true,
                                 'classValues': classes,
                                 'classPoints': [n_forest, n_savanna, n_wetland, n_grassland, n_pasture,
                                                 n_agriculture, n_mosaic, n_non_vegetated, n_water]
                                  }
                                );

  // insert the region_id as metadata
  training = training.map(function(doneFeature) {
                return doneFeature.set({'mapb': region_i});
              }
            );
    
  return training;
 };

// apply function and get sample points
var samplePoints = regionsCollection.map(getTrainingSamples)
                      .flatten(); // flatten all regions


// plot points
Map.addLayer(samplePoints, vis, 'samplePoints');

// print diagnosis
print('forest', samplePoints.filterMetadata('reference', 'equals', 3).size());
print('savanna', samplePoints.filterMetadata('reference', 'equals', 4).size());
print('wetland', samplePoints.filterMetadata('reference', 'equals', 11).size());
//print('rocky', samplePoints.filterMetadata('reference', 'equals', 29).size());
print('grassland', samplePoints.filterMetadata('reference', 'equals', 12).size());
print('agriculture', samplePoints.filterMetadata('reference', 'equals', 19).size());

// export as GEE asset
Export.table.toAsset({'collection': samplePoints,
                      'description': 'samplePoints_v' + version,
                      'assetId':  output + 'samplePoints_v' + version
                      }
                    );
