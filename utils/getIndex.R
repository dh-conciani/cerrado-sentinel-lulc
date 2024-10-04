## compute indexes from sentinel mapbiomas mosaic
## dhemerson.costa@ipam.org.br

## read libraries
library(rgee)
ee_Initialize()

## read sentinel mosaic
mosaic <- ee$ImageCollection('projects/mapbiomas-mosaics/assets/SENTINEL/BRAZIL/mosaics-3')$
  filter(ee$Filter$inList('biome', as.list('CERRADO')))$
  filter(ee$Filter$eq('year', 2023))$
  mosaic()

## get bands
bandnames <- mosaic$bandNames()$getInfo()

## metrics to be considered for indexes
indexMetrics <- c('median', 'median_dry', 'median_wet', 'stdDev')

## function to retain bandnames for the indexes
getBands <- function(metrics, band) {
  return(
    grep(paste(metrics, collapse = "|"), 
         grep(band, bandnames, value = TRUE, perl = TRUE), value = TRUE)
  )
}

## get bandnames
blue <- getBands(indexMetrics, 'blue')
green <- getBands(indexMetrics, 'green(?!.*texture)')
red <- getBands(indexMetrics, 'red(?!_edge)')
redge1 <- getBands(indexMetrics, 'red_edge_1')
redge2 <- getBands(indexMetrics, 'red_edge_2')
redge3 <- getBands(indexMetrics, 'red_edge_2')
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
indexImage <- getIndexes(mosaic)

## merge with collection
mosaic <- mosaic$addBands(indexImage)
mosaic$bandNames()$getInfo()
