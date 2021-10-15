import ee
import pandas as pd 

ee.Initialize()

## Remove outliers from training dataset (by class) 
## Uuse ndvi_median (most important variable for Cerrado) as a proxy 
## For clarification, write to dhemerson.costa@ipam.org.br

## ::::: General rule ::::: //
## remove all the training samples that have more than 2 standard deviations of euclidean distance in relation to the median
n_std = 2

## folder with samples to be filtered
files_in = 'projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/training-sentinel/'

## define bandname to be used
bandnames = ['ndvi_median']; 

## define the version of input samples
version = '11'

## define regions to be filtered
regions = [ 
            1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 
            12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
            23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 
            34, 35, 36, 37, 38
            ]

## define years to be filtered
years = [
        2016, 2017, 2018, 2019, 2020
        ]

## define classes to be filtered
classes = [3, 4, 11, 12]

## create empty objects to store statistics
obj_region = []
obj_year = []
obj_class = []
obj_raw = []
obj_filtered = []

## for each region 
for region_i in regions:
    ## for each year
    for year_i in years:
        ## read training samples
        dataset = ee.FeatureCollection(files_in + 'train_col_6_CERRADO_reg' + str(region_i) + '_ano_' + str(year_i) + '_' + version)
        
        ## create an recipe with data of classes not filterd
        recipe = dataset.filterMetadata('reference', 'equals', 15)
        recipe = recipe.merge(dataset.filterMetadata('reference', 'equals', 19))
        recipe = recipe.merge(dataset.filterMetadata('reference', 'equals', 21))
        recipe = recipe.merge(dataset.filterMetadata('reference', 'equals', 25))
        recipe = recipe.merge(dataset.filterMetadata('reference', 'equals', 33))
        
        ## for each class to be filtered
        for class_i in classes:
            ## subset nv class
            nv = dataset.filterMetadata('reference', 'equals', class_i)
            
            ## compute NDVI median
            median = nv\
            .filter(ee.Filter.notNull(bandnames))\
            .reduceColumns(reducer= ee.Reducer.median(), selectors= bandnames)
            
            ## compute standard deviation 
            sd = nv\
            .filter(ee.Filter.notNull(bandnames))\
            .reduceColumns(reducer= ee.Reducer.stdDev(), selectors= bandnames)
            
            ## store values
            median = ee.Number(median.get('median'))
            sd =  ee.Number(sd.get('stdDev')).multiply(n_std)
            
            ## compute range to be filtered
            range_min = median.subtract(sd)
            range_max = median.add(sd)
            
            ## filter
            dataset2 = nv.filterMetadata('ndvi_median', 'greater_than', range_min)
            dataset2 = dataset2.filterMetadata('ndvi_median', 'less_than', range_max)
            
            ## merge filtered data (class 3, 4, 11 and 12) with unfiltered data (15, 19, 21, 25, 33)
            recipe = recipe.merge(dataset2)
            
            ## store basic statistics            
            obj_region = obj_region + [region_i]                 
            obj_year = obj_year + [year_i]
            obj_class = obj_class + [class_i]            
            obj_raw = obj_raw + [dataset.filterMetadata('reference', 'equals', class_i).size().getInfo()]
            obj_filtered = obj_filtered + [recipe.filterMetadata('reference', 'equals', class_i).size().getInfo()]
            
            ## export
            task = ee.batch.Export.table.toAsset(recipe, 'train_col_6_CERRADO_reg' + str(region_i) + '_ano_' + str(year_i) + '_' + version + '_filtered',\
                                                 files_in + 'train_col_6_CERRADO_reg' + str(region_i) + '_ano_' + str(year_i) + '_' + version + '_filtered') 
        
        ## start task
        task.start()
        print('region: ' + str(region_i) + ' | year: ' + str(year_i) + ' | version:' + version)
        print('---->') 
        
## build statistics 
stat_df = {'region': obj_region, 
           'year': obj_year,
           'class': obj_class,
           'raw': obj_raw,
           'filtered': obj_filtered}

## convert statistics to data.frame
stat_df = pd.DataFrame(data= stat_df)
        
## export statistics as csv
stat_df.to_csv(path_or_buf='data.csv')    
print ('statistics exported: root ./')
print ('done :)')
