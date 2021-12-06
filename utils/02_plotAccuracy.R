## plot accuracy
## dhemerson.costa@ipam.org.br

## read libraries
library (ggplot2)

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

## plot
ggplot(data, aes(x=as.factor(YEAR), y= GLOBAL_ACC, fill= VERSION)) +
  geom_jitter(alpha=0.2, aes(colour=VERSION)) +
  geom_boxplot(alpha=0.7) +
  #scale_fill_manual("Versão", values=c('red', 'blue'), labels=c('Sentinel v31', 'Coleção 6 - Integração 1')) +
  #scale_colour_manual("Versão", values=c('red', 'blue'), labels=c('Sentinel v31', 'Coleção 6 - Integração 1')) +
  theme_bw() +
  xlab('Ano') + ylab('Acurácia Global')

str(data)



