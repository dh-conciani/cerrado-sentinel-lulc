## Run smileRandomForest classifier - Mapbiomas Sentinel Collection 1.0
## For clarification, write to <dhemerson.costa@ipam.org.br> 

## import libraries
library(rgee)
ee_Initialize()

## define strings to be used as metadata
samples_version <- '2'   # input training samples version
output_version <-  '2'   # output classification version 

## set the number of bands to be used in classification
n_bands <- 80

## define output asset
output_asset <- 'users/dh-conciani/collection7/0_sentinel/c1-general/'

## read sentinel-2 mosaic
mosaic <- ee$ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')$
  filter(ee$Filter$eq('version', '3'))$
  filter(ee$Filter$eq('biome', 'CERRADO'))

## define years to be classified
years <- unique(mosaic$aggregate_array('year')$getInfo())

## read classification regions (vetor)
regions_vec <- ee$FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2')

## get only regions to re-process
reg27 <- regions_vec$filterMetadata('mapb', 'equals', 27)
reg23 <- regions_vec$filterMetadata('mapb', 'equals', 23);
regions_vec <- reg27$merge(reg23)

## define regions to be processed 
regions_list <- sort(unique(regions_vec$aggregate_array('mapb')$getInfo()))

### training samples (prefix string)
training_dir <- 'users/dh-conciani/collection7/0_sentinel/training/'

### classification regions (imageCollection, one region per image)
regions_ic <- 'users/dh-conciani/collection7/classification_regions/eachRegion_v2_10m/'

## read classification parameters
param_bands <- read.csv('./utils/col1/_params/bands.csv', sep= '')
param_rf <- read.csv('./utils/col1/_params/rf.csv', sep= '')

## for each region
for (i in 1:length(regions_list)) {
  print(paste0('processing region [', regions_list[i], ']'))
  ## get the vector for the regon [i]
  region_i_vec <- regions_vec$filterMetadata('mapb', 'equals', regions_list[i])$geometry()
  ## get the raster for the region [i]
  region_i_ras = ee$Image(paste0(regions_ic, 'reg_', regions_list[i]))
  
  ## get variable importance for the region i
  param_bands_i <- subset(param_bands, region == regions_list[i])
  ## remove auxiliary bands from relational computation
  param_bands_i <- subset(param_bands_i,  band != "hand" & band != 'longitude_sin' & band != 'longitude_cos')
  ## get the most 80 important bands, using the importance 
  bands <- levels(reorder(param_bands_i$band, -param_bands_i$mean))[1:n_bands]
  
  ## get best classification parameters for the region i
  n_tree <- subset(param_rf, region == regions_list[i])$ntree
  n_mtry <- subset(param_rf, region == regions_list[i])$mtry
  
  ## compute static auxiliary bands
  geo_coordinates <- ee$Image$pixelLonLat()$clip(region_i_vec)
  ## get latitude
  lat <- geo_coordinates$select('latitude')$add(5)$multiply(-1)$multiply(1000)$toInt16()
  ## get longitude
  lon_sin <- geo_coordinates$select('longitude')$multiply(pi)$divide(180)$
    sin()$multiply(-1)$multiply(10000)$toInt16()$rename('longitude_sin')
  ## cosine
  lon_cos <- geo_coordinates$select('longitude')$multiply(pi)$divide(180)$
    cos()$multiply(-1)$multiply(10000)$toInt16()$rename('longitude_cos')
  
  ## get heigth above nearest drainage
  hand <- ee$ImageCollection("users/gena/global-hand/hand-100")$mosaic()$toInt16()$
    clip(region_i_vec)$rename('hand')
  
  ## for each year
  for (j in 1:length(years)) {
    print(paste0('----> ', years[j]))
    
    ## get the sentinel mosaic for the current year 
    mosaic_i <- mosaic$filterMetadata('year', 'equals', years[j])$
      mosaic()$
      updateMask(region_i_ras)$   # filter for the region
      select(bands)$              # select only relevant bands
      ## add auxiliary bands
      addBands(lat)$
      addBands(lon_sin)$
      addBands(lon_cos)$
      addBands(hand)
    
    ## limit water samples only to 175 samples (avoid over-estimation)
    water_samples <- ee$FeatureCollection(paste0(training_dir, 'v', samples_version, '/train_col1_reg', regions_list[i], '_', years[j], '_v', samples_version))$
      filter(ee$Filter$eq("reference", 33))$
      filter(ee$Filter$eq("hand", 0))$
      limit(175)                        ## insert water samples limited to 175 
    
    ## merge filtered water with other classes
    training_ij <- ee$FeatureCollection(paste0(training_dir, 'v', samples_version, '/train_col1_reg', regions_list[i], '_', years[j], '_v', samples_version))$
      filter(ee$Filter$neq("reference", 33))$ ## remove water samples
      merge(water_samples)
    
    ## train classifier
    classifier <- ee$Classifier$smileRandomForest(
      numberOfTrees= n_tree,
      variablesPerSplit= n_mtry)$
      train(training_ij, 'reference', bands)
    
    ## perform classification and mask only to region 
    predicted <- mosaic_i$classify(classifier)$mask(mosaic_i$select(0))
    
    ## add year as bandname
    predicted <- predicted$rename(paste0('classification_', as.character(years[j])))$toInt8()
    
    ## set properties
    predicted <- predicted$
      set('collection', '1')$
      set('version', output_version)$
      set('biome', 'CERRADO')$
      set('mapb', as.numeric(regions_list[i]))$
      set('year', as.numeric(years[j]))
    
    ## stack classification
    if (years[j] == 2016) {
      stacked_classification <- predicted
    } else {
      stacked_classification <- stacked_classification$addBands(predicted)    
    }
    
  } ## end of year processing
  print('exporting stacked classification')
  
  ## create filename
  file_name <- paste0('CERRADO_reg', regions_list[i], '_col1_v', output_version)
  
  ## build task
  task <- ee$batch$Export$image$toAsset(
    image= stacked_classification$toInt8(),
    description= file_name,
    assetId= paste0(output_asset, file_name),
    scale= 10,
    maxPixels= 1e13,
    pyramidingPolicy= list('.default' = 'mode'),
    region= region_i_vec
  )
  
  ## export 
  task$start()
  print ('------------> NEXT REGION --------->')
}

print('end, now wait few hours and have fun :)')
