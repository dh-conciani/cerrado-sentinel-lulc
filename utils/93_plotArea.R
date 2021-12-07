## plot area from tests
## dhemerson.costa@IPAM.org.br

## read libraries
library (ggplot2)
library (reshape2)
library (dplyr)
library (tidyr)
library (tools)

## define root
root <- '../table/area/v31/'

## define function to import table
readData <- function (path) {
  ## define empty recipe
  recipe <- as.data.frame(NULL)
  ## for each file in root
  for (i in 1:length(list.files(root))) {
    ## import csv [i]
    temp <- read.csv(list.files(root, full.names=TRUE)[i])[-1][-12] ## remove first and last columns
    ## add filename as a column
    temp$filename <- file_path_sans_ext(list.files(root))[i]
    ## melt data
    temp <- melt (temp, id= c('year', 'filename', 'region'))
    ## merge with recipe
    recipe <- rbind (recipe, temp)
  }
  
  ## reorder
  recipe$variable <- factor(recipe$variable,
                            levels = c("forest", "savanna", "wetland", "grassland", 
                                       "mosaic", "other_nonVeg", "water")) 
  
  
  return (recipe)
}

## import data
data <- readData(root)

## plot general
#ggplot(subset(data, filename != "0_area_col6"), aes(x= as.numeric(year), y= as.numeric(value)/1000000, colour= filename)) +
ggplot(na.omit(data), aes(x= as.numeric(year), y= as.numeric(value)/1000000, colour= filename)) +
  stat_summary(geom='line', fun='sum', size=1) +
  stat_summary(geom='point', fun='sum', size=1.5) +
  #scale_colour_manual(values=c('red', 'orange', 'yellow', 'green', 'forestgreen')) +
  scale_colour_manual(values=c('gray40', 'red')) +
  facet_wrap(~variable, scales= 'free') +
  xlab('year') + ylab ('Area (Mha)') +
  theme_bw() +
  theme(panel.grid.minor.x = element_blank(),
        panel.grid.minor.y = element_blank())
  




