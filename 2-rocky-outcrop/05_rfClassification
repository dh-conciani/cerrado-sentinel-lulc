## -- -- -- -- 05_rfClassification
## Run smileRandomForest classifier - MapBiomas 10 meters - Collection 2
## barbara.silva@ipam.org.br 

## Read libraries
library(rgee)
library(dplyr)
library(stringr)
ee_Initialize()

## Define strings to be used as metadata
samples_version <- '2'   # input training samples version
output_version <-  '1'   # output classification version 

## Define output asset
output_asset <- 'projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/generalMap_rocky/'

## Define mosaic input 
mosaic <- ee$ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')$
  filterMetadata('biome', 'equals', 'CERRADO')

## Define years to be classified
years <- unique(mosaic$aggregate_array('year')$getInfo())

## Read area of interest
aoi_vec <- ee$FeatureCollection('projects/barbaracosta-ipam/assets/collection-2_rocky_outcrop/masks/aoi_v1')$geometry()
aoi_img <- ee$Image(1)$clip(aoi_vec)

## Get bandnames to be extracted
bands <- mosaic$first()$bandNames()$getInfo()

## Import geomorphometric variables
relative <- ee$Image ('projects/barbaracosta-ipam/assets/base/CERRADO_MERIT_RELATIVERELIEF')$rename('relative')
valleydepth <- ee$Image('projects/barbaracosta-ipam/assets/base/CERRADO_MERIT_VALLEYDEPTH')$rename('valleydepth')
tpi <- ee$Image('projects/barbaracosta-ipam/assets/base/CERRADO_MERIT_TPI')$rename('tpi')
merit_dem <- ee$Image('MERIT/DEM/v1_0_3')$select('dem')$int16()$updateMask(aoi_img)$rename('merit_dem')
merit_slope <- ee$Terrain$slope(merit_dem)$rename('merit_slope')
dxx <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/dxx")$mosaic()$updateMask(aoi_img)$rename('dxx')
dxy <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/dxy")$mosaic()$updateMask(aoi_img)$rename('dxy')
dyy <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/dyy")$mosaic()$updateMask(aoi_img)$rename('dyy')
pcurv <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/pcurv")$mosaic()$updateMask(aoi_img)$rename('pcurv')
tcurv <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/tcurv")$mosaic()$updateMask(aoi_img)$rename('tcurv')
aspect_cos <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/aspect-cosine")$mosaic()$updateMask(aoi_img)$rename('aspect_cos');
aspect_sin <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/aspect-sine")$mosaic()$updateMask(aoi_img)$rename('aspect_sin')
eastness <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/eastness")$mosaic()$updateMask(aoi_img)$rename('eastness')
northness <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/northness")$mosaic()$updateMask(aoi_img)$rename('northness')

## Paste auxiliary bandnames
aux_bands <- c('latitude', 'longitude_sin', 'longitude_cos', 'hand', 'amp_ndvi_3yr')

## Training samples (prefix string)
training_dir <- 'projects/barbaracosta-ipam/assets/collection-2_rocky_outcrop/training/'

## Define class dictionary
classDict <- list(
  class= c(1, 2, 29),
  name = c('Natural', 'Antropic', 'RockyOutcrop')
)

