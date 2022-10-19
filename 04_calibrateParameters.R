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

## for each classification region
for (i in 1:length(region_name)) {
  print(paste0('processing region ', region_name[i]))
  ## get sentinel only for region [i]
  sentinel_i <- sentinel$filterBounds(regions$filterMetadata('mapb', 'equals', region_name[i]))
  ## get sample points for the region [i]
  samples_i <- samples$filterMetadata('mapb', 'equals', region_name[i])
  
  ## perform a set of [k] estimates for each region
  for (k in 1:200) {
    ## get sentinel for a random year from 2016 to 2021 and mosaic them 
    sentinel_ij <- sentinel_i$filter(ee$Filter$eq('year', sample(x= 2016:2021, size= 1)))$mosaic()
    
    ## extract spectral signatures
    sample_train <- na.omit(ee_as_sf(sentinel_ij$sampleRegions(collection= samples_i,
                                                               scale= 10,
                                                               geometries= TRUE,
                                                               tileScale= 2), via = 'drive'))
  }
  
  
}
