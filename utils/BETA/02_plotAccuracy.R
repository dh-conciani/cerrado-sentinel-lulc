## plot accuracy
## dhemerson.costa@ipam.org.br

## read libraries
library (ggplot2)
library(ggrepel)

## define root
root <- '../table/accuracy/v31'

## set function to read table
getTable <- function(obj) {
  ## create an empty recipe
  recipe <- as.data.frame(NULL)
  
  for (i in 1:length(list.files(root))) {
    ## get raw csv
    x_obj <- read.csv(list.files(root, full.names= TRUE)[i])
    ## filter (remove first and last)
    x_obj <- x_obj[-1][-5]
    ## rename
    colnames(x_obj)[4] <- 'REGION'
    ## bind
    recipe <- rbind(recipe, x_obj)
  }
  
  return(recipe)
}

## read table
data <- getTable(obj= root)

## line plot
ggplot (data, aes(x= as.numeric(YEAR), y= GLOBAL_ACC, colour= reorder(VERSION, GLOBAL_ACC))) +
  stat_summary(fun='mean', geom= 'point', size= 1.5) +
  stat_summary(fun='mean', geom= 'line', size= 1) +
  scale_colour_manual("Versão", values=c('red', 'orange', 'darkgreen'), labels=c('Sentinel BETA', 'Sentinel BETA + Segmentação', 'Coleção 6')) +
  theme_bw() +
  xlab(NULL) + ylab('Acurácia Global')


## box plot
ggplot(data, aes(x=as.factor(YEAR), y= GLOBAL_ACC, fill= reorder(VERSION, GLOBAL_ACC), label= REGION)) +
  geom_text_repel(position = position_jitter(seed=1), size= 2.5, aes(colour=reorder(VERSION, GLOBAL_ACC))) +
  #geom_jitter(seed=1, alpha=0.1, aes(colour=reorder(VERSION, GLOBAL_ACC))) +
  geom_boxplot(alpha=0.2) +
  scale_fill_manual("Versão", values=c('red', 'orange', 'blue'), labels=c('Sentinel BETA', 'Sentinel BETA + Segmentação', 'Coleção 6')) +
  scale_colour_manual("Versão", values=c('red', 'orange', 'blue'), labels=c('Sentinel BETA', 'Sentinel BETA + Segmentação', 'Coleção 6')) +
  theme_bw() +
  xlab(NULL) + ylab('Acurácia Global')


## return means
aggregate(x=list(accuracy= data$GLOBAL_ACC),
          by=list(version= data$VERSION),
          FUN= 'mean')

## per region
## line plot
ggplot (data, aes(x= as.numeric(YEAR), y= GLOBAL_ACC, colour= reorder(VERSION, GLOBAL_ACC))) +
  stat_summary(fun='mean', geom= 'point', size= 1.5) +
  stat_summary(fun='mean', geom= 'line', size= 1) +
  scale_colour_manual("Versão", values=c('red', 'orange', 'darkgreen'), labels=c('Sentinel BETA', 'Sentinel BETA + Segmentação', 'Coleção 6')) +
  theme_bw() +
  xlab(NULL) + ylab('Acurácia Global') +
  facet_wrap(~REGION)
