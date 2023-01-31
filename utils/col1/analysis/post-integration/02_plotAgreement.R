options(scipen= 999)
## plot agreement
## dhemerson.costa@ipam.org.br

## read libraries
library(ggplot2)

## read files
files <- list.files('./table/integration/agreement', full.names= TRUE)

## merge tables
for (i in 1:length(files)) {
  print(files[i])
  x <- read.csv(files[i])
  x <-x[, !names(x) %in% c('system.index', '.geo')]
  if (exists('tab') == FALSE) {
    tab <- x
  } else {
    tab <- rbind(tab, x)
  }
  rm(x)
}

## read mapbiomas dictionary
dict <- read.csv('./dict/mapbiomas-dict-en2.csv', sep= ';')

## translate mapbiomas ids into string
## translate [class_ids]
for (j in 1:length(unique(tab$class_id))) {
  x <- subset(dict, id == unique(tab$class_id)[j])
  y <- subset(tab, class_id == unique(tab$class_id)[j])
  y$class_id <- gsub(paste0('^',x$id,'$'), x$level_1.2, y$class_id)
  if (exists('tab2') == FALSE) {
    tab2 <- y 
  } else {
    tab2 <- rbind(tab2, y)
  }
}
## translate [class_ref]
for (k in 1:length(unique(tab2$class_ref))) {
  x <- subset(dict, id == unique(tab$class_ref)[k])
  y <- subset(tab2, class_ref == unique(tab$class_ref)[k])
  y$class_ref <- gsub(paste0('^',x$id,'$'), x$level_1.2, y$class_ref)
  if (exists('tab3') == FALSE) {
    tab3 <- y
  } else {
    tab3 <- rbind(tab3, y)
  }
}
rm (dict, tab, tab2, x, y)

## translate agreement types
tab3$territory <- 
  gsub('^1$', 'Agreement',
     gsub('^2$', 'Only Sentinel C1',
          gsub('^3$', 'Only Collection 7', 
               tab3$territory)))

##reorder levels
tab3$territory <- factor(tab3$territory, levels=c('Agreement', 'Only Sentinel C1', 'Only Collection 7'))

## remove ignore
tab3 <- subset(tab3, class_id != 'Ignore')

## compute total agreement/disagreement per year~class_ref (to use as label in the plot)
for (l in 1:length(unique(tab3$class_ref))) {
  x <- subset(tab3, class_ref == unique(tab3$class_ref)[l])
  for (m in 1:length(unique(x$year))) {
    y <- subset(x, year == unique(x$year)[m])
    y <- aggregate(x=list(area= y$area), by= list(territory= y$territory, year= y$year, class_ref= y$class_ref), FUN='sum')
    y$perc <- round(y$area/sum(y$area) * 100, digits=0)
    if (exists('tab4') == FALSE) {
      tab4 <- y
    } else {
      tab4 <- rbind(tab4, y)
    }
  }
}
rm (x, y)

## compute statistical parameters of agreement/disagreement to use as labels 
for (n in 1:length(unique(tab4$class_ref))) {
  x <- subset(tab4, class_ref == unique(tab4$class_ref)[n])
  ## compute labels
  lab <- 
    ## get spatial agreement 
    paste0('Spt. Agree.: ', 'μ ',
           round(mean(subset(x, territory == 'Agreement')$area/1e6), digits= 1), ' Mha', 
           ' (', round(mean(subset(x, territory == 'Agreement')$perc), digits= 1), '%', ' ∓ ', 
           round(sd(subset(x, territory == 'Agreement')$perc), digits=1),'%', ')', 
           '\n',
           'Area Disagr.: ', 'μ ',
           round((mean(subset(x, territory == 'Only Sentinel C1')$area -
                         subset(x, territory == 'Only Collection 7')$area))/1e6, digits=1), ' Mha',
           ' (', round(mean(subset(x, territory == 'Only Sentinel C1')$perc -
                        subset(x, territory == 'Only Collection 7')$perc), digits=1),'%', ' ∓ ', 
           round(sd(subset(x, territory == 'Only Sentinel C1')$perc -
                      subset(x, territory == 'Only Collection 7')$perc), digits=1), '%', ')'
    )
  
  ## get only entry that will receive labels
  x <- subset(x, territory == 'Only Collection 7' & year == 2016)
  x$label <- lab
  if (exists('tab5') == FALSE) {
    tab5 <- x
  } else {
    tab5 <- rbind(tab5, x)
  }
rm(x, lab)
}

## plot 
ggplot(data= tab3, mapping= aes(x= as.factor(year), y= area/1e6, fill= class_id)) +
  geom_bar(stat='identity') + 
  scale_fill_manual('MapBiomas Class',
                    values=c('#e974ed', '#006400', '#935132', '#b8af4f', '#fff3bf', '#af2a2a', '#ffd966', '#ff8C00', '#00ff00',
                             '#0000ff', '#45c2a5')) +
  facet_grid(cols= vars(territory), rows= vars(class_ref),
             scales= 'free_y') +
  ## use year percents as label (tab4)
  geom_text(data= tab4, mapping=aes(x= as.factor(year), y= area/1e6, 
                                    label= paste0(perc,'%'),
                                    fill= NULL), size= 3, vjust=-0.1, col= 'black') +
  ## use parameters as label (tab5)
  geom_text(data= tab5, mapping= aes(x= as.factor(year), y= area/1e6, 
                                     label= label, fill= NULL), size=3,
                                     vjust=-3, col= 'blue', hjust= 0.05) +
  xlab(NULL) +
  ylab('Area (Mha)') + 
  theme_bw() 

