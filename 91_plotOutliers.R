## plot number of samples removed with outlier filter
## dhemerson.costa@ipam.org.br

library(ggplot2)

## import table
data <- read.csv('../table/filterOutlier.csv')[-1]


## rename
data$class <- gsub('^3$', 'Forest', 
                   gsub('^4$', 'Savanna',
                        gsub('^11$', 'Wetland',
                             gsub('^12$', 'Grassland', data$class))))

## reorder factors
data$class <- factor(data$class, levels = c("Forest", "Savanna", "Wetland", "Grassland"))

## compute difference
data$abs_diff <- data$raw - data$filtered
data$rel_diff <- (data$abs_diff / data$raw) * 100

## plot general
ggplot (data= data, aes(x=as.factor(class), y= rel_diff)) +
  geom_jitter(alpha=0.4, aes(colour= as.factor(class), pch=as.factor(year))) +
  geom_boxplot(outlier.shape=NA, alpha=0.4) +
  scale_colour_manual(values=c('#006400', '#00ff00', '#45C2A5', '#B8AF4F')) +
  theme_bw() +
  xlab(NULL) + ylab ('Relative difference (%)')

ggplot (data= data, aes(x=as.factor(class), y= abs_diff)) +
  geom_jitter(alpha=0.4, aes(colour= as.factor(class), pch=as.factor(year))) +
  geom_boxplot(outlier.shape=NA, alpha=0.4) +
  scale_colour_manual(values=c('#006400', '#00ff00', '#45C2A5', '#B8AF4F')) +
  theme_bw() +
  xlab(NULL) + ylab ('Absolute difference (samples)')

## ploit by region
ggplot (data= data, aes(x=as.factor(class), y= rel_diff)) +
  geom_jitter(alpha=0.9, aes(colour= as.factor(class)), size=1.5) +
  scale_colour_manual(values=c('#006400', '#00ff00', '#45C2A5', '#B8AF4F')) +
  facet_wrap(~region) +
  theme_bw() +
  xlab(NULL) + ylab ('Relative difference (%)')

