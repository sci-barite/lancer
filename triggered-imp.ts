function imp() {
    tickerUpdate('','⚠️');
    const Props = ['NewUniqueJobs', 'NewUniqueCConts'];
    const SubProps = ['', '.last', '.doubles', '.bad'];
    const [post, textPlain] : any[] = ['post', 'text/plain'];

    dbFy(false, 'LeadsDB');
    dbFy(false, 'ContactsDB');
    
    Props.forEach(prop => {
        SubProps.forEach(sub => {
            UrlFetchApp.fetch(getFWDBPost(), 
                {method: post, contentType: textPlain, payload: prop+sub+':'+PropertiesService.getScriptProperties().getProperty(prop+sub)});
        })
        Utilities.sleep(2000);
    })
}