type ApolloContact = {
    Name: string, 
    Name_linkedin: string, 
    Name_apollo: string, 
    Title: string, 
    Location: string, 
    Company: string, 
    Employees: string, 
    Company_linkedin: string, 
    Company_web: string, 
    More: string, 
    Phone: string, 
    Email: string, 
    Jobs: string
  };

type DBContact = Partial<ApolloContact> & {
    Row?: number,
    Status?: string,
    Name_link?: GoogleAppsScript.Spreadsheet.RichTextValue,
    Name_id?: string,
    Company_link?: GoogleAppsScript.Spreadsheet.RichTextValue,
    Company_id?: string,
    Comment?: string,
    Comment_link?: GoogleAppsScript.Spreadsheet.RichTextValue,
    Date?: string,
}

function buildJobsString(number: string, jobs: string) {
    const sanitized = jobs.split(',').map(job => job.includes('?') ? job.split('?')[0] : job).toString().replaceAll(',', '\n');
    return ' via Sylph Chrome Extension!\n\n'+number+' engineering jobs posted.\n'+sanitized.replaceAll('htt', '➡️ htt');
}
  
function ContactsList(Contacts: ApolloContact[]) {
    const   DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('ContactsDB')!, 
            Names = DB.getRange('B:B').getValues().flat(),
            LastRow = DB.getLastRow(), NewRow = LastRow + 1,
            Today = new Date().toLocaleDateString(),
            Default = {    
                Status: '0.Imported', 
                NewMessage: 'Imported via Sylph!',
                OldMessage: 'Updated via Sylph on '+Today,
                URL: 'https://app.apollo.io/',
                NA: 'N/A'
            },
            Cols = {
                '☑️': 0, Name: 1, Name_id: 2, Status: 3, Title: 4, Location: 5,
                Company: 6, Employees: 7, Company_id: 8, Date: 9, Comment: 10,
                Phone: 11, Company_web: 12, Email: 13
            },
            NewContacts : DBContact[] = [],
            UpdContacts : DBContact[] = [];

    Contacts.forEach(Contact => {
        const   Processed : DBContact = {...Contact},
                Row = Names!.findIndex((name: string) => name == Contact.Name) + 1,
                OldVal = Row ? DB.getRange(`${Row}:${Row}`).getValues().flat() : [],
                Jobs = Contact.Jobs? buildJobsString(Contact.Jobs, Contact.More).split('!')[1] : '',
                ApolloLink = `${Contact.Name_apollo.startsWith('#') ? Default.URL : ''}${Contact.Name_apollo}`

        Processed.Row = Row;
        Processed.Status = Default.Status;
        Processed.Date = Today;
        Processed.Name_link = SpreadsheetApp.newRichTextValue()
            .setText(Contact.Name).setLinkUrl(Contact.Name_linkedin ?? ApolloLink).build();
        Processed.Company_link = SpreadsheetApp.newRichTextValue()
            .setText(Contact.Company).setLinkUrl(Contact.Company_linkedin ?? ApolloLink).build();
        Processed.Comment = Row ? `${OldVal[Cols.Comment]}\n\n${Jobs}${Default.OldMessage}` : `${Default.NewMessage}${Jobs}`;
        Processed.Comment_link = SpreadsheetApp.newRichTextValue()
            .setText(Processed.Comment).setLinkUrl(ApolloLink).build();
        Processed.Name_id = !Contact.Name_linkedin ? Default.NA :
            Contact.Name_linkedin.split('/in/')[1];
        Processed.Company_id = !Contact.Company_linkedin ? Default.NA :
            Contact.Company_linkedin.split('/company/')[1];
        
        Row ? UpdContacts.push(Processed) : NewContacts.push(Processed);
    });

    const writeRow = (DBContact: DBContact) => Object.entries(Cols).map((col) => DBContact[col[0] as keyof DBContact] ?? '');

    const NewRows = NewContacts.length, UpdRows = UpdContacts.length;

    if (NewRows) {
        const   Data = NewContacts.map(contact => writeRow(contact)),
                Rows = Data.length,
                Area = DB.getRange(NewRow, Cols.Name, Rows, Data[0].length),
                Name = DB.getRange(NewRow, Cols.Name + 1, Rows, 1),
                Comp = DB.getRange(NewRow, Cols.Company + 1, Rows, 1),
                Comm = DB.getRange(NewRow, Cols.Comment + 1, Rows, 1),
                [Ranges, Rich] = [[Name, Comp, Comm], ['Name_link', 'Company_link', 'Comment_link']];

        DB!.insertRowsAfter(NewRow, Rows);
        Area.setValues(Data);
        Ranges.forEach(Range => Range.setRichTextValues(NewContacts.map((cont, i) => {
            return [cont[Rich[i] as keyof DBContact] as GoogleAppsScript.Spreadsheet.RichTextValue];
        })));
        DB!.getRange(NewRow, Cols['☑️'] + 1, Rows, 1).insertCheckboxes().check();
        DB!.getRange('2:2').copyTo(Area, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }

    if (UpdRows) {
        UpdContacts.forEach(contact => {
            const   Data = [writeRow(contact)],
                    Row = DB.getRange(contact.Row!, Cols.Name, 1, Data[0].length),
                    Name = DB.getRange(contact.Row!, Cols.Name + 1, 1, 1),
                    Comp = DB.getRange(contact.Row!, Cols.Company + 1, 1, 1),
                    Comm = DB.getRange(contact.Row!, Cols.Comment + 1, 1, 1),
                    [Ranges, Rich] = [[Name, Comp, Comm], ['Name_link', 'Company_link', 'Comment_link']];
            
            Row.setValues(Data);
            Ranges.forEach((Range, i) => {
                Range.setRichTextValue(contact[Rich[i] as keyof DBContact] as GoogleAppsScript.Spreadsheet.RichTextValue);
            });
            DB!.getRange(contact.Row!, Cols['☑️'] + 1, 1, 1).check();
        })
    }

    const   Row = DB.getLastRow(), 
            Msg = `Last row ${Row}: ${JSON.stringify(DB.getRange(`${Row}:${Row}`).getValues())}`,
            Update = UpdRows ? `\n${UpdRows} updated! Row ${UpdContacts[0].Row+(UpdRows > 1 ? '+' : '')}`
             : (NewRows ? '' : `\nNo updates.`);
    
    const Response = {
        Row: Row,
        Added: NewRows,
        Update: UpdRows ? true : false, 
        Updated: `${UpdContacts[0].Row}`,
        Message: `${Msg}\n🧜‍♂️ Lancer has added ${NewRows} new contact${NewRows == 1 ? '' : 's'}!${Update}`
    };

    const JSONOutput = ContentService.createTextOutput(JSON.stringify(Response));
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}