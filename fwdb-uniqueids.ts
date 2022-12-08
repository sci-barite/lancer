function addUniqueIDs(Comp : string, Job : string, Cont : string) {
    var UniqueIDsDB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName("UniqueIDsDB");
    
    let uniqueCompID = (Comp.split('company/')[1].replace("/life/", "") as string);
    let uniqueJobID = (Job.split('view/')[1].replace('/', '') as string);
    let uniqueContID = '';
    if (Cont) uniqueContID = (Cont.split('in/')[1] as string);

    UniqueIDsDB?.appendRow([uniqueCompID, uniqueJobID, uniqueContID]);

    let UniqueJobs = PropertiesService.getScriptProperties().getProperty("UniqueJobs")
    UniqueJobs = UniqueJobs+","+uniqueJobID;
    PropertiesService.getScriptProperties().setProperty("UniqueJobs", UniqueJobs);
}

// I wonder if it can be simplified a bit... Or broken down into two separate functions, for different cases.
function createUniqueID(arg : GoogleAppsScript.Spreadsheet.RichTextValue | string) : string {
    let url : string | null = '';
    let [uniqueID, text] = ['', ''];    // The caller will know not to record an empty uniqueID, will skip.

    if (typeof arg == "string") { 
        if (arg.includes("http")) url = arg;
        else if (!arg.includes(' ') && (arg != 'Company' && arg != 'Contact')) 
            return arg; // This supposes we are feeding it a uniqueID, like in ContactsDB, where we have columns with uniqueIDs.
        else return '';
    }
    else [url, text] = [arg!.getLinkUrl(), arg!.getText()]; // Can only be RichTextValue then.

    if (url == null || url == '') return '';    // Probably a bad link, or no link for some reason.
    if (text.includes('@') && text.includes('.')) return text.trim(); // Email address, with reasonable certainty.

    if (url.includes("linkedin.com/in")) {
        uniqueID = url.split('in/')[1].replace('/','');
        if (uniqueID.includes('?')) uniqueID = uniqueID.split('?')[0];
    }
    else if (url.includes("linkedin.com/jobs") || url.includes("linkedin.com/comm/jobs"))
        uniqueID = (url.split('view/')[1].replace('/', '') as string);
    else if (url.includes("linkedin.com/company")) {
        uniqueID = url.includes('?') ? url.split('company/')[1].split('?')[0] : url.split('company/')[1];
        if (uniqueID.includes('/')) uniqueID = uniqueID.replace('/life','').replace('/','');
    }
    else if (url.includes("apollo")) uniqueID = url.split('/people/')[1];

    return uniqueID;
}

// Not used yet, but I guess it's useful.
function parseUniqueID(id : {[key: string]: string}) : string {   
    let parsedID = '';
    if (id['ID'].includes('@')) return id['ID'];    // Emails are used as they are

    // This is just to enable the following Switch statement...
    let location = id['Location'].includes('Contacts') ? id['Location'].substring(3) : id['Location'];

    switch (location.substring(0,9)) {
        case 'LeadsDB!B': case 'tactsDB!G':
            parsedID = 'https://www.linkedin.com/company/'+id['ID']; break;   // Company
        case 'tactsDB!B': case 'LeadsDB!K': case 'LeadsDB!M': case 'LeadsDB!O': case 'LeadsDB!Q':
            parsedID = 'https://www.linkedin.com/in/'+id['ID']; break;        // Contact
        case 'LeadsDB!E':
            parsedID = 'https://www.linkedin.com/jobs/view/'+id['ID']; break; // Job
    }
    return parsedID;
}

function sift(  sheet : GoogleAppsScript.Spreadsheet.Sheet, 
                col1 : string, col2 : string, lastRow : number, lastKnown : number, uIDsArray : {[key: string]: any}[]) {
    const Cols = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    const results : {[key: string]: {[key: string]: string}[]} = { Bad: [], Unique: [], Double: [] }
    const sheetName = sheet.getName()+'!';
    //if (lastKnown > lastRow) SpreadsheetApp.getActiveSpreadsheet().toast('Last known > last row: index should be rebuilt', '⚠️ WARNING!');
    const range = sheet?.getRange(col1+lastKnown+':'+col2+lastRow);
    const [colL, colR] : number[] = [Cols.indexOf(col1), Cols.indexOf(col2)];
    const values = (sheetName == 'ContactsDB!') ? range.getValues() : range.getRichTextValues();
    const names = (sheetName == 'ContactsDB!') ? ((col1 == 'C') ? range.offset(0,-1).getValues() : range.offset(0,-2).getValues()) : []; 
    const comps = (sheetName == 'ContactsDB!') ? range.offset(0,4).getValues() : sheet?.getRange('B:B').getValues();

    for(let col = (colR - colL + 1); col > 0; col--) {  // We want the right columns first, hence the reverse loop.
        for (let row = 0; row <= (lastRow - lastKnown); row++) {
            const name = (sheetName == 'ContactsDB!') ? names![row][col-1] : values[row][col-1]?.getText();
            const uniqueID = (sheetName == 'ContactsDB!') ? values[row][col-1] : createUniqueID(values[row][col-1]);
            if (uniqueID == '' || uniqueID.includes(' ')) continue;   // Saves us time, I wish I thought about it before...
            else if (uniqueID == 'undefined')
                results['Bad'].push({'Name': name, 'ID': uniqueID, 'Location': sheetName+Cols[colL+(col -1)]+(lastKnown + row)});
            else if (uIDsArray.findIndex(object => {return object['ID'] === uniqueID; }) == -1) {
                if (results['Unique'].findIndex(object  => {return object['ID'] === uniqueID; }) == -1) {
                    (col1 == 'C' || col1 == 'E' || col1 == 'K') ?   // Just to avoid another if/else...
                        results['Unique'].push({'Name': name, 'ID': uniqueID, 'Company': comps[row][0],
                            'Location': sheetName+Cols[colL+(col -1)]+(lastKnown + row)}) :
                        results['Unique'].push({'Name': name, 'ID': uniqueID, 
                            'Location': sheetName+Cols[colL+(col -1)]+(lastKnown + row)});
                }
                else
                    results['Double'].push({ 'Name': name, 'ID': uniqueID, 'Location': sheetName+Cols[colL+(col -1)]+(lastKnown +row)});
            }
            else results['Double'].push({'Name': name, 'ID': uniqueID, 'Location': sheetName+Cols[colL+(col -1)]+(lastKnown + row)});
        }
    }
    return results;
}

