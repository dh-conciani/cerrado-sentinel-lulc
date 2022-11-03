## explore regional parameters 

library(ggplot2)

## read data
rf <- read.csv('./utils/col1/_params/rf.csv', sep=' ', dec='.')
bands <- read.csv('./utils/col1/_params/bands.csv', sep=' ', dec= '.')

## plot 
ggplot(rf, aes(mtry)) +
  geom_density(fill='yellow', col= 'gray20', alpha=0.3) +
  theme_minimal()

ggplot(rf, aes(ntree)) +
  geom_density(fill='green', col= 'gray20', alpha=0.3) +
  theme_minimal()

## get the most important variables
for (i in 1:length(unique(bands$region))) {
  ## get region x
  x <- subset(bands, region == unique(bands$region)[i])
  ## get 15 first
  x <- levels(reorder(x$band, -x$mean))[1:80]
  ## compile 
  if (exists('top') == FALSE) {
    top <- x
  } else {
    top <- rbind(top, x)
  }
  
}

## what variables most appear in the top
best <- reshape2::melt(table(top))

## get the worse  variables
for (i in 1:length(unique(bands$region))) {
  ## get region x
  x <- subset(bands, region == unique(bands$region)[i])
  ## get 15 first
  x <- levels(reorder(x$band, -x$mean))[81:length(x$band)]
  ## compile 
  if (exists('worse') == FALSE) {
    worse <- x
  } else {
    worse <- rbind(worse, x)
  }
  
}

## what variables most appear in the worse
worse <- reshape2::melt(table(worse))

ggplot(data= worse, aes(x= reorder(worse, value), y= value, colour= value)) +
  geom_point(stat='identity') +
  scale_colour_gradient(low= '#0029F6', high= '#FF02D9') +
  coord_flip() +
  xlab(NULL) +
  ylab('number of regions') +
  theme_minimal() +
  theme(text = element_text(size = 9))

