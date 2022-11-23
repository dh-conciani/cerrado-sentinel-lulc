## plot areas from collection 1 - sentinel
## dhemerson.costa@ipam.org.br

# read libraries
library(ggplot2)
library(reshape2)

## avoid sci-notation
options(scipen= 999)

## set root
root <- './table/area/'

## list files
files <- list.files(root, full.names= TRUE)

## create recipe
data <- as.data.frame(NULL)

## read and stack files
for (i in 1:length(unique(files))) {
  ## read file [i]
  x <- read.csv(files[i])[-1][-6]
  ## merge
  data <- rbind(data, x)
  rm(x)
}

## rename classes
data$class_id <- gsub('^3$', 'Forest', 
                      gsub('^4$', 'Savanna',
                           gsub('^11$', 'Wetland',
                                gsub('^12$', 'Grassland',
                                     gsub('^15$', 'Farming',
                                          gsub('^19$', 'Farming',
                                               gsub('^21$', 'Farming',
                                                    gsub('^25$', 'Non-vegetated',
                                                         gsub('^33$', 'Water',
                                                              gsub('^29$', 'Rocky-outcrop',
                                                                   data$class_id))))))))))

## parse filenames and get suitable names
data$file <- substr(data$file, start= nchar('CERRADO_sentinel_') + 1, stop= 1e2)

## plot
ggplot(data= data, mapping= aes(x= year, y= area/1e6, group= as.factor(file), col= as.factor(file))) +
  #stat_summary(fun='sum', geom= 'line',  alpha= .15, size=3) +
  stat_summary(fun='sum', geom= 'line', size= 1) +
  scale_colour_manual(values=c('red', 'blue', 'gray90', 'gray90', 'gray90', 'gray90', 'gray90', 'gray90','gray90', 'gray90', 'gray90', 
                               'gray90', 'gray90', 'gray90', 'gray90', 'black')) + 
  facet_wrap(~class_id, scales= 'free_y') + 
  theme_bw() +
  ylab('Área (Mha)') +
  xlab(NULL)
