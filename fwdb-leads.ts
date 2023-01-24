function FWDBLeads(Get : any) : GoogleAppsScript.Content.TextOutput {
    const DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('LeadsDB');
    const RowN : number = Get.ex? parseInt(Get.ex) + 2 : 0; // The index in NewUniqueIDs obviously lacks header, so +1 is not enough.
    return RowN ? LeadsUpdate(Get, DB!, RowN) : LeadsAppend(Get, DB!);
}

function FWDBContacts(Get: any) : GoogleAppsScript.Content.TextOutput {
    const DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('ContactsDB');
    const Names = DB?.getRange('B:B').getValues();
    const Search = (element: any) => element == decodeURIComponent(Get.name);
    const RowN : number = Names!.findIndex(Search) + 1; // Here we count on the actual column including the header, so +1 is enough.
    return RowN ? ContactsUpdate(Get, DB!, RowN) : ContactsAppend(Get, DB!);
}

function LeadsAppend(Get: any, DB: GoogleAppsScript.Spreadsheet.Sheet) : GoogleAppsScript.Content.TextOutput {
    Get.person = Get.person == "NA" ? '' : Get.person;
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

    if (Get.person) {
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
    const StatusField = DB?.getRange('D'+RowN), Status = StatusField.getValue();
    let Update = 'Row '+(parseInt(Get.ex)+2)+':\n';

    if (Get.date == 'Closed') {
        Update += ' - Job status changed from '+Row[1]+' to X.Closed.\n';
        StatusField.setValue('X.Closed');
    }
    else if (Status.includes('not reach') || Status == '0.New') {
        Update += ' - Job status changed from '+Row[1]+' to 0.Open.\n';
        StatusField.setValue('0.Open');
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
    DB!.appendRow([                                     // // Using fallback values now, usually Get.person
        '', '', Get.personlink.split("in/")[1], '0.New', Get.app, Get.loc, '', Get.compsize, 
        Get.comp.split("company/")[1], (new Date()).toDateString(),'', '', Get.complink
    ]);

    const RowN = DB!.getLastRow(), Row = DB?.getRange(RowN+':'+RowN);
    const Person = DB?.getRange('B'+RowN), Company = DB?.getRange('G'+RowN), Comment = DB?.getRange('K'+RowN);
    
    const PersonLink = SpreadsheetApp.newRichTextValue().setText(Get.name).setLinkUrl(Get.personlink).build();
    Person?.setRichTextValue(PersonLink);
                                                                // Using fallback values now, usually Get.app
    const CompanyLink = SpreadsheetApp.newRichTextValue().setText(Get.person).setLinkUrl(Get.comp).build();
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
    if (!Row[0][10].includes('Enriched')) Row[0][10] += '\n\nEnriched'+buildJobsString(Get.date, Get.more);
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

function ContactsListAppend(List: {[key: string]: string}[]) {
    const DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('ContactsDB');
    const Row1 = DB!.getLastRow() + 1, Rows = List.length, Today = new Date().toLocaleDateString();
    const Status = '0.Imported', Message = 'List imported via Sylph!', URL = 'https://app.apollo.io/';
    const [Pers, Comp, Comm] : GoogleAppsScript.Spreadsheet.RichTextValue[][][] = [[], [], []];

    DB!.insertRowsAfter(Row1, Rows);

    const Data = List.map(row => {
        Pers.push([SpreadsheetApp.newRichTextValue().setText(row.Name).setLinkUrl(row.Name_linkedin || URL).build()]);
        Comp.push([SpreadsheetApp.newRichTextValue().setText(row.Company).setLinkUrl(row.Company_linkedin || URL).build()]);
        Comm.push([SpreadsheetApp.newRichTextValue().setText(Message).setLinkUrl(URL+row.Name_apollo).build()]);
        
        return ['', row.Name, row.Name_linkedin ? row.Name_linkedin.split('/in/')[1] : 'NA', Status, row.Title, row.Location, row.Company, 
                row.Employees, row.Company_linkedin.split('/company/')[1], Today, Message, row.Phone, row.Company_web || URL, row.Email]
    });

    const Persons = DB?.getRange(Row1, 2, Rows, 1), Company = DB?.getRange(Row1, 7, Rows, 1), Comment = DB?.getRange(Row1, 11, Rows, 1);
    const Range = DB?.getRange(Row1, 1, Rows, Data[0].length);

    Range?.setValues(Data);
    Persons?.setRichTextValues(Pers);
    Company?.setRichTextValues(Comp);
    Comment?.setRichTextValues(Comm);

    DB!.getRange(Row1, 1, Rows, 1).insertCheckboxes().check();
    DB!.getRange('2:2').copyTo(Range!, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
}