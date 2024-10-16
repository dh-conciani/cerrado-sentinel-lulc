// -- -- -- -- 06_gapFill
// post-processing filter: fill the gaps (nodata) with data from previous years
// barbara.silva@ipam.org.br and dhemerson.costa@ipam.org.br

// Import mapbiomas color schema 
var vis = {
    min: 0,
    max: 62,
    palette:require('users/mapbiomas/modules:Palettes.js').get('classification8'),
    bands: 'classification_2017'
};

// Set the Cerrado biome extent 
var geometry = ee.Geometry.Polygon(
      [[[-61.23436115564828, -1.2109638051779688],
        [-61.23436115564828, -26.098552002927054],
        [-40.31639240564828, -26.098552002927054],
        [-40.31639240564828, -1.2109638051779688]]], null, false);

// Set root directory
var out = 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL-GENERAL-POST/';

// Set metadata
var inputVersion = '10';
var outputVersion = '10';

// Set input classification
var data = ee.ImageCollection('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/generalMap');

// Function to build collection as ee.Image
var buildCollection = function(input, version, startYear, endYear) {
  var years = ee.List.sequence({'start': startYear, 'end': endYear}).getInfo();
  var collection = ee.Image([]);
  years.forEach(function(year_i) {
    var tempImage = input.filterMetadata('version', 'equals', version)
                        .filterMetadata('year', 'equals', year_i)
                        .map(function(image) {
                          return image.select('classification');
                        })
                        .mosaic()
                        .rename('classification_' + year_i); 
    collection = collection.addBands(tempImage);
    }
  );
  return collection;
};

var collection = buildCollection(
  data,             // input collection
  inputVersion,     // version 
  2016,             // startYear
  2023);            // endyear

// Discard zero pixels in the image
var classificationInput = collection.mask(collection.neq(0));
print('Input classification', classificationInput);
Map.addLayer(classificationInput, vis, 'Input classification');

// Set the list of years to be filtered
var years = ee.List.sequence({'start': 2016, 'end': 2023, step: 1}).getInfo();

// User defined functions
var applyGapFill = function (image) {

    // apply the gapfill from t0 until tn
    var imageFilledt0tn = bandNames.slice(1)
        .iterate(
            function (bandName, previousImage) {

                var currentImage = image.select(ee.String(bandName));

                previousImage = ee.Image(previousImage);

                currentImage = currentImage.unmask(
                    previousImage.select([0]));

                return currentImage.addBands(previousImage);

            }, ee.Image(imageAllBands.select([bandNames.get(0)]))
        );

    imageFilledt0tn = ee.Image(imageFilledt0tn);

    // apply the gapfill from tn until t0
    var bandNamesReversed = bandNames.reverse();

    var imageFilledtnt0 = bandNamesReversed.slice(1)
        .iterate(
            function (bandName, previousImage) {

                var currentImage = imageFilledt0tn.select(ee.String(bandName));

                previousImage = ee.Image(previousImage);

                currentImage = currentImage.unmask(
                                previousImage.select(previousImage.bandNames().length().subtract(1)));

                return previousImage.addBands(currentImage);

            }, ee.Image(imageFilledt0tn.select([bandNamesReversed.get(0)]))
        );

    imageFilledtnt0 = ee.Image(imageFilledtnt0).select(bandNames);

    return imageFilledtnt0;
};

// Get band names list 
var bandNames = ee.List(
    years.map(
        function (year) {
            return 'classification_' + String(year);
        }
    )
);

// Generate a histogram dictionary of [bandNames, image.bandNames()]
var bandsOccurrence = ee.Dictionary(
    bandNames.cat(classificationInput.bandNames()).reduce(ee.Reducer.frequencyHistogram())
);

// Insert a masked band 
var bandsDictionary = bandsOccurrence.map(
    function (key, value) {
        return ee.Image(
            ee.Algorithms.If(
                ee.Number(value).eq(2),
                classificationInput.select([key]).byte(),
                ee.Image().rename([key]).byte().updateMask(classificationInput.select(0))
            )
        );
    }
);

// Convert dictionary to image
var imageAllBands = ee.Image(
    bandNames.iterate(
        function (band, image) {
            return ee.Image(image).addBands(bandsDictionary.get(ee.String(band)));
        },
        ee.Image().select()
    )
);

// Apply the gapfill function
var imageFilledtnt0 = applyGapFill(imageAllBands);

// Check filtered image
Map.addLayer(imageFilledtnt0, vis, 'filtered');

// Write metadata
imageFilledtnt0 = imageFilledtnt0.set('1-gapfill', outputVersion);
print('Output classification', imageFilledtnt0);

// Export as GEE asset
Export.image.toAsset({
    'image': imageFilledtnt0,
    'description': 'CERRADO_S2-C1_gapfill_v' + outputVersion,
    'assetId': out + 'CERRADO_S2-C1_gapfill_v' + outputVersion,
    'pyramidingPolicy': {
        '.default': 'mode'
    },
    'region': geometry,
    'scale': 10,
    'maxPixels': 1e13
});