## For each year
for (j in 1:length(years)) {
  
  ## Compute additional bands
  geo_coordinates <- ee$Image$pixelLonLat()
  
  ## Get latitude
  lat <- geo_coordinates$select('latitude')$
    add(5)$
    multiply(-1)$
    multiply(1000)$
    toInt16()
  
  ## Get longitude
  lon_sin <- geo_coordinates$select('longitude')$
    multiply(pi)$divide(180)$
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
  
  ## Get height above nearest drainage
  hand <- ee$ImageCollection("users/gena/global-hand/hand-100")$
    mosaic()$
    toInt16()$
    rename('hand')
  
  ## Get the Landsat mosaic for the current year 
  mosaic_i <- mosaic$filterMetadata('year', 'equals', years[j])$
    mosaic()$select(bands)
  
  ## Compute spectral indexes
  indexMetrics <- c('median', 'median_dry', 'median_wet', 'stdDev')
  
  ## Function to retain bandnames for the indexes
  getBands <- function(metrics, band) {
    return(
      grep(paste(metrics, collapse = "|"), 
           grep(band, bands, value = TRUE, perl = TRUE), value = TRUE)
    )
  }
  
  ## Get bandnames
  blue <- getBands(indexMetrics, 'blue')
  green <- getBands(indexMetrics, 'green(?!.*texture)')
  red <- getBands(indexMetrics, 'red(?!_edge)')
  redge1 <- getBands(indexMetrics, 'red_edge_1')
  redge2 <- getBands(indexMetrics, 'red_edge_2')
  redge3 <- getBands(indexMetrics, 'red_edge_3')
  nir <- getBands(indexMetrics, 'nir')
  swir1 <- getBands(indexMetrics, 'swir1')
  swir2 <- getBands(indexMetrics, 'swir2')
  
  ## Normalized difference vegetation index 
  getNDVI <- function(image) {
    x <- image$select(nir)$subtract(image$select(red))
    y <- image$select(nir)$add(image$select(red))
    z <- x$divide(y)
    return (
      z$rename(paste0('ndvi_', indexMetrics))
    )
  }
  
  ## Normalized difference built-up index
  getNDBI <- function(image) {
    x <- image$select(swir1)$subtract(image$select(nir))
    y <- image$select(swir1)$add(image$select(nir))
    z <- x$divide(y)
    return (
      z$rename(paste0('ndbi_', indexMetrics))
    )
  }
  
  ## Normalized difference water index 
  getNDWI <- function(image) {
    x <- image$select(nir)$subtract(image$select(swir1))
    y <- image$select(nir)$add(image$select(swir1))
    z <- x$divide(y)
    return (
      z$rename(paste0('ndwi_', indexMetrics))
    )
  }
  
  ## Modified normalized difference water index
  getMNDWI <- function(image) {
    x <- image$select(green)$subtract(image$select(swir1))
    y <- image$select(green)$add(image$select(swir1))
    z <- x$divide(y)
    return (
      z$rename(paste0('mndwi_', indexMetrics))
    )
  }
  
  ## Photochemical reflectance index 
  getPRI <- function(image) {
    x <- image$select(blue)$subtract(image$select(green))
    y <- image$select(blue)$add(image$select(green))
    z <- x$divide(y)
    return (
      z$rename(paste0('pri_', indexMetrics))
    )
  }
  
  ## Cellulose absorption index 
  getCAI <- function(image) {
    x <- image$select(swir2)$divide(image$select(swir1))
    return(
      x$rename(paste0('cai_', indexMetrics))
    )
  }
  
  ## Green chlorofyll vegetation index 
  getGCVI <- function(image) {
    x <- image$select(nir)$divide(image$select(green))
    y <- x$subtract(1)
    return(
      y$rename(paste0('gcvi_', indexMetrics))
    )
  }
  
  ## Enhanced vegetation index 2
  getEVI2 <- function(image) {
    x <- image$select(nir)$subtract(image$select(red))
    yi <- image$select(red)$multiply(2.4)
    yi <- yi$add(image$select(nir))$add(1)
    z <- x$divide(yi)$multiply(2.5)
    return(
      z$rename(paste0('evi2_', indexMetrics))
    )
  }
  
  ## Soil adjusted vegetation index
  getSAVI <- function(image) {
    x <- image$select(nir)$subtract(image$select(red))
    y <- image$select(nir)$add(image$select(red))$add(0.5)
    z <- x$divide(y)$multiply(1.5)
    return(
      z$rename(paste0('savi_', indexMetrics))
    )
  }
  
  ## Normalized difference phenology index 
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
  
  ## Specific indexes for Sentinel-2 data
  
  ## Normalized difference vegetation index with red edge band 
  getNDVIRED <- function(image) {
    x <- image$select(redge1)$subtract(image$select(red))
    y <- image$select(redge1)$add(image$select('red_median'))
    z <- x$divide(y)
    return(
      z$rename(paste0('ndvired_', indexMetrics))
    )
  }
  
  ## Vegetation index 700nm
  getVI700 <- function(image) {
    x <- image$select(redge1)$subtract(image$select(red))
    y <- image$select(redge1)$add(image$select(red))
    z <- x$divide(y)
    return(
      z$rename(paste0('vi700_', indexMetrics))
    )
  }
  
  ## Inverted red-edge chlorophyll index
  getIRECI <- function(image) {
    x <- image$select(redge3)$subtract(image$select(red))
    y <- image$select(redge1)$divide(image$select(redge2))
    z <- x$divide(y)
    return(
      z$rename(paste0('ireci_', indexMetrics))
    )
  }
  
  ## Chlorofyll index red edge
  getCIRE <- function(image) {
    x <- image$select(nir)$divide(image$select(redge1))$subtract(1)
    return(
      x$rename(paste0('cire_', indexMetrics))
    )
  }
  
  ## Transformed chlorophyll absorption in reflectance index
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
  
  ## Spectral feature depth vegetation index
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
  
  ## Normalized difference red edge index
  getNDRE <- function(image) {
    x <- image$select(nir)$subtract(image$select(redge1))
    y <- image$select(nir)$add(image$select(redge1))
    z <- x$divide(y)
    return(
      z$rename(paste0('ndre_', indexMetrics))
    )
  }
  
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
  
  ## Add index
  indexImage <- getIndexes(mosaic_i)
  
  ## Join the mapbiomas mosaic with the auxiliary bands
  mosaic_i <- mosaic_i$addBands(lat)$
    addBands(lon_sin)$
    addBands(lon_cos)$
    addBands(hand)$
    addBands(merit_slope)$
    addBands(dxx)$
    addBands(dxy)$
    addBands(dyy)$
    addBands(pcurv)$
    addBands(tcurv)$
    addBands(aspect_cos)$
    addBands(aspect_sin)$
    addBands(eastness)$
    addBands(northness)$
    addBands(merit_dem)$
    addBands(relative)$
    addBands(valleydepth)$
    addBands(tpi)$
    addBands(ee$Image(years[j])$int16()$rename('year'))$
    addBands(indexImage)
  
  ## Get bands
  bandNames_list <- mosaic_i$bandNames()$getInfo()
  
  ## Get training samples
  training_ij <- ee$FeatureCollection(paste0(training_dir, 'v', samples_version, '/train_col2_rocky_', years[j], '_v', samples_version))
  
  ## Train classifier
  classifier <- ee$Classifier$smileRandomForest(
    numberOfTrees= 300)$
    setOutputMode('MULTIPROBABILITY')$
    train(training_ij, 'class', bandNames_list)
  
  ## Perform classification and mask only to AOI region 
  predicted <- mosaic_i$classify(classifier)$
    updateMask(aoi_img)
  
  ## Retrieve classified classes
  classes <- sort(training_ij$aggregate_array('class')$distinct()$getInfo())
  
  ## Flatten array of probabilities
  probabilities <- predicted$arrayFlatten(list(as.character(classes)))
  
  ## Rename
  probabilities <- probabilities$select(as.character(classes), 
                                        classDict$name[match(classes, classDict$class)])
  
  ## Acale probabilities to 0-100
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
  toExport <- classificationImage$addBands(probabilities)
  
  ## Set properties
  toExport <- toExport$
    set('collection', '2')$
    set('version', output_version)$
    set('biome', 'CERRADO')$
    set('year', as.numeric(years[j]))
  
  ## Export each year as a separate image in the collection
  file_name <- paste0('CERRADO_ROCKY_', years[j], '_v', output_version)
  task <- ee$batch$Export$image$toAsset(
    image = toExport,
    description = file_name,
    assetId = paste0(output_asset, file_name),
    scale = 10,
    maxPixels = 1e13,
    pyramidingPolicy = list('.default' = 'mode'),
    region = aoi_vec
  )
  task$start()
  print(paste("Task started:", file_name))
}

print('All tasks have been started. Now wait a few hours and have fun :)')
