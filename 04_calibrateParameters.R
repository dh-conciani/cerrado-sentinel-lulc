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

## set a number of random years to be used in the estimation
n_years <- 3 

## define the number of model repetitions in each year
n_rep <- 10

## set sub sample of proportion (%)
p <- 10

## set repeated cross-validation @params
dcv_n <- 10   ## number
dcv_rep <- 3  ## repeats

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
  print(paste0('processing region ', region_name[i],' --- ', i, ' of ', length(region_name)))
  
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
  
  ## get spectral signatures for a random year (repeat n times)
  for (j in 1:n_years) {
    print(paste0('year ', j, ' of ', n_years))
    
    ## filter sentinel mosaic for a random year
    sentinel_ij <- sentinel_i$filter(ee$Filter$eq('year', sample(x= 2016:2021, size= 1)))$mosaic()$
      ## add auxiliary bands
      addBands(lon_sin)$
      addBands(lon_cos)$
      addBands(hand)
    
    ## get spectral signatures from GEE and ingest locally 
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
    customRF$prob <- function(modelFit, newdata, preProc = NULL, submodels = NULL)
      
      ## set data-structure functions 
      customRF$sort <- function(x) x[order(x[,1]),]
    customRF$levels <- function(x) x$reference
    
    ## set train control 
    control <- trainControl(method="repeatedcv", 
                            number= dcv_n, 
                            repeats= dcv_rep,
                            allowParallel = TRUE)
    
    ## set a grid of parameters to be tested (half od default, default and double)
    tunegrid <- expand.grid(.mtry=c(round(sqrt(ncol(sample_ij)))/2, round(sqrt(ncol(sample_ij))), round(sqrt(ncol(sample_ij))*2)),
                            .ntree=c(100, 300))
    
    ## standardize seed
    set.seed(1)
    
    ## run n times
    for (k in 1:n_rep) {
      print(paste0('running repetition ', k, ' of ', n_rep))
      
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
      
      ## in the first iteration, build objects
      if (exists('tune') == FALSE) {
        ## get best parameters
        tune <- custom$bestTune
        imp <- varImp(custom, scale= TRUE)$importance
        imp$band <- row.names(imp)
      } else {
        ## get best parameters
        ## add
        tune <- rbind(tune, custom$bestTune)
        imp_x <- varImp(custom, scale= TRUE)$importance
        imp_x$band <- row.names(imp_x)
        imp <- rbind(imp, imp_x)
      }
      
    } ## end of sub-sample repetition
    
    
    
    ## aggregate statistics for tuning parameters
    tune_file_ij <- as.data.frame(cbind(mtry= round(mean(tune$mtry)), 
                                        ntree= round(mean(tune$ntree)), 
                                        region = region_name[i],
                                        year = j))
    
    rm(tune)

    ## compile all years of each region
    if (exists('tune_y') == FALSE) {
      tune_y <- tune_file_ij
    } else {
      tune_y <- rbind(tune_y, tune_file_ij)
    }
    
    ## aggregate statistics for variable importance
    bands_file_ij <- as.data.frame(cbind(band= unique(imp$band),
                                         sum= aggregate(x=list(sum = imp$Overall), by=list(band= imp$band), FUN= 'sum')$sum,
                                         mean= aggregate(x=list(mean = imp$Overall), by=list(band= imp$band), FUN= 'mean')$mean,
                                         sd= aggregate(x=list(sd = imp$Overall), by=list(band= imp$band), FUN= 'sd')$sd,
                                         region= region_name[i],
                                         year= j))
    
    rm(imp)
    
    ## compile all years of each region
    if (exists('bands_y') == FALSE) {
      bands_y <- bands_file_ij
    } else {
      bands_y <- rbind(bands_y, bands_file_ij)
    }
    
    
  } ## end of years loop
  
  ## aggregate statistics for tuning parameters
  tune_file_i <- as.data.frame(cbind(mtry= round(mean(tune_y$mtry)), 
                                     ntree= round(mean(tune_y$ntree)), 
                                     region = region_name[i]))
  
  ## insert into database
  ## rf parameters
  if (exists('tune_xx') == FALSE) {
    tune_xx <- tune_file_i
  } else {
    tune_xx <- rbind(tune_xx, tune_file_i)
  }
  
    ## aggregate region metrics
  bands_file_i <- as.data.frame(cbind(band= unique(bands_y$band),
                                      sum= aggregate(x=list(sum = as.numeric(bands_y$sum)), by=list(band= bands_y$band), FUN= 'mean')$sum,
                                      mean= aggregate(x=list(mean = as.numeric(bands_y$mean)), by=list(band= bands_y$band), FUN= 'mean')$mean,
                                      sd= aggregate(x=list(sd = as.numeric(bands_y$sd)), by=list(band= bands_y$band), FUN= 'mean')$sd,
                                      region= region_name[i]))
  
  ## variable importance
  if (exists('bands_xx') == FALSE) {
    bands_xx <- bands_file_i
  } else {
    bands_xx <- rbind(bands_xx, bands_file_i)
  }
  
  rm(tune_y, bands_y)
  
  print ('done :) -----------> next')
  
  ## clean regional variables
  #rm (sentinel_i, samples_i, geo_coordinates, lat, lon_sin, lon_cos, hand)
} ## end of regions loop

## export tables
write.table(bands_xx, file = './_params/bands.csv')
write.table(tune_xx, file = './_params/rf.csv')
print('end o/')
