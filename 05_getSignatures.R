## For clarification, write to <dhemerson.costa@ipam.org.br> 
## Exported data is composed by spatialPoints with spectral signature values grouped by column
## Auxiliary bands were computed (Lat, Long, and HAND)

## read libraries
library(rgee)
ee_Initialize()

# set the numver of bands to be used 
n_bands <- 80 

## define strings to use as metadata (output)
version <- "2"     ## version string

## define output directory
dirout <- 'users/dh-conciani/collection7/0_sentinel/training/v2/'

## biome
biomes <- ee$Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster')
cerrado <- biomes$updateMask(biomes$eq(4))

## read sentinel-2 mosaic
mosaic <- ee$ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')$
  filter(ee$Filter$eq('version', '3'))$
  filter(ee$Filter$eq('biome', 'CERRADO'))

## import classification regions
regionsCollection <- ee$FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2')

## get only regions to re-process
reg27 <- regionsCollection$filterMetadata('mapb', 'equals', 27)
reg23 <- regionsCollection$filterMetadata('mapb', 'equals', 23);
regionsCollection <- reg27$merge(reg23)

## import sample points
samples <- ee$FeatureCollection('users/dh-conciani/collection7/0_sentinel/sample/points/samplePoints_v2')

## define regions to extract spectral signatures (spatial operator)
regions_list <- unique(regionsCollection$aggregate_array('mapb')$getInfo())

## define years to extract spectral signatures (temporal operator)
years <- unique(mosaic$aggregate_array('year')$getInfo())


## for each region 
for (i in 1:length(regions_list)) {
  ## for each year
  for (j in 1:length(years)) {
    ## print status
    print(paste0('region ' , regions_list[i] , ' || year ' , years[j]))
    ## subset region
    region_i <- regionsCollection$filterMetadata('mapb', "equals", regions_list[i])$geometry()
    
    ## compute additional bands
    geo_coordinates <- ee$Image$pixelLonLat()$clip(region_i)
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
      clip(region_i)$rename('hand')
    
    ## get the landsat mosaic for the current year 
    mosaic_i <- mosaic$filterMetadata('year', 'equals', years[j])$
      filterBounds(region_i)$mosaic()
    
    ## get bands importance for the region [i]
    importance <- subset(read.csv('./utils/col1/_params/bands.csv', dec= '.', sep=' '),
                         region == regions_list[i])
    
    ## remove additional bands
    importance <- subset(importance, band != "hand" & band != 'longitude_sin' & band != 'longitude_cos')
    
    ## get the most 80 important bands, using the importance 
    bands <- levels(reorder(importance$band, -importance$mean))[1:n_bands]

    ## get only important bands
    mosaic_i <- mosaic_i$select(bands)$
      addBands(lat)$
      addBands(lon_sin)$
      addBands(lon_cos)$
      addBands(hand)
    
    ## subset sample points for the region 
    samples_ij <- samples$filterBounds(regionsCollection$filterMetadata('mapb', "equals", regions_list[i]))
    print(paste0('number of points: ', samples_ij$size()$getInfo()))      
    
     ## get training samples
    training_i <- mosaic_i$sampleRegions(collection= samples_ij,
                                         scale= 10,
                                         geometries= TRUE,
                                         tileScale= 2)
    
    ## remove NA or NULL from extracted data
    training_i <- training_i$filter(ee$Filter$notNull(bands))
    
    ## build task to export data
    task <- ee$batch$Export$table$toAsset(
      training_i, paste0('train_col1_reg' , regions_list[i] , '_' , years[j] , '_v' , version),
      paste0(dirout , 'train_col1_reg' , regions_list[i] , '_' , years[j] , '_v' , version))
    
    ## start task
    task$start()
    print ('========================================')
    
  }
}
