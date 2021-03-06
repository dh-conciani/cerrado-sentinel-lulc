## perform classificatio nusing smileRandomForest classifier 

## import gee api 
import ee
ee.Initialize()

## define in/out properties 
BIOME_NAME = "CERRADO"
SAMPLES_VERSION = '31'
OUTPUT_VERSION = '31'

## definir numero de árvores para o randomForest
RF_TREES = 100

## definir anos para classificar
YEARS = [ 
    '2016', '2017', '2018', '2019', '2020'
    ]

## definir regiões para classificar
REGION_IDS = [ 
    '1', '2', '3', '4', '5', '6', '7', 
    '8', '9', '10', '11'
    #'12', '13', '14',
    #'15', '16', '17', '18', '19', '20', '21',
    #'22', '23', '24', '25', '26', '27', '28', 
    #'29', '30', '31', '32', '33', '34', '35', 
    #'36', '37', '38'
]

## define band names to be used in the classification 
BAND_NAMES = [
          'blue_median', 'blue_median_wet', 'blue_median_dry', 'blue_min', 'blue_stdDev', 
          'green_median', 'green_median_dry', 'green_median_wet', 'green_median_texture', 'green_min', 'green_stdDev',
          'red_median', 'red_median_dry', 'red_min', 'red_median_wet', 'red_stdDev', 
          'nir_median', 'nir_median_dry', 'nir_median_wet', 'nir_min', 'nir_stdDev',
          'swir1_median', 'swir1_median_dry', 'swir1_median_wet', 'swir1_min', 'swir1_stdDev', 
          'swir2_median', 'swir2_median_wet', 'swir2_median_dry', 'swir2_min', 'swir2_stdDev', 
          'ndvi_median_dry', 'ndvi_median_wet', 'ndvi_median', 'ndvi_amp', 'ndvi_stdDev', 
          'ndwi_median', 'ndwi_median_dry', 'ndwi_median_wet', 'ndwi_amp', 'ndwi_stdDev',
          'evi2_median', 'evi2_median_dry', 'evi2_median_wet', 'evi2_amp', 'evi2_stdDev',
          'savi_median_dry', 'savi_median_wet', 'savi_median', 'savi_stdDev',
          'pri_median_dry', 'pri_median', 'pri_median_wet', 
          'gcvi_median', 'gcvi_median_dry', 'gcvi_median_wet', 'gcvi_stdDev',
          'hallcover_median', 'hallcover_stdDev',
          'cai_median', 'cai_median_dry', 'cai_stdDev',
          'gv_median', 'gv_amp', 'gv_stdDev', 
          'gvs_median', 'gvs_median_dry', 'gvs_median_wet', 'gvs_stdDev',
          'npv_median', 
          'soil_median', 'soil_amp', 'soil_stdDev',
          'cloud_median', 'cloud_stdDev', 
          'shade_median', 'shade_stdDev', 
          'ndfi_median', 'ndfi_median_dry', 'ndfi_median_wet', 'ndfi_amp', 'ndfi_stdDev',
          'sefi_median', 'sefi_stdDev', 'sefi_median_dry', 
          'wefi_median', 'wefi_median_wet', 'wefi_amp', 'wefi_stdDev',
          'slope', 'latitude', 'longitude',
]

## surface reflectance mosaic - 59 bandas selecionadas pelo featureSpace
#BAND_NAMES = [
#                "cai_median", "cai_median_dry", "evi2_amp", "evi2_median", "evi2_median_dry", "evi2_median_wet",
#                "gcvi_median", "gcvi_median_dry", "gcvi_median_wet", "gcvi_stdDev","green_median", "green_median_wet", 
#                "green_min", "gv_amp", "gv_median", "gv_stdDev","gvs_median", "gvs_median_dry", "gvs_median_wet",
#                "hallcover_median","ndfi_amp", "ndfi_median", "ndfi_median_dry", "ndfi_median_wet","ndvi_median",
#                "ndvi_median_dry", "ndvi_median_wet", "ndwi_amp", "ndwi_median", "ndwi_median_dry", "ndwi_median_wet",
#                "nir_median", "nir_median_dry", "nir_median_wet", "nir_min","pri_median_dry", "pri_median_wet", 
#                "red_median", "red_median_dry", "red_median_wet", "red_min","savi_median", "savi_median_dry", 
#                "savi_median_wet", "sefi_median", "sefi_median_dry","shade_median","slope","soil_median",
#                "swir1_median", "swir1_median_dry", "swir1_median_wet", "swir1_min", "swir2_median", "swir2_median_dry", 
#                "swir2_median_wet", "swir2_min", "wefi_median", "wefi_median_wet", 
#                'latitude', 'longitude', 'amp_ndvi_3anos', 'textG'
#]

## surface reflectance mosaic - 48 bandas que eram usadas nos antigos mosaicos
#BAND_NAMES = [
#          "red_median_dry", "red_median", "swir2_median", "hallcover_median", "gv_stdDev",
#          "shade_median", "red_min", "swir1_median", "ndfi_median", "gv_amp", "nir_median_wet", 
#          "ndwi_median", "swir1_median_wet", "green_min", "gcvi_median_wet", "ndvi_median_wet", 
#          "evi2_median_wet", "ndvi_median_dry", "nir_median", "green_median", "evi2_amp", "swir1_median_dry",
#          "ndvi_median", "savi_median_dry", "nir_median_dry", "savi_median_wet", "wefi_median_wet", "evi2_median_dry",
#          "gvs_median_wet", "ndfi_median_wet", "gcvi_median", "ndfi_median_dry", "pri_median_dry", "gvs_median",
#          "red_median_wet", "ndfi_amp", "swir2_median_dry", "slope", "green_median_dry", "evi2_stdDev", "pri_median",
#          "wefi_amp", "nir_stdDev", "ndvi_amp", "ndvi_stdDev", "wefi_stdDev", "savi_stdDev"
#  ]


