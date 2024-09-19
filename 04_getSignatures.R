## For clarification, write to <dhemerson.costa@ipam.org.br> 
## Exported data is composed by spatialPoints with spectral signature values grouped by column
## Auxiliary bands were computed (Lat, Long, NDVI amplitude and HAND)

## read libraries
library(rgee)
library(stringr)
ee_Initialize()

## define version to be checked 
version_in <- "2"     ## version string
version_out <- "4"

## set folder to be checked 
dirout <- paste0('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/training/v', version_out, '/')

## list files on the asset
files <- ee_manage_assetlist(path_asset= dirout)

## set regions
regions <- 1:38

## set years
years <- 2016:2023

# Generate expected patterns
expected <- as.vector(outer(regions, years, function(r, y) {
  paste0('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/training/v', version_out, '/train_col9_reg', r, '_', y, '_v', version_out)
  })
)

# Find missing entries
missing <- expected[!expected %in% files$ID]


###########################################################
## biome
biomes <- ee$Image('projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster')
cerrado <- biomes$updateMask(biomes$eq(4))

## define mosaic input 
mosaic <- ee$ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')$
  filterMetadata('biome', 'equals', 'CERRADO')

## import classification regions
regionsCollection <- ee$FeatureCollection('users/dh-conciani/collection7/classification_regions/vector_v2')

## import sample points
samples <- ee$FeatureCollection(paste0('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO9_DEV/CERRADO/SENTINEL_DEV/sample/points/samplePoints_v', version_in))

## time since last fire
fire_age <- ee$Image('users/barbarasilvaIPAM/collection8/masks/fire_age_v2')
## add 2023 
fire_age <- fire_age$addBands(fire_age$select('classification_2022')$rename('classification_2023'))

## get bandnames to be extracted
bands <- mosaic$first()$bandNames()$getInfo()

## process each missing file 
for(m in 1:length(missing)) {
  ## get region name
  region_list <- as.numeric(str_extract(missing[m], "(?<=reg)\\d+"))
  # Extract year
  year_i <- str_extract(missing[m], "\\d{4}")
  ## print
  print(missing[m])
  
  ## subset region
  region_i <- regionsCollection$filterMetadata('mapb', "equals", region_list)$geometry()
  
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
  
  ## get digital elevation models
  merit_dem <- ee$Image('MERIT/DEM/v1_0_3')$select('dem')$int16()$
    clip(region_i)$rename('merit_dem')
  
  ana_dem <- ee$Image('projects/et-brasil/assets/anadem/v1')$
    clip(region_i)$rename('ana_dem')
  
  ## get slopes
  merit_slope <- ee$Terrain$slope(merit_dem)$rename('merit_slope')
  ana_slope <- ee$Terrain$slope(ana_dem)$rename('ana_slope')
  
  ## get the landsat mosaic for the current year 
  mosaic_i <- mosaic$filterMetadata('year', 'equals', as.numeric(year_i))$
    filterBounds(region_i)$
    mosaic()$select(bands)
  
  ## compute spectral indexes (new: ndpi, ndbi, mndwi)
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
    addBands(fire_age$select(paste0('classification_', year_i))$clip(region_i)$rename('fire_age'))$
    addBands(ee$Image(as.numeric(year_i))$int16()$rename('year'))$
    addBands(indexImage)
  
  
  ## subset sample points for the region 
  samples_ij <- samples$filterBounds(regionsCollection$filterMetadata('mapb', "equals", region_list))
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
    training_i, paste0('train_col9_reg' , region_list , '_' , year_i , '_v' , version_out),
    paste0(dirout , 'train_col9_reg' , region_list , '_' , year_i , '_v' , version_out))
  
  ## start task
  task$start()
  print ('========================================')
  
}
