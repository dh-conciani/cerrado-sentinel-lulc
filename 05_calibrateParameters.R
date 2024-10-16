## -- -- -- -- 05_calibrateParameters
## Select feature space and calibrate Random Forest (RF) hyperparameters for classification.
## dhemerson.costa@ipam.org.br and babara.silva@ipam.org.br

## Load required packages
library(rgee)
library(tidyverse)

## Avoid scientific notation in numbers
options(scipen= 9e3)

## Initialize Earth Engine
ee_Initialize()

## Set the version of the training samples to be used
version <- "5"

## Set the training data folder path
folder <- paste0('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/training/v', version, '/')

## Load the classification regions
regions <- ee$FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2')

## --- --- Set sample size and selection functions
## Function to calculate the number of years based on a proportion
yearSize <- function(end_year, start_year, proportion) {
  return (
    round((end_year - start_year + 1) / 100 * proportion, digits=0)
  )
}

## Function to randomly select years based on a proportion
getYears <- function(start_year, end_year, proportion) {
  return(
    sample(x= start_year:end_year, 
           size= yearSize(end_year, start_year, proportion), replace= F)
  )
}

## Create a grid of parameters (ntree, mtry, region, year) to test
combinations <- expand.grid(
  ntree = c(100, 200, 300),  ## Number of trees
  mtry = c(4, 8, 12),        ## Variables to consider at each split
  region = c(1:38),          ## Classification region IDs
  year = c(2016:2023)        ## Years for calibration
)

## --- --- Check for already processed files 
## Comment if is the first run 
## Read already processed parameters to avoid reprocessing
processedTable <- read.csv('./_aux/temp/modelParams.csv', sep=' ')

## Filter combinations to exclude the ones already processed
combinations <- anti_join(combinations, processedTable, by = c("ntree", "mtry", "region", "year"))
## ---
#combinations <- combinations[1:2000,]


## Initialize tables to store parameter results and variable importance
paramTable <- as.data.frame(NULL)
importanceTable <- as.data.frame(NULL)

## Initialize a counter for progress tracking
count <- 0

## Loop over each unique classification region
for (i in 1:length(unique(combinations$region))) {
  print(paste0('Processing region ', unique(combinations$region)[i],' --- ', 
               i, ' of ', length(unique(combinations$region))))
  
  ## Sort random years to calibrate parameters 
  # set_of_years <- getYears(start_year= 2016,
  #                          end_year= 2023, 
  #                          proportion= 20)
  
  ## Loop over each year
  for (j in 1:length(unique(combinations$year))) {
    print(paste0('Year ', j, ' of ', length(unique(combinations$year)), 
                 ' ----> ', unique(combinations$year)[j]))


  ## Loop over each year for the given region
  for (j in 1:length(unique(combinations$year))) {
    print(paste0('Year ', j, ' of ', length(unique(combinations$year)), 
                 ' ----> ', unique(combinations$year)[j]))
    
    ## Load training samples for the selected region [i] and year [j]
    samples_ij <- ee$FeatureCollection(paste0(folder, 'train_col9_reg', unique(combinations$region)[i],
                                              '_', unique(combinations$year)[j], '_v', version))
    
    ## Get the band names
    bands <- names(samples_ij$first()$getInfo()$properties)
    
    ## Remove descriptors (e.g., 'mapb', 'year')
    bands <- bands[!bands %in% c('mapb', 'year')]
    
    ## Get the combinations for the specific region and year
    try(combinations_k <- subset(combinations, region == unique(combinations$region)[i] &
                                   year == unique(combinations$year)[j]), silent = TRUE)
    
   ## Skip if no combinations are available for the selected region-year pair
    if (nrow(combinations_k) == 0) {
      count <- count + 1
      next
    }
    
    ## Loop over each parameter combination for the region-year pair
    for (k in 1:nrow(combinations_k)) {
      ## Update the progress counter
      count <- count + 1
      print(paste0('Training combination ', k, ' of ', nrow(combinations_k), 
                   ' ~ iteration ', count, ' of ', nrow(combinations)))
      
      ## Record the starting time of the training process
      startTime <- Sys.time()
      
      ## Split the samples into training (70%) and testing (30%) sets
      samples_ij <- samples_ij$randomColumn()
      samples_ij_training <- samples_ij$filter('random <= 0.7')
      samples_ij_test <- samples_ij$filter('random > 0.8')
      
      ## Train a Random Forest classifier using the selected hyperparameters
      trainedClassifier <- ee$Classifier$smileRandomForest(
        numberOfTrees = combinations_k[k,]$ntree,
        variablesPerSplit = combinations_k[k,]$mtry
      )$train(
        features = samples_ij_training,
        classProperty = 'reference',
        inputProperties = bands
      )
      
      ## Classify the testing set and calculate the confusion matrix and accuracy
      samples_ij_test <- samples_ij_test$classify(trainedClassifier)
      testAccuracy <- samples_ij_test$errorMatrix('reference', 'classification')
      
      print('Getting model results')
      
      ## Store model accuracy for the current parameter combination
      try(tempParam <- as.data.frame(rbind(cbind(
        ntree = combinations_k[k,]$ntree,
        mtry = combinations_k[k,]$mtry,
        region = unique(combinations$region)[i],
        year = unique(combinations$year)[j],
        accuracy = round(testAccuracy$accuracy()$getInfo(), digits=4)
      ))), silent= T)
      
      ## If accuracy results are not available, continue to the next iteration
      if (!exists('tempParam')) {
        endTime <- Sys.time()
        print(paste0('Task Runtime: ', round(endTime - startTime, digits=1),'s ----> Estimated time to finish: ',
                     round((endTime - startTime) * nrow(combinations)/3600, digits=1), ' hours'))
        next
      }
      
      ## Store feature importance for the current parameter combination
      try(tempImportance <- as.data.frame(rbind(cbind(
        ntree = combinations_k[k,]$ntree,
        mtry = combinations_k[k,]$mtry,
        region = unique(combinations$region)[i],
        year = unique(combinations$year)[j],
        bandNames = bands[bands != 'reference'],
        importance = as.numeric(unlist(trainedClassifier$explain()$get('importance')$getInfo()))
      ))), silent= T)
      
      ## If importance results are not available, continue to the next iteration
      if (!exists('tempImportance')) {
        endTime <- Sys.time()
        print(paste0('Task Runtime: ', round(endTime - startTime, digits=1),'s ----> Estimated time to finish: ',
                     round((endTime - startTime) * nrow(combinations)/3600, digits=1), ' hours'))
        next
      }
      
      ## Append results to the parameter and importance tables
      paramTable <- rbind(paramTable, tempParam)
      importanceTable <- rbind(importanceTable, tempImportance)
      
      ## Record the end time and estimated remaining time
      endTime <- Sys.time()
      print(paste0('Task Runtime: ', round(endTime - startTime, digits=1),'s ----> Estimated time to finish: ',
                   round((endTime - startTime) * nrow(combinations)/3600, digits=1), ' hours'))
      
      ## Clean up temporary variables
      rm(tempParam)
      rm(tempImportance)
      
    }
    
  }
  
}

## Save the parameter and importance data locally for further analysis
write.table(paramTable, file = './_aux/modelParams.csv', row.names= FALSE)
write.table(importanceTable, file = './_aux/varImportance.csv', row.names=FALSE)
