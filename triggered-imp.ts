function imp() {
    tickerUpdate('','⚠️');
    dbFy(false, 'LeadsDB');
    UrlFetchApp.fetch(getFWDBPost(), 
        {method: 'post', contentType: 'text/plain', payload: 'NewUniqueJobs:'+PropertiesService.getScriptProperties().getProperty('NewUniqueJobs')});
}