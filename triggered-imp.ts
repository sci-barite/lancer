function imp() {
    tickerUpdate('','⚠️');
    const Props = ['NewUniqueJobs', 'NewUniqueCConts'];
    const SubProps = ['', '.last', '.doubles', '.bad'];
    const [post, textPlain] : any[] = ['post', 'text/plain'];

    dbFy(false, 'LeadsDB');
    dbFy(false, 'ContactsDB');
    
    // Doing 8 posts for each indexing session seems a bit much: might be better to do one per DB.
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

function impFamiliar() {
    const statusSheet = getStatusSheet();
    const props = PropertiesService.getScriptProperties();
    props.setProperty('PreviousTicker', statusSheet.getName())
    ScriptApp.newTrigger('restoreTicker')
        .timeBased()
        .after(60 * 1000)
        .create();
    let time = 60;
    statusSheet.setName('⏰ This message will self-destruct in '+time)
    const timeBomb = () => {
        Utilities.sleep(1000);
        if (!statusSheet.getName().startsWith('⏰')) return;
        time--;
        statusSheet.setName('⏰ This message will self-destruct in '+time)
        timeBomb();
    }
    timeBomb();
}

function restoreTicker() {
    const statusSheet = getStatusSheet();
    const props = PropertiesService.getScriptProperties();
    statusSheet.setName(props.getProperty('PreviousTicker')!);
}

// Since Sylph must only check for doubles and it can infer row from the index, no need to send also Name, Company, and Location for jobs.
function prepareForSylph(prop: string) {
    const Structured : {[key: string]: any}[] = JSON.parse(PropertiesService.getScriptProperties().getProperty(prop) as string);
    const IDsOnly = Structured.map(entry => entry['ID']);
    PropertiesService.getScriptProperties().setProperty(prop.substring(3), JSON.stringify(IDsOnly));
}