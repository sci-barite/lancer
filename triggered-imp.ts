function imp() {
    tickerUpdate('','⚠️');
    dbFy(false, 'LeadsDB');
    UrlFetchApp.fetch(getFWDBPost(), 
        {method: 'post', contentType: 'text/plain', payload: 'NewUniqueJobs:'+PropertiesService.getScriptProperties().getProperty('NewUniqueJobs')});
    Utilities.sleep(2000);
    UrlFetchApp.fetch(getFWDBPost(), 
        {method: 'post', contentType: 'text/plain', payload: 'NewUniqueJobs.last:'+PropertiesService.getScriptProperties().getProperty('NewUniqueJobs.last')});
    Utilities.sleep(2000);
    UrlFetchApp.fetch(getFWDBPost(), 
        {method: 'post', contentType: 'text/plain', payload: 'NewUniqueJobs.doubles:'+PropertiesService.getScriptProperties().getProperty('NewUniqueJobs.doubles')});
}