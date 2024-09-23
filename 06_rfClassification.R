## -- -- -- -- 05_rfClassification
## Run smileRandomForest classifier - Mapbiomas Collection 9.0
## dhemerson.costa@ipam.org.br and barbara.silva@ipam.org.br

## Read libraries
library(rgee)
library(dplyr)
library(stringr)
ee_Initialize()

## Define strings to be used as metadata
samples_version <- '4'   # input training samples version
output_version <-  '6'   # output classification version 

## Define output asset
output_asset <- 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/generalMap/'

## Read landsat mosaic 
mosaic <- ee$ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')$
  filterMetadata('biome', 'equals', 'CERRADO')

## Define years to be classified
years <- unique(mosaic$aggregate_array('year')$getInfo())

## Read classification regions (vetor)
regions_vec <- ee$FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2')

## Classification regions (imageCollection, one region per image)
regions_ic <- 'users/dh-conciani/collection7/classification_regions/eachRegion_v2_10m/'

## Define regions to be processed 
regions_list <- sort(unique(regions_vec$aggregate_array('mapb')$getInfo()))

## Get already computed files (for current version)
files <- ee_manage_assetlist(path_asset= output_asset)

## Generate expected files
expected <- as.vector(outer(regions_list, years, function(r, y) {
  paste0(output_asset, 'CERRADO_', r, '_', y, '_v', output_version)
})
)

# Find remaining files to process
missing <- expected[!expected %in% files$ID]

## Define class dictionary
classDict <- list(
  class= c(3, 4, 11, 12, 15, 18, 25, 33),
  name = c('Forest', 'Savanna', 'Wetland', 'Grassland', 'Pasture', 'Agriculture', 'Non-Vegetated', 'Water')
)

### Training samples (prefix string)
training_dir <- 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/training/'

# Extract the region using regex
regions_list <- unique(gsub(".*CERRADO_([0-9]+)_.*", "\\1", missing))

