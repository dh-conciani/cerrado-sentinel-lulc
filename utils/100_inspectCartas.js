var pt = ee.FeatureCollection('projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-sentinel/SE-23-Y-B_v31');

// color ramp module from mapbiomas 
var vis = {
    'min': 0,
    'max': 49,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification6')
};

// color ponts using mapbiomas color ramp
var pts = pt.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(require('users/mapbiomas/modules:Palettes.js').get('classification6'))
                .get(feature.get('class')),
            'width': 1,
        });
    }
).style(
    {
        'styleProperty': 'style'
    }
);

Map.addLayer(pts)
