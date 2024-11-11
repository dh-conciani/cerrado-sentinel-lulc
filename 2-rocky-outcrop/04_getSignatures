## --- --- --- 04_getSignatures
## Exported data is composed by spatialPoints with spectral signature values grouped by column
## Auxiliary bands were computed (Lat, Long, NDVI amplitude and HAND) and imported SRTM geomorphometric features
## barbara.silva@ipam.org.br

## Read libraries
library(rgee)
ee_Initialize()

## Define strings to use as metadata
version <- "2"     ## version string

## Define output directory
dirout <- 'projects/barbaracosta-ipam/assets/collection-2_rocky_outcrop/training/v2/'

## Biome layer
biomes <- ee$Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster')
cerrado <- biomes$updateMask(biomes$eq(4))

## Area of Interest (AOI)
aoi <- ee$Image(1)$clip(ee$FeatureCollection ('projects/barbaracosta-ipam/assets/collection-2_rocky_outcrop/masks/aoi_v1'))

## Define mosaic input 
mosaic <- ee$ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')$
  filterMetadata('biome', 'equals', 'CERRADO')

## Define years to extract spectral signatures (temporal operator)
years <- unique(mosaic$aggregate_array('year')$getInfo())

## Get samplePoints
samples <- ee$FeatureCollection('projects/barbaracosta-ipam/assets/collection-2_rocky_outcrop/sample/points/samplePoints_v1')
samples <- samples$randomColumn("random");
samples <- samples$filter(ee$Filter$lt("random", 0.72));
cat("Num pontos:", samples$size()$getInfo(), "\n")

## Get bandnames to be extracted
bands <- mosaic$first()$bandNames()$getInfo()

# Import geomorphometric variables
relative <- ee$Image ('projects/barbaracosta-ipam/assets/base/CERRADO_MERIT_RELATIVERELIEF')$rename('relative')
valleydepth <- ee$Image('projects/barbaracosta-ipam/assets/base/CERRADO_MERIT_VALLEYDEPTH')$rename('valleydepth')
tpi <- ee$Image('projects/barbaracosta-ipam/assets/base/CERRADO_MERIT_TPI')$rename('tpi')
merit_dem <- ee$Image('MERIT/DEM/v1_0_3')$select('dem')$int16()$updateMask(aoi)$rename('merit_dem')
merit_slope <- ee$Terrain$slope(merit_dem)$rename('merit_slope')
dxx <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/dxx")$mosaic()$updateMask(aoi)$rename('dxx')
dxy <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/dxy")$mosaic()$updateMask(aoi)$rename('dxy')
dyy <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/dyy")$mosaic()$updateMask(aoi)$rename('dyy')
pcurv <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/pcurv")$mosaic()$updateMask(aoi)$rename('pcurv')
tcurv <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/tcurv")$mosaic()$updateMask(aoi)$rename('tcurv')
aspect_cos <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/aspect-cosine")$mosaic()$updateMask(aoi)$rename('aspect_cos');
aspect_sin <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/aspect-sine")$mosaic()$updateMask(aoi)$rename('aspect_sin')
eastness <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/eastness")$mosaic()$updateMask(aoi)$rename('eastness')
northness <- ee$ImageCollection("projects/sat-io/open-datasets/Geomorpho90m/northness")$mosaic()$updateMask(aoi)$rename('northness')

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
  
  ## Print samples
  samples_ij <- samples
  print(paste0('number of points: ', samples_ij$size()$getInfo()))      
  
  ## Get training samples
  training_i <- mosaic_i$sampleRegions(collection= samples_ij,
                                       scale= 10,
                                       geometries= TRUE,
                                       tileScale= 4)
  
  ## Remove NA or NULL from extracted data
  training_i <- training_i$filter(ee$Filter$notNull(bands))
  
  ## Build task to export data
  task <- ee$batch$Export$table$toAsset(
    training_i, 
    paste0('train_col2_rocky_', years[j] , '_v' , version),
    paste0(dirout , 'train_col2_rocky_', years[j] , '_v' , version)
  )
  
  ## Start task
  task$start()
  print('========================================')
  print(paste("Ano:", years[j]))
  print('========================================')
}

## done! :)