## For each region
for (i in 1:length(regions_list)) {
  print(paste0('processing region [', regions_list[i], ']'))
  
  ## Get the vector for the region [i]
  region_i_vec <- regions_vec$filterMetadata('mapb', 'equals', as.numeric(regions_list[i]))$geometry()
  
  ## Get the raster for the region [i]
  region_i_ras = ee$Image(paste0(regions_ic, 'reg_', regions_list[i]))
  
  ## Compute static auxiliary bands
  geo_coordinates <- ee$Image$pixelLonLat()$
    updateMask(region_i_ras)
  
  ## Get latitude
  lat <- geo_coordinates$select('latitude')$
    add(5)$
    multiply(-1)$
    multiply(1000)$
    toInt16()
  
  ## Get longitude
  lon_sin <- geo_coordinates$select('longitude')$
    multiply(pi)$
    divide(180)$
    sin()$
    multiply(-1)$
    multiply(10000)$
    toInt16()$
    rename('longitude_sin')
  
  ## Cosine
  lon_cos <- geo_coordinates$select('longitude')$
    multiply(pi)$
    divide(180)$
    cos()$
    multiply(-1)$
    multiply(10000)$
    toInt16()$
    rename('longitude_cos')
  
  ## Get heigth above nearest drainage
  hand <- ee$ImageCollection("users/gena/global-hand/hand-100")$
    mosaic()$
    toInt16()$
    unmask(0)$
    updateMask(region_i_ras)$
    rename('hand')
  
  ## get digital elevation models
  merit_dem <- ee$Image('MERIT/DEM/v1_0_3')$select('dem')$int16()$
    unmask(0)$
    updateMask(region_i_ras)$
    rename('merit_dem')
  
  ana_dem <- ee$Image('projects/et-brasil/assets/anadem/v1')$
    unmask(0)$
    updateMask(region_i_ras)$
    rename('ana_dem')
  
  ## get slopes
  merit_slope <- ee$Terrain$slope(merit_dem)$rename('merit_slope')
  ana_slope <- ee$Terrain$slope(ana_dem)$rename('ana_slope')
  
  ## Time since last fire
  fire_age <- ee$Image('users/barbarasilvaIPAM/collection8/masks/fire_age_v2')
  ## add 2023 
  fire_age <- fire_age$addBands(fire_age$select('classification_2022')$rename('classification_2023'))
  
  # Use grep to match exactly followed by the year and version
  missing_i <- missing[grep(paste0('CERRADO_', regions_list[i], '_[0-9]{4}_v6$'), missing)]
  
  # Extract the years using sregex
  years_ij <- as.numeric(str_extract(missing_i, "[0-9]{4}"))
  
  ## For each year
  for (j in 1:length(years_ij)) {
    print(paste0('----> ', years_ij[j]))
    
    ## get the sentinel  for the current year 
    mosaic_i <- mosaic$filterMetadata('year', 'equals', as.numeric(years_ij[j]))$
      filterBounds(region_i_vec)$
      mosaic()
    
    ## get bands
    bands <- mosaic_i$bandNames()$getInfo()
    
    ## metrics to be considered for indexes
    indexMetrics <- c('median', 'median_dry', 'median_wet', 'stdDev')
    
    ## function to retain bandnames for the indexes
    getBands <- function(metrics, band) {
      return(
        grep(paste(metrics, collapse = "|"), 
             grep(band, bands, value = TRUE, perl = TRUE), value = TRUE)
      )
    }
    
    ## get bandnames
    blue <- getBands(indexMetrics, 'blue')
    green <- getBands(indexMetrics, 'green(?!.*texture)')
    red <- getBands(indexMetrics, 'red(?!_edge)')
    redge1 <- getBands(indexMetrics, 'red_edge_1')
    redge2 <- getBands(indexMetrics, 'red_edge_2')
    redge3 <- getBands(indexMetrics, 'red_edge_3')
    nir <- getBands(indexMetrics, 'nir')
    swir1 <- getBands(indexMetrics, 'swir1')
    swir2 <- getBands(indexMetrics, 'swir2')
    
    ## normalized difference vegetation index 
    getNDVI <- function(image) {
      x <- image$select(nir)$subtract(image$select(red))
      y <- image$select(nir)$add(image$select(red))
      z <- x$divide(y)
      return (
        z$rename(paste0('ndvi_', indexMetrics))
      )
    }
    
    ## normalized difference built-up index
    getNDBI <- function(image) {
      x <- image$select(swir1)$subtract(image$select(nir))
      y <- image$select(swir1)$add(image$select(nir))
      z <- x$divide(y)
      return (
        z$rename(paste0('ndbi_', indexMetrics))
      )
    }
    
    ## normalized difference water index 
    getNDWI <- function(image) {
      x <- image$select(nir)$subtract(image$select(swir1))
      y <- image$select(nir)$add(image$select(swir1))
      z <- x$divide(y)
      return (
        z$rename(paste0('ndwi_', indexMetrics))
      )
    }
    
    ## modified normalized difference water index
    getMNDWI <- function(image) {
      x <- image$select(green)$subtract(image$select(swir1))
      y <- image$select(green)$add(image$select(swir1))
      z <- x$divide(y)
      return (
        z$rename(paste0('mndwi_', indexMetrics))
      )
    }
    
    ## photochemical reflectance index 
    getPRI <- function(image) {
      x <- image$select(blue)$subtract(image$select(green))
      y <- image$select(blue)$add(image$select(green))
      z <- x$divide(y)
      return (
        z$rename(paste0('pri_', indexMetrics))
      )
    }
    
    ## cellulose absorption index 
    getCAI <- function(image) {
      x <- image$select(swir2)$divide(image$select(swir1))
      return(
        x$rename(paste0('cai_', indexMetrics))
      )
    }
    
    ## green chlorofyll vegetation index 
    getGCVI <- function(image) {
      x <- image$select(nir)$divide(image$select(green))
      y <- x$subtract(1)
      return(
        y$rename(paste0('gcvi_', indexMetrics))
      )
    }
    
    ## enhanced vegetation index 2
    getEVI2 <- function(image) {
      x <- image$select(nir)$subtract(image$select(red))
      yi <- image$select(red)$multiply(2.4)
      yi <- yi$add(image$select(nir))$add(1)
      z <- x$divide(yi)$multiply(2.5)
      return(
        z$rename(paste0('evi2_', indexMetrics))
      )
    }
    
    ## soil adjusted vegetation index
    getSAVI <- function(image) {
      x <- image$select(nir)$subtract(image$select(red))
      y <- image$select(nir)$add(image$select(red))$add(0.5)
      z <- x$divide(y)$multiply(1.5)
      return(
        z$rename(paste0('savi_', indexMetrics))
      )
    }
    
    ## normalized difference phenology index 
    getNDPI <- function(image) {
      xi <- image$select(red)$multiply(0.74)
      xj <- image$select(swir1)$multiply(0.26)
      xij <- xi$add(xj)
      x <- image$select(nir)$subtract(xij)
      y <- image$select(nir)$add(xij)
      z <- x$divide(y)
      return(
        z$rename(paste0('ndpi_', indexMetrics))
      )
    }
    
    #### specific for sentinel-2
    
    ## normalized difference vegetation index with red edge band 
    getNDVIRED <- function(image) {
      x <- image$select(redge1)$subtract(image$select(red))
      y <- image$select(redge1)$add(image$select('red_median'))
      z <- x$divide(y)
      return(
        z$rename(paste0('ndvired_', indexMetrics))
      )
    }
    
    ## vegetation index 700nm
    getVI700 <- function(image) {
      x <- image$select(redge1)$subtract(image$select(red))
      y <- image$select(redge1)$add(image$select(red))
      z <- x$divide(y)
      return(
        z$rename(paste0('vi700_', indexMetrics))
      )
    }
    
    ## inverted red-edge chlorophyll index
    getIRECI <- function(image) {
      x <- image$select(redge3)$subtract(image$select(red))
      y <- image$select(redge1)$divide(image$select(redge2))
      z <- x$divide(y)
      return(
        z$rename(paste0('ireci_', indexMetrics))
      )
    }
    
    ## chlorofyll index red edge
    getCIRE <- function(image) {
      x <- image$select(nir)$divide(image$select(redge1))$subtract(1)
      return(
        x$rename(paste0('cire_', indexMetrics))
      )
    }
    
    ## transformed chlorophyll absorption in reflectance index
    getTCARI <- function(image) {
      xi <- image$select(redge1)$subtract(image$select(red))
      xj <- image$select(redge1)$subtract(image$select(green))
      xk <- image$select(redge1)$divide(image$select(red))
      xj <- xj$multiply(0.2)
      xl <- xi$subtract(xj)
      xm <- xl$multiply(xk)$multiply(3)
      return(
        xm$rename(paste0('tcari_', indexMetrics))
      )
    }
    
    ## spectral feature depth vegetation index
    getSFDVI <- function(image) {
      x <- image$select(green)$add(image$select(nir))
      x <- x$divide(2)
      y <- image$select(red)$add(image$select(redge1))
      y <- y$divide(2)
      z <- x$subtract(y)
      return(
        z$rename(paste0('sfdvi_', indexMetrics))
      )
    }
    
    ## normalized difference red edge index
    getNDRE <- function(image) {
      x <- image$select(nir)$subtract(image$select(redge1))
      y <- image$select(nir)$add(image$select(redge1))
      z <- x$divide(y)
      return(
        z$rename(paste0('ndre_', indexMetrics))
      )
    }
    
    #a <- getNDRE(mosaic_i)
    #Map$addLayer(a$select('ndre_median'), list(palette= c('black', 'white'), min=-0.1, max= 0.8))
    
    getIndexes <- function(image) {
      return(
        getNDVI(image)$addBands(
          getNDWI(image)$addBands(
            getCAI(image)$addBands(
              getGCVI(image)$addBands(
                getPRI(image)$addBands(
                  getEVI2(image)$addBands(
                    getSAVI(image)$addBands(
                      getNDBI(image)$addBands(
                        getMNDWI(image)$addBands(
                          getCIRE(image)$addBands(
                            getVI700(image)$addBands(
                              getIRECI(image)$addBands(
                                getTCARI(image)$addBands(
                                  getSFDVI(image)$addBands(
                                    getNDVIRED(image)$addBands(
                                      getNDPI(image)$addBands(
                                        getNDRE(image)
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    }
    
    ## add index
    indexImage <- getIndexes(mosaic_i)

    ## bind mapbiomas mosaic and auxiliary bands
    mosaic_i <- mosaic_i$addBands(lat)$
      addBands(lon_sin)$
      addBands(lon_cos)$
      addBands(hand)$
      addBands(merit_dem)$
      addBands(ana_dem)$
      addBands(merit_slope)$
      addBands(ana_slope)$
      addBands(fire_age$select(paste0('classification_', years_ij[j]))$updateMask(region_i_ras)$rename('fire_age'))$
      addBands(ee$Image(as.numeric(years_ij[j]))$int16()$rename('year'))$
      addBands(indexImage)
    
    ## Limit water samples only to 175 samples (avoid over-estimation)
    water_samples <- ee$FeatureCollection(paste0(training_dir, 'v', samples_version, '/train_col9_reg', regions_list[i], '_', years_ij[j], '_v', samples_version))$
      filter(ee$Filter$eq("reference", 33))$
      filter(ee$Filter$eq("hand", 0))$
      limit(175)                        ## insert water samples limited to 175 
    
    ## Merge filtered water samples with other classes
    training_ij <- ee$FeatureCollection(paste0(training_dir, 'v', samples_version, '/train_col9_reg', regions_list[i], '_', years_ij[j], '_v', samples_version))$
      filter(ee$Filter$neq("reference", 33))$ ## remove water samples
      merge(water_samples)
    
    ## Get bands
    bandNames_list <- mosaic_i$bandNames()$getInfo()
    
    ## Train classifier
    classifier <- ee$Classifier$smileRandomForest(
      numberOfTrees= 300,
      variablesPerSplit= floor(sqrt(length(bandNames_list))))$
      setOutputMode('MULTIPROBABILITY')$
      train(training_ij, 'reference', bandNames_list)
    
    ## Perform classification and mask only to region 
    predicted <- mosaic_i$classify(classifier)$
      updateMask(region_i_ras)
    
    ## Retrieve classified classes
    classes <- sort(training_ij$aggregate_array('reference')$distinct()$getInfo())
    
    ## Flatten array of probabilities
    probabilities <- predicted$arrayFlatten(list(as.character(classes)))
    
    ## Rename
    probabilities <- probabilities$select(as.character(classes), 
                                          classDict$name[match(classes, classDict$class)])
    
    ## Scale probabilities to 0-100
    probabilities <- probabilities$multiply(100)$round()$toInt8()
    
    ## Get classification from maximum value of probability 
    ## Convert probabilities to an array
    probabilitiesArray <- probabilities$toArray()$
      ## get position of max value
      arrayArgmax()$
      ## get values
      arrayGet(0)
    
    ## Remap to mapbiomas collection
    classificationImage <- probabilitiesArray$remap(
      from= seq(0, length(classes)-1),
      to= as.numeric(classes)
    )$rename('classification')
    
    ## Include classification as a band 
    toExport <- classificationImage
      #$addBands(probabilities)
    
    ## Set properties
    toExport <- toExport$
      set('collection', '9')$
      set('version', output_version)$
      set('biome', 'CERRADO')$
      set('mapb', as.numeric(regions_list[i]))$
      set('year', as.numeric(years_ij[j]))
    
    ## Create filename
    file_name <- paste0('CERRADO_', regions_list[i], '_', years_ij[j], '_v', output_version)
    
    ## Build task
    task <- ee$batch$Export$image$toAsset(
      image= toExport,
      description= file_name,
      assetId= paste0(output_asset, file_name),
      scale= 10,
      maxPixels= 1e13,
      pyramidingPolicy= list('.default' = 'mode'),
      region= region_i_ras$geometry()
    )
    
    ## Export 
    task$start()
    
  } ## End of year processing
  
  print ('------------> NEXT REGION --------->')
}

print('All tasks have been started. Now wait a few hours and have fun :)')
