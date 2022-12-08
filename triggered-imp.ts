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
            if (sub === '') {
                prepareForSylph(prop);
            }
        })
        Utilities.sleep(2000);
    })
}

function prepareForSylph(prop: string) {
    const Structured : {[key: string]: any}[] = JSON.parse(PropertiesService.getScriptProperties().getProperty(prop) as string);
    const IDsOnly = Structured.map(entry => entry['ID']);
    PropertiesService.getScriptProperties().setProperty(prop.substring(3), JSON.stringify(IDsOnly));
}