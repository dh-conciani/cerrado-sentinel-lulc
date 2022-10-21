## select featureSpace and calibrate RF hyperparameters for each classification region
## dhemerson.costa@ipam.org.br

## load packages
library(rgee)
library(sf)
library(caret)
library(randomForest)
library(AppliedPredictiveModeling)
library(reshape2)
library(DMwR2)

## set random forest heuristic learning functions


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
    clip(regions$filterMetadata('mapb', 'equals', region_name[i]))$rename('hand')
  
  ## get spectral signatures for a random year (repeat two times, using two random years)
  for (j in 1:2) {
    print(paste0('year ', j, ' of 2'))
    
    ## filter sentinel mosaic for a random year
    sentinel_ij <- sentinel_i$filter(ee$Filter$eq('year', sample(x= 2016:2021, size= 1)))$mosaic()$
      ## add auxiliary bands
      addBands(lon_sin)$
      addBands(lon_cos)$
      addBands(hand)
    
    ## get spectral signatures from GEE and ingest locally 
    sample_ij <- na.omit(ee_as_sf(sentinel_ij$
                                    sampleRegions(collection= samples_i,
                                                  scale= 10,
                                                  geometries= TRUE,
                                                  tileScale= 2), via = 'drive'))
  }
  
  
  
  
  
  
}



## get sentinel only for region [i]
sentinel_i <- sentinel$filterBounds(regions$filterMetadata('mapb', 'equals', 37))

## get sample points for the region [i]
samples_i <- samples$filterMetadata('mapb', 'equals', 37)

## compute additional bands
geo_coordinates <- ee$Image$pixelLonLat()$
  clip(regions$filterMetadata('mapb', 'equals', 37))

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
  clip(regions$filterMetadata('mapb', 'equals', 37))$
  rename('hand')

#LOOP HERE
## sort a year
sentinel_i <- sentinel_i$filter(ee$Filter$eq('year', sample(x= 2016:2021, size= 1)))$mosaic()

# bind auxiliary bands into sentinel mosaic
sentinel_ij <- sentinel_i$addBands(lat)$
  addBands(lon_sin)$
  addBands(lon_cos)$
  addBands(hand)

## select year
## get spectral signatures 
sample_ij <- as.data.frame(na.omit(ee_as_sf(sentinel_ij$
                                            sampleRegions(collection= samples_i,
                                                          scale= 10,
                                                          geometries= TRUE,
                                                          tileScale= 2), via = 'drive')))

## remove description columns 
sample_ij <- sample_ij[ , -which(names(sample_ij) %in% c("id","mapb", "geometry"))]

## set RF heuristic learning functions
customRF <- list(type = "Classification",
                 library = "randomForest",
                 loop = NULL)

## set parameters to be optimized 
customRF$parameters <- data.frame(parameter = c("mtry", "ntree"),
                                  reference = rep("numeric", 2),
                                  label = c("mtry", "ntree"))

## set searching method 
customRF$grid <- function(x, y, len = NULL, search = "grid") {}

## set training function 
customRF$fit <- function(x, y, wts, param, lev, last, weights, classProbs) {
  randomForest(x, y,
               mtry = param$mtry,
               ntree=param$ntree)
}

## set prediction function 
customRF$predict <- function(modelFit, newdata, preProc = NULL, submodels = NULL)
  predict(modelFit, newdata)

## set data-structure functions 
customRF$sort <- function(x) x[order(x[,1]),]
customRF$levels <- function(x) x$reference

## set train control 
control <- trainControl(method="repeatedcv", 
                        number=10, 
                        repeats=3,
                        allowParallel = TRUE)

## set a grid of parameters to be tested (half od default, default and double)
tunegrid <- expand.grid(.mtry=c(sqrt(ncol(sample_ij))/2, sqrt(ncol(sample_ij)), sqrt(ncol(sample_ij))*2),
                        .ntree=c(100, 300))

## standardize seed
set.seed(1)

## create a sub sample of x percent
p <- 10

## run n times
#for (k in 1:20) {
#  
#}

## perform sub sample
sub_sample <- sample_ij[sample(x= 1: nrow(sample_ij),
                               size = round(nrow(sample_ij) / 100 * p)) ,]

## train model 
custom <- train(as.factor(reference)~.,
                data= sub_sample, 
                method= customRF, 
                metric= 'Accuracy', 
                tuneGrid= tunegrid, 
                trControl= control)



