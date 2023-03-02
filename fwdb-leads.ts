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
    if (Get.person != "NA") {
        const PersonLink = SpreadsheetApp.newRichTextValue().setText(Get.person).setLinkUrl(Get.personlink).build();
        DB?.getRange('K'+RowN).setRichTextValue(PersonLink);
        Update += ' - Contact person updated: '+Get.person+'.\n';
    }
    if (Update.length <= 10) Update += ' - Nothing to update.'

    const JSONOutput = ContentService.createTextOutput("🧜‍♂️ "+Update+"\n🧚‍♀️ Sylph's spell was casted successfully!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}

function buildJobsString(number: string, jobs: string) {
    const sanitized = jobs.split(',').map(job => job.includes('?') ? job.split('?')[0] : job).toString().replaceAll(',', '\n');
    return ' via Sylph Chrome Extension!\n\n'+number+' engineering jobs posted.\n\n'+sanitized.replaceAll('htt', '➡️ htt');
}

function ContactsAppend(Get: any, DB: GoogleAppsScript.Spreadsheet.Sheet) : GoogleAppsScript.Content.TextOutput {
    const JSONOutput = ContentService.createTextOutput("This method has been deprecated!\n🧚‍♀️ - 🧜‍♂️ Sylph or Lancer made some weird mistake!");  
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}

function ContactsUpdate(Get: any, DB: GoogleAppsScript.Spreadsheet.Sheet, RowN: number) : GoogleAppsScript.Content.TextOutput {
    const JSONOutput = ContentService.createTextOutput("This method has been deprecated!\n🧚‍♀️ - 🧜‍♂️ Sylph or Lancer made some weird mistake!"); 
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}

function ContactsListAppend(List: {[key: string]: string}[]) {
    const DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('ContactsDB'), Names = DB?.getRange('B:B').getValues();
    const Row0 = DB!.getLastRow(), Row1 = Row0 + 1, Today = new Date().toLocaleDateString(), Updated : string[] = [];
    const Status = '0.Imported', Message = 'Contact/list imported via Sylph!', URL = 'https://app.apollo.io/';
    const [Pers, Comp, Comm] : GoogleAppsScript.Spreadsheet.RichTextValue[][][] = [[], [], []];

    const Data = List.filter(row => Names!.findIndex((name: any) => name == row.Name) < 0).map(row => {
        const ApolloLink = row.Name_apollo.startsWith('#') ? URL+row.Name_apollo : row.Name_apollo;
        const Comment = Message + (row.Jobs? buildJobsString(row.Jobs, row.More).split('!')[1] : '');
        Pers.push([SpreadsheetApp.newRichTextValue().setText(row.Name).setLinkUrl(row.Name_linkedin || URL).build()]);
        Comp.push([SpreadsheetApp.newRichTextValue().setText(row.Company).setLinkUrl(row.Company_linkedin || URL).build()]);
        Comm.push([SpreadsheetApp.newRichTextValue().setText(Comment).setLinkUrl(ApolloLink).build()]);
        return ['', row.Name, row.Name_linkedin ? row.Name_linkedin.split('/in/')[1] : 'NA', Status, row.Title, row.Location, row.Company, 
                row.Employees, row.Company_linkedin.split('/company/')[1], Today, Comment, row.Phone, row.Company_web || URL, row.Email]
    });

    List.length == Data.length ? null : List.forEach(row => {
        const RowN = Names!.findIndex((element: any) => element == row.Name) + 1;
        if (!RowN) return;
        const PhoneToEmail = [row.Phone, row.Company_web || URL, row.Email], RowLtoN = DB!.getRange(`L${RowN}:N${RowN}`), UpdatedCells = [];
        const JobsComment = row.Jobs? buildJobsString(row.Jobs, row.More).split('!')[1] : '', ExPhoneToEmail = RowLtoN.getValues().flat();
        const CommentCell = DB!.getRange('K'+RowN), OldComment = CommentCell.getRichTextValue(), OldCommentText = OldComment?.getText();
        const ContactCell = DB!.getRange('B'+RowN), OldContact = ContactCell.getRichTextValue();
        const CompanyCell = DB!.getRange('G'+RowN), OldCompany = CompanyCell.getRichTextValue();
        if ((JobsComment && !OldCommentText?.includes(JobsComment)) || !OldComment?.getLinkUrl()?.includes(row.Name_apollo)) {
            const Link = SpreadsheetApp.newRichTextValue().setText(`${OldCommentText}\n\nUpdated${JobsComment || ' via Sylph on '+Today}`);
            CommentCell.setRichTextValue(Link.setLinkUrl(row.Name_apollo.includes('http') ? row.Name_apollo : URL+row.Name_apollo).build());
            UpdatedCells.push('Comment');
        }
        if (OldContact?.getLinkUrl() != row.Name_linkedin) {
            ContactCell.setRichTextValue(OldContact!.copy().setLinkUrl(row.Name_linkedin).build());
            DB!.getRange('C'+RowN).setValue(row.Name_linkedin.split('/in/')[1]);
            UpdatedCells.push('Contact link/id');
        };
        if (OldCompany?.getLinkUrl() != row.Company_linkedin) {
            CompanyCell.setRichTextValue(OldCompany!.copy().setLinkUrl(row.Company_linkedin).build());
            DB!.getRange('I'+RowN).setValue(row.Company_linkedin.split('/company/')[1]);
            UpdatedCells.push('Company link/id');
        };
        if (PhoneToEmail.some(val => !ExPhoneToEmail.includes(val))) {
            RowLtoN.setValues([PhoneToEmail]);
            ExPhoneToEmail.forEach((val, col) => { if (!PhoneToEmail.includes(val)) UpdatedCells.push(['Phone', 'Website', 'Email'][col])});
        }
        if (UpdatedCells.length > 0) Updated.push(`${RowN} (${UpdatedCells.join(', ')})`);
        DB!.getRange('H'+RowN).setValue(row.Employees);
    });

    const [Rows, Range] = Data?.length ? [Data.length, DB?.getRange(Row1, 1, Data.length, Data[0].length)] : [0, DB?.getRange(Row0+':'+Row0)];
    
    if (Rows) {
        const Persons = DB?.getRange(Row1, 2, Rows, 1), Company = DB?.getRange(Row1, 7, Rows, 1), Comment = DB?.getRange(Row1, 11, Rows, 1);
        DB!.insertRowsAfter(Row1, Rows);
        Range?.setValues(Data);
        Persons?.setRichTextValues(Pers);
        Company?.setRichTextValues(Comp);
        Comment?.setRichTextValues(Comm);

        DB!.getRange(Row1, 1, Rows, 1).insertCheckboxes().check();
        DB!.getRange('2:2').copyTo(Range!, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }
    if (Updated.length) Updated.map(row => parseInt(row.split(' (')[0])).forEach(rowN => DB!.getRange(rowN, 1).check());

    const Row = DB!.getLastRow(), Last = Range!.getNumRows() - 1, Msg = `Last row ${Row}: ${JSON.stringify(Range?.getValues()[Last])}`;
    const Many = Updated.length, Update = Many ? `\n${Many} updated! Row ${Updated[0]+(Many > 1 ? '+' : '')}`: (Rows ? '' : `\nNo updates.`);
    const Response = {  Row: Row,
                        Added: Rows,
                        Update: Many ? true : false, 
                        Updated: Updated[0], 
                        Message: `${Msg}\n🧜‍♂️ Lancer has added ${Rows} new contact${Rows == 1 ? '' : 's'}!${Update}`};
    const JSONOutput = ContentService.createTextOutput(JSON.stringify(Response));
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}