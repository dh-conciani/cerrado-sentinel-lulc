// import segments

var seg10 = ee.Image('users/dh-conciani/segments/size_10');
var seg25 = ee.Image('users/dh-conciani/segments/size_25');
var seg50 = ee.Image('users/dh-conciani/segments/size_50');
var seg75 = ee.Image('users/dh-conciani/segments/size_75');
var seg100 = ee.Image('users/dh-conciani/segments/size_100');

Map.addLayer(seg10.randomVisualizer(), {}, '10');
Map.addLayer(seg25.randomVisualizer(), {}, '25');
Map.addLayer(seg50.randomVisualizer(), {}, '50');
Map.addLayer(seg75.randomVisualizer(), {}, '75');
Map.addLayer(seg100.randomVisualizer(), {}, '100');