## define input assets
### sentinel mosaics to be classified 
ASSET_MOSAICS = 'projects/nexgenmap/MapBiomas2/SENTINEL/mosaics'
### trainng samples 
ASSET_SAMPLES = 'projects/mapbiomas-workspace/AMOSTRAS/Cerrado/col6/training-sentinel/train_col_6_CERRADO_reg'
### classification output
ASSET_OUTPUT = 'users/dhconciani/sentinel-beta/sentinel-classification/'
### classification regions (vector)
ASSET_REGIONS = 'projects/mapbiomas-workspace/AUXILIAR/CERRADO/cerrado_regioes_c6'
### classification regions (raster)
ASSET_REGIONS_RASTER = "users/dhconciani/base/cerrado_regioes_c6_rasterBands"
### biomes (vector)
ASSET_BIOMESVECTOR = 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019'
### biomes_raster)
ASSET_BIOMESRASTER = 'projects/mapbiomas-workspace/AUXILIAR/biomas-2019-raster'

## define function to mask classification for the region 
def maskCollections(ic, reg):
    
    def maskImg (img):
        result = img.updateMask(ee.Image(reg.first()))
        return result
    
    masked = ic.map(maskImg)
    return masked

# import regions 
regions = ee.FeatureCollection(ASSET_REGIONS)
ic_regions = ee.ImageCollection(ASSET_REGIONS_RASTER)

## for each region 
for regionId in REGION_IDS:
    
    ## select region [i]
    region = regions.filterMetadata('mapb', 'equals', int(regionId)).geometry().bounds()
    region_ras = ic_regions.filterMetadata('mapb', 'equals', regionId)
    print("region:", regionId)
    
    ## for each year
    for year in YEARS:
        print("year:", year)
        ## create a ''time marker'' to be used in the stack operation 
        time_marker = int(year) - 2016
        
        ## limimt the number of water samples 
        #water = ee.FeatureCollection(ASSET_SAMPLES + regionId + '_ano_' + str(year) + '_' + SAMPLES_VERSION + '_filtered')\
        #    .filter(ee.Filter.eq("reference", 33))\
        #    .filter(ee.Filter.eq("slope", 0))\
        #    .limit(175)
        
        ## import training samples 
        samples = ee.FeatureCollection(ASSET_SAMPLES + regionId + '_ano_' + str(year) + '_' + SAMPLES_VERSION)
                #.filter(ee.Filter.neq("reference", 33))\
                #.merge(water)
                
        ## remove samples with null values
        samples = samples.filter(ee.Filter.notNull(train.first().propertyNames()))      
        
        ## import sentinel mosais
        mosaics = ee.ImageCollection(ASSET_MOSAICS)\
                .filterMetadata('biome', 'equals', 'CERRADO')\
                .filterMetadata('version', 'equals', '1')
          

       ## select mosaic only for the year i
        mosaicTotal = mosaics\
            .filterMetadata('year', 'equals', int(year))
        
        ## clip for the region 
        mosaicTotal = maskCollections(mosaicTotal, region_ras)\
            .mosaic()
        
        ## include latitude and longitude as auxiliary bands
        ll = ee.Image.pixelLonLat().mask(mosaicTotal.select(1))
        long = ll.select('longitude').add(34.8).multiply(-1).multiply(1000).toInt16()
        lati = ll.select('latitude').add(5).multiply(-1).multiply(1000).toInt16()
        
        ## add bands
        mosaicTotal = mosaicTotal.addBands(long, ['longitude'])\
                                   .addBands(lati, ['latitude'])
        
        ## define mosaic bands to be used in the classification
        mosaicTotal = ee.Image(mosaicTotal)\
            .updateMask(ee.Image(region_ras.first()))\
            .select(BAND_NAMES)
        
        #print(mosaicTotal.bandNames().getInfo())
        mosaicTotal = mosaicTotal
        # samples
        samplesTotal = samples.filter(
            ee.Filter.inList(
                "class",
                [3, 4, 11, 12, 15, 19, 9, 25, 33]
            )
        )

        # train classifier 
        classifier = ee.Classifier.smileRandomForest(numberOfTrees=RF_TREES)\
            .train(samplesTotal, 'class', BAND_NAMES)

        classified = mosaicTotal.classify(classifier).mask(mosaicTotal.select('red_median'))

        classified = classified.rename(['classification_' + str(year)])\
            .toInt8()

        # set properties
        classified = classified\
            .set('collection', 'beta')\
            .set('version', int(OUTPUT_VERSION))\
            .set('biome', BIOME_NAME)\
            .set('mapb', int(regionId))\
            .set('year', int(year))
        
        ## If first year, create image, else, add bands and stack data 
        if (time_marker == 0): 
            stacked_classification = classified
         
        else: 
            stacked_classification = stacked_classification.addBands(classified)            
        
        print ('=======================================')  
        
    print ('exporting stacked classification')
    name = BIOME_NAME + "_reg_" + str(regionId) + '_16a20' + '_v_' + OUTPUT_VERSION
    
    # export to asset
    task = ee.batch.Export.image.toAsset(
        image=stacked_classification.toInt8(),
        description=name,
        assetId= ASSET_OUTPUT + name,
        scale=10,
        pyramidingPolicy={'.default': 'mode'},
        maxPixels=1e13,
        region=region
    )

    task.start()
        
    print ('------------> NEXT REGION --------->')
