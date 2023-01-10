function FWDBLeads(Get : any, db : string) {
    const DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName(db === 'Leads' ? 'LeadsDB' : 'ContactsDB');
    const Names = (db === 'Leads') ? null : DB?.getRange('B:B').getValues();
    const Search = (element: any) => element == decodeURIComponent(Get.name);
    const RowN : number = (db === 'Leads') ? (Get.ex? parseInt(Get.ex) + 2 : -1) : Names!.findIndex(Search);

    return (RowN < 0) ? (db === 'Leads' ? LeadsAppend(Get, DB!) : ContactsAppend(Get, DB!))
        : (db === 'Leads' ? LeadsUpdate(Get, DB!, RowN) : ContactsUpdate(Get, DB!, RowN));
}

function LeadsAppend(Get: any, DB: GoogleAppsScript.Spreadsheet.Sheet) : GoogleAppsScript.Content.TextOutput {
    DB!.appendRow([
        '', Get.comp, Get.compsize, '0.New', decodeURIComponent(Get.name), '??', Get.date, '1', '', Get.loc, 
        Get.person,'', '', '', '', '', '', '', 'Added via Sylph Chrome Extension!', Get.app
    ]);
    const RowN = DB?.getLastRow(), Row = DB?.getRange(RowN+':'+RowN);
    const Company = DB?.getRange('B'+RowN), Job = DB?.getRange('E'+RowN), Person = DB?.getRange('K'+RowN);
    const ScoreFormula = DB?.getRange('I2'), Score = DB?.getRange('I'+RowN);

    const CompanyLink = SpreadsheetApp.newRichTextValue().setText(Get.comp).setLinkUrl(decodeURI(Get.complink).replace("/life/", "")).build();
    Company?.setRichTextValue(CompanyLink);
    
    const JobLink = SpreadsheetApp.newRichTextValue().setText(decodeURIComponent(Get.name)).setLinkUrl(Get.url).build();
    Job?.setRichTextValue(JobLink);

    if (Get.person != "NA") {
        const PersonLink = SpreadsheetApp.newRichTextValue().setText(Get.person).setLinkUrl(Get.personlink).build();
        Person?.setRichTextValue(PersonLink);
    }

    Company?.offset(0,-1).insertCheckboxes();
    Row?.offset(-(RowN! -3),0).copyTo(Row, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    ScoreFormula?.copyTo((Score as GoogleAppsScript.Spreadsheet.Range), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);

    addUniqueIDs(Get.complink, Get.url, Get.personlink);    // For now it does the job only, in the new system. See fwdb-uniqueids.ts.

    const JSONString = 'Row '+RowN+': '+JSON.stringify(Row?.getValues());  
    const JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was casted successfully!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}

function LeadsUpdate(Get: any, DB: GoogleAppsScript.Spreadsheet.Sheet, RowN: number) : GoogleAppsScript.Content.TextOutput {
    const Row = DB?.getRange('C'+RowN+':T'+RowN).getValues().flat()!;
    let Update = 'Row '+(parseInt(Get.ex)+2)+':\n';

    if (Get.date == 'Closed') {
        Update += ' - Job status changed from '+Row[1]+' to X.Closed.\n';
        DB?.getRange('D'+RowN).setValue('X.Closed');
    }
    else if (DB?.getRange('D'+RowN).getValue().includes('not reach')) {
        Update += ' - Job status changed from '+Row[1]+' to 0.Open.\n';
        DB?.getRange('D'+RowN).setValue('0.Open');
    }
    if (Row[0] != Get.compsize) {
        if (!Row[0]) Row[0] = 'NA';
        Update += ' - Company size updated from '+Row[0]+' to '+Get.compsize+'.\n';
        DB?.getRange('C'+RowN).setValue(Get.compsize);
    }
    if (Row[17] != Get.app && Get.date != 'Closed') {
        Update += ' - Applicants updated from '+Row[17]+' to '+Get.app+'.\n';
        DB?.getRange('T'+RowN).setValue(Get.app);
    }
    if (!Row[8] && Get.person != "NA") {
        const PersonLink = SpreadsheetApp.newRichTextValue().setText(Get.person).setLinkUrl(Get.personlink).build();
        DB?.getRange('K'+RowN).setRichTextValue(PersonLink);
        Update += ' - Contact person added: '+Get.person+'.\n';
    }
    if (Update.length <= 10) Update += ' - Nothing to update.'

    const JSONOutput = ContentService.createTextOutput("🧜‍♂️ "+Update+"\n🧚‍♀️ Sylph's spell was casted successfully!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}

function buildJobsString(number: string, jobs: string) {
    return ' via Sylph Chrome Extension!\n\n'+number+' engineering jobs posted.\n\n'+jobs.replaceAll(',', '\n').replaceAll('htt', '➡️ htt');
}

function ContactsAppend(Get: any, DB: GoogleAppsScript.Spreadsheet.Sheet) : GoogleAppsScript.Content.TextOutput {
    DB!.appendRow([
        '', '', Get.personlink.split("in/")[1], '0.New', Get.person, Get.loc, '', Get.compsize, 
        Get.comp.split("company/")[1], (new Date()).toDateString(),'', '', Get.complink
    ]);

    const RowN = DB!.getLastRow(), Row = DB?.getRange(RowN+':'+RowN);
    const Person = DB?.getRange('B'+RowN), Company = DB?.getRange('G'+RowN), Comment = DB?.getRange('K'+RowN);
    
    const PersonLink = SpreadsheetApp.newRichTextValue().setText(Get.name).setLinkUrl(Get.personlink).build();
    Person?.setRichTextValue(PersonLink);

    const CompanyLink = SpreadsheetApp.newRichTextValue().setText(Get.app).setLinkUrl(Get.comp).build();
    Company?.setRichTextValue(CompanyLink);

    const CommentLink = SpreadsheetApp.newRichTextValue().setText('Added'+buildJobsString(Get.date, Get.more))
    .setLinkUrl('https://app.apollo.io/?utm_source=cio#'+Get.url.split("apollo")[1]).build();
    Comment?.setRichTextValue(CommentLink);

    Person?.offset(0,-1).insertCheckboxes();
    Row?.offset(-(RowN -3),0).copyTo(Row, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    
    const JSONString = 'Row '+RowN+': '+JSON.stringify(Row?.getValues());  
    const JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph has added a new contact!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}

function ContactsUpdate(Get: any, DB: GoogleAppsScript.Spreadsheet.Sheet, RowN: number) : GoogleAppsScript.Content.TextOutput {
    const Row = DB?.getRange('A'+RowN+':M'+RowN).getValues()!;
    const Person = DB?.getRange('B'+RowN), Company = DB?.getRange('G'+RowN), Comment = DB?.getRange('K'+RowN);

    if (!Row[0][2] || Row[0][2].includes(' ') || Get.person.includes("@")) Row[0][2] = Get.personlink.split("in/")[1];
    if (!Row[0][4]) Row[0][4] = Get.person.includes("@") ? 'IMPORT AGAIN' : Get.person;
    if (!Row[0][5]) Row[0][5] = Get.loc;
    if (!Row[0][7]) Row[0][7] = Get.compsize;
    if (!Row[0][8] || Row[0][8].includes(' ')) Row[0][8] = Get.comp.split("company/")[1];
    Row[0][10] += '\n\nEnriched'+buildJobsString(Get.date, Get.more);
    if (!Row[0][11]) Row[0][11] = parseInt(Get.app.charAt(2)) ? Get.app : 'NA'; // Telephone
    if (!Row[0][12]) Row[0][12] = Get.complink;
    if (!Row[0][13]) Row[0][13] =  Get.person.includes("@") ? Get.person : '';

    DB?.getRange('A'+RowN+':N'+RowN).setValues(Row as any [][]);

    const PersonLink = SpreadsheetApp.newRichTextValue().setText(Row![0][1]).setLinkUrl(Get.personlink).build();
    Person?.setRichTextValue(PersonLink);

    const CompanyLink = SpreadsheetApp.newRichTextValue().setText(Row![0][6]).setLinkUrl(Get.comp).build();
    Company?.setRichTextValue(CompanyLink);

    const CommentLink = SpreadsheetApp.newRichTextValue().setText(Row[0][10])
    .setLinkUrl('https://app.apollo.io/#'+Get.url.split("apollo")[1]).build();
    Comment?.setRichTextValue(CommentLink);

    const JSONString = 'Row '+RowN+': '+JSON.stringify(Row);  
    const JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was casted successfully!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}