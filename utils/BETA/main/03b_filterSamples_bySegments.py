## filter outliers from stable samples by using segmentation, percentil reducer and sorting new samples
## for any issue or bug, write to dhemerson.costa@ipam.org.br and/or wallace.silva@ipam.org.br
## mapbiomas sentinel beta collection - cerrado biome

## import api
import ee
import pandas as pd 

ee.Initialize()

## define bands to be used in the segmentation 
segment_bands = ["blue_median", "green_median", "red_median", "nir_median", "swir1_median", "swir2_median"];

## define directory to export new samples
dirout = 'projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-sentinel/';

## define output version
version = '31';

##  import datasets 
##  stable samples from collection 6.0 
stable_pixels = ee.Image('projects/mapbiomas-workspace/AUXILIAR/CERRADO/CE_amostras_estaveis85a20_col6_v2');

## mapbiomas classification
mapbiomas = ee.Image('projects/mapbiomas-workspace/public/collection6/mapbiomas_collection60_integration_v1')\
    .select('classification_2020')\
    .remap(
    [3, 4, 5, 9,  11, 12, 13, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 29, 30, 31, 32, 33, 46, 47, 48],\
    [3, 4, 3, 9,  11, 12, 12, 15, 19, 19, 19, 21, 25, 25, 25, 25, 33, 25, 25, 25, 25, 33, 19, 19, 19]\
    )\
    .rename('classification_2020');

## unfiltered sample points (generated from stable pixels)
sample_points = ee.FeatureCollection('projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/samples-planet/samples_col6_CERRADO_v21');

## sentinel mosaic for the year of 2020 
sentinel = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics')\
    .filterMetadata('biome', 'equals', 'CERRADO')\
    .filterMetadata('version', 'equals', '1')\
    .filterMetadata('year', 'equals', 2020)\
    .mosaic();

## import cerrado vector 
cerrado = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas-2019')\
    .filterMetadata('Bioma', 'equals', 'Cerrado');

## import ibge cartas and filter to cerrado 
cartas = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/cartas")\
    .filterBounds(cerrado);

## create a list of values to iterate              
summary = cartas.aggregate_array('grid_name')\
    .remove('SG-21-X-B')\
    .getInfo();
#    .slice(0,1)\

# for each carta[i] in summary
for carta_i in summary:
    ## start index
    print ('Processing: ' + carta_i)    
    ## select carta_i
    carta = cartas.filterMetadata('grid_name', 'equals', carta_i);
    ## convert carta_i feature to image 
    carta_mask = ee.Image(0).mask(0).paint(carta);
    
    ## mask sentinel mosaic
    sentinel_i = sentinel.updateMask(carta_mask.eq(0));
    
    ## mask mapbiomas classification 
    mapbiomas_i = mapbiomas.updateMask(carta_mask.eq(0));
    
    ## filter bounds of the points 
    sample_points_i = sample_points.filterBounds(carta);
   
    ## compute the number of points
    in_number = sample_points_i.size().getInfo()
    print ('Input points: ' + str(in_number))
    
    ## define function to create segments  
    def getSegments (image, size, compactness, connectivity, neighborhoodSize):
        ## create seeds
        seeds = ee.Algorithms.Image.Segmentation.seedGrid(size, 'square'); 
        
        ## create segments
        snic = ee.Algorithms.Image.Segmentation.SNIC(
            image,
            size,
            compactness,
            connectivity,
            neighborhoodSize,
            seeds
            );

        ## paste properties
        snic = ee.Image(
            snic.copyProperties(image)\
            .copyProperties(image, ['system:footprint'])\
            .copyProperties(image, ['system:time_start']));
        
        ## out
        return snic.select(['clusters'], ['segments']);
    
    ## create segments
    segments = getSegments(image= sentinel_i.select(segment_bands),
                           size= 25,
                           compactness= 1,
                           connectivity= 8,
                           neighborhoodSize= 50 #(2 * size)
                           ).reproject('EPSG:4326', None, 10);  
    
    ## define function to select only segments that overlaps sample points
    def selectSegments (properties, scale, segments_i, validateMap, samples):
        ## extract training sample class 
        samplesSegments = segments_i.sampleRegions(
          samples, 
          properties,
          scale 
      );
        
        ## extract segment ids and reference class
        segmentsValues = ee.List(
            samplesSegments.reduceColumns(
                ee.Reducer.toList().repeat(2),
                ['reference', 'segments']).get('list')
            );
        
        
        ## label segments with reference class
        similiarMask = segments_i.remap(
            ee.List(segmentsValues.get(1)),
            ee.List(segmentsValues.get(0)),
            0
            );
        
        return similiarMask.rename(['class']);
    
    ## apply function to select segments 
    selectedSegments = selectSegments(segments_i= segments,
                                      samples= sample_points_i,
                                      properties= ['reference'],
                                      scale= 10,
                                      validateMap= mapbiomas_i
                                      );    
  
    ## mask and rename 
    selectedSegments = selectedSegments.selfMask().rename(['class']);     
    
    ## create percentil rule (crashes here - needs to select all classes, not only forest)
    percentil = segments.addBands(mapbiomas_i).reduceConnectedComponents(ee.Reducer.percentile([5, 95]), 'segments');
        
    ## validate and retain only segments with satifies percentil criterion
    validated = percentil.select(0).multiply(percentil.select(0).eq(percentil.select(1)));  
    
    ## mask and rename 
    selectedSegmentsValidated = selectedSegments.mask(selectedSegments.eq(validated)).rename('class');
    
    ## define function to generate new samples based on validated segments
    def getNewSamples (image, extent):
        ## sort points 
        newSamples = image\
            .sample(
                region= extent.geometry(),
                scale= 10,
                factor= 0.01, 
                seed= 1,
                dropNulls= True, 
                geometries= True 
        );
        
        return newSamples
    
    ## apply function to generate new points
    new = getNewSamples(image= selectedSegmentsValidated, 
                        extent= carta)  
      
    ## build exportation
    task = ee.batch.Export.table.toAsset(new,
                                         str(carta_i) + '_' + 'v' + str(version),\
                                         dirout + str(carta_i) + '_' + 'v' + str(version)) 
    
    ## export
    task.start()
    print ('done! ======================= > next')
    ## @ end of for @ ## 


