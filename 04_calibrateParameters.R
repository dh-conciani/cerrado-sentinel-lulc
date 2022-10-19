## select featureSpace and calibrate RF hyperparametersfor each classification region
## dhemerson.costa@ipam.org.br

## load packages
library(rgee)
library(sf)
library(caret)
library(randomForest)
library(AppliedPredictiveModeling)
library(reshape2)
library(DMwR2)

## avoid scientific notation
options(scipen= 999)

## initialize earth engine 
ee_Initialize()

## read samples
samples <- ee$FeatureCollection('users/dh-conciani/collection7/0_sentinel/sample/points/samplePoints_v1')

## read classification regions
regions <- ee$FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2')

## get unique region names as string
region_name <- unique(samples$aggregate_array('mapb')$getInfo())

## read sentinel-2 mosaic
sentinel <- ee$ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')$
  filter(ee$Filter$eq('version', '3'))$
  filter(ee$Filter$eq('biome', 'CERRADO'))


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

## for each classification region
for (i in 1:length(region_name)) {
  print(paste0('processing region ', region_name[i]))
  ## get sentinel only for region [i]
  sentinel_i <- sentinel$filterBounds(regions$filterMetadata('mapb', 'equals', region_name[i]))
  ## get sample points for the region [i]
  samples_i <- samples$filterMetadata('mapb', 'equals', region_name[i])
  
  ## compute additional bands
  geo_coordinates <- ee$Image$pixelLonLat()$
    clip(regions$filterMetadata('mapb', 'equals', region_name[i]))
  
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
    clip(regions$filterMetadata('mapb', 'equals', region_name[i]))$
    rename('hand')
  
  ## get spectral signatures for a random year (repeat two times, using two random years)
  for (j in 1:2) {
    print(paste0('year ', j, ' of 2'))
    ## get signatures
    sample_ij <- na.omit(ee_as_sf(sentinel_i$filter(ee$Filter$eq('year', sample(x= 2016:2021, size= 1)))$
                                    mosaic()$
                                    sampleRegions(collection= samples_i,
                                                  scale= 10,
                                                  geometries= TRUE,
                                                  tileScale= 2), via = 'drive'))
  }
  
  
  
  
  
  
}

