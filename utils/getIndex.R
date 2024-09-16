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

getNDVI <- function(image) {
  return(
    (image$select(nir)$subtract(image$select(red)))$
      divide(image$select(nir)$add(image$select(red)))$
      rename(paste0('ndvi_', indexMetrics))
  )
}

getNDWI <- function(image) {
  return(
    (image$select(nir)$subtract(image$select(swir1)))$
      divide(image$select(nir)$add(image$select(swir1)))$
      rename(paste0('ndwi_', indexMetrics))
  )
}

getCAI <- function(image) {
  return(
    image$select(swir2)$divide(image$select(swir1))$
      rename(paste0('cai_', indexMetrics))
  )
}

getGCVI <- function(image) {
  return(
    (image$select(nir)$divide(image$select(green)))$subtract(1)$
      rename(paste0('gcvi_', indexMetrics))
  )
}

getPRI <- function(image) {
  return(
    (image$select(blue)$subtract(image$select(green)))$
      divide(image$select(blue)$add(image$select(green)))$
      rename(paste0('pri_', indexMetrics))
  )
}

getEVI2 <- function(image) {
   return(
     ((image$select(nir)$subtract(image$select(red)))$multiply(2.5))$divide(
       image$select(nir)$add(2.4)$multiply(image$select(red)$add(1)))$
       rename(paste0('evi2_', indexMetrics))
     
   )
 }

getSAVI <- function(image) {
  return(
    ((image$select(nir)$subtract(image$select(red)))$multiply(1.5))$
      divide(image$select(nir)$add(0.5)$add(image$select(red)))$
      rename(paste0('savi_', indexMetrics))
  )
}

## specific for sentinel-2 with red edge bands 
getCIRE <- function(image) {
  return(
    (image$select(nir)$divide(image$select(redge1)))$subtract(1)$
      rename(paste0('cire_', indexMetrics))
  )
}

getVI700 <- function(image) {
  return(
    (image$select(redge1)$subtract(image$select(red)))$
      divide(image$select(redge1)$add(image$select(red)))$
      rename(paste0('vi700_', indexMetrics))
  )
}

getIRECI <- function(image) {
  return(
    (image$select(redge3)$subtract(image$select(red)))$
      divide(image$select(redge1))$divide(image$select(redge2))$
      rename(paste0('ireci_', indexMetrics))
    
  )
}

getTCARI <- function(image) {
  
}


x <- getIRECI(mosaic)
Map$addLayer(x$select('ireci_median'))




getIndexes <- function(image) {
  return(
    getNDVI(image)$addBands(
      getNDWI(image)$addBands(
        getCAI(image)$addBands(
          getGCVI(image)$addBands(
            getPRI(image)$addBands(
              getEVI2(image)$addBands(
                getSAVI(image)
              )
            )
          )
        )
      )
    )
  )
}

indexImage <- getIndexes(mosaic)

## merge with collection
mosaic <- mosaic$addBands(indexImage)
mosaic$bandNames()$getInfo()
