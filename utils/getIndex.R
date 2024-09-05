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
nir <- getBands(indexMetrics, 'nir')
swir1 <- getBands(indexMetrics, 'swir1')
swir1 <- getBands(indexMetrics, 'swir2')

getNDVI <- function(image) {
  return(
    (image$select(nir)$subtract(image$select(red)))$
      divide(image$select(nir)$add(image$select(red)))$
      rename(paste0('ndvi_', indexMetrics))
  )
}






a <- getNDVI(mosaic)
a$bandNames()$getInfo()
Map$addLayer(a$select('ndvi_median'))
red_image$bandNames()$getInfo()
Map$addLayer(red)


indexMetrics

#green <- mosaic$select(grep(paste(indexMetrics, collapse = "|"), 
#                          grep("green(?!.*texture)", bandnames, value = TRUE, perl = TRUE), value = TRUE))