// This is a slimmed-down version of updateIndexes, called when we want to rebuild during off hours.
function rebuildIndexes(sheet: GoogleAppsScript.Spreadsheet.Sheet, col1: string, col2: string, property : string) {
    const [lastRow, props] = [sheet.getLastRow(), PropertiesService.getScriptProperties()];

    const Results = sift(sheet, col1, col2, lastRow, 1, []);

    props.setProperty(property, JSON.stringify(Results['Unique']));
    props.setProperty(property+'.doubles', JSON.stringify(Results['Double']));
    props.setProperty(property+'.bad', JSON.stringify(Results['Bad']));
    props.setProperty(property+'.last', new Date().toDateString().substring(3)+' @ '+new Date().toLocaleTimeString());
}

function tickerUpdate(verbose? : string, warn? : string) {
    const statusSheet = getStatusSheet();
    if (warn) {
        statusSheet.setName("⚠️ Imp is Indexing!").setTabColor("red");
        return;
    }
    const [Jobs, JobsDoubles, Conts, ContsDoubles] = ['NewUniqueJobs', 'NewUniqueJobs.doubles', 'NewUniqueCConts', 'NewUniqueCConts.doubles'];
    const props = PropertiesService.getScriptProperties();
    const lDoubles = props.getProperty(JobsDoubles) ? JSON.parse(props.getProperty(JobsDoubles) as string) : [];
    const cDoubles = props.getProperty(ContsDoubles) ? JSON.parse(props.getProperty(ContsDoubles) as string) : [];
    const doubles = (props.getProperty(JobsDoubles) ? lDoubles.length : 0) + (props.getProperty(ContsDoubles) ? cDoubles.length : 0);
    const timeStamp = (props.getProperty(Jobs+'.last') as string).replace(' 2022', '').slice(0,-6);
  
    if (doubles == 0 && verbose) {
        const [badJobs, badConts] = [props.getProperty(Jobs+'.bad'), props.getProperty(Conts+'.bad')];
        statusSheet.setName("No doubles! - Lancer check: "+timeStamp).setTabColor("green").clear()
          .appendRow(['Unique jobs:', JSON.parse(props.getProperty(Jobs) as string).length])
          .appendRow(['Unique contacts:', JSON.parse(props.getProperty(Conts) as string).length])
          .appendRow(['Bad jobs: ', (badJobs?.replaceAll('},', '},\n') || 0)])
          .appendRow(['Bad contacts: ', (badConts?.replaceAll('},', '},\n') || 0)])
          .appendRow(["This check was done by Lancer's Imp!", '']);
    }
    else if (doubles == 0) statusSheet.setName("No doubles!").setTabColor("green").clear();
    else {
      const ticker = verbose ? "DOUBLES: "+doubles+" - Lancer check: "+timeStamp : "DOUBLES: "+doubles;
      statusSheet.setName(ticker).setTabColor("red").clear()
       .appendRow([timeStamp+' — LeadsDB:', JSON.stringify(lDoubles).replaceAll('},', '},\n')])
       .appendRow([timeStamp+' — ContactsDB:', JSON.stringify(cDoubles).replaceAll('},', '},\n')])
       .appendRow(["This check was done by Lancer's Imp!", '']);
    }
}

function dbFy(update : boolean = false, sheetName? : string) {
    const [Props, Cols] = [['Jobs', 'Comps', 'Conts', 'CConts', 'CComps'], ['EE', 'BB', 'KQ', 'CC', 'II']];
    const SS = SpreadsheetApp.openById(getFWDBLeads());
    const Sheet = SS.getSheetByName(sheetName as string)!;
    const SheetName = Sheet.getName();
    // With properties starting with the sheet name, we could dynamically retrieve them. But that means iterating through unneeded ones.
    if (SheetName == 'LeadsDB') rebuildIndexes(Sheet, Cols[0].charAt(0), Cols[0].charAt(1), 'NewUnique'+Props[0]);
    else if (SheetName == 'ContactsDB') rebuildIndexes(Sheet, Cols[3].charAt(0), Cols[3].charAt(1), 'NewUnique'+Props[3]);

    tickerUpdate('verbose');
}