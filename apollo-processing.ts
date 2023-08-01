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
    Comment: string,
    Name_id: string,
    Company_id: string,
    Apollo_link: string
};

function Get(...args : string[]) : {[key: string]: any} {
    const Pack : {[key: string]: any} = {};
    Pack.Today = new Date().toLocaleDateString();
    if (args.includes('ContactsDB')) {
        Pack.Cols = {   // Column numbers starting from zero, to be adjusted by 1 when using the getRange method.
            Checkbox: 0, Name: 1, Name_id: 2, Status: 3, Title: 4, Location: 5, Company: 6, Employees: 7, 
            Company_id: 8, Date: 9, Comment: 10, Phone: 11, Company_web: 12, Email: 13
        };
        Pack.Default = {
            Status: '0.Imported', Date: Pack.Today, Checkbox: true,
            NewMessage: 'Imported via Sylph!', OldMessage: 'Updated via Sylph on '+Pack.Today, URL: 'https://app.apollo.io/',
        };
        Pack.DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('ContactsDB');
        Pack.DB2 = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('Export');
        Pack.Names = Pack.DB.getRange('B:B').getValues().flat();
    }
    Pack.LastRow = Pack.DB ? Pack.DB.getLastRow() : null;
    Pack.NewRow = Pack.LastRow + 1 ?? null;
    return Pack;
}

function buildJobsString(number: string, jobs: string) {
    const sanitized = jobs.split(',').map(job => job.includes('?') ? job.split('?')[0] : job).toString().replaceAll(',', '\n');
    return ' via Sylph Chrome Extension!\n\n'+number+' engineering jobs posted.\n'+sanitized.replaceAll('htt', '➡️ htt');
}

function ContactsList(Contacts: ApolloContact[]) {
    const get = Get('ContactsDB')!;
    if (!get.DB) return;
    const [NewContacts, UpdContacts] : DBContact[][] = [[], []];
    const [RichCols, Link] = [[0, 3, 5], ['Name_linkedin', 'Apollo_link', 'Company_linkedin']]
    const UpdRows : number[] = [], RowIndex : number[] = [];

    Contacts.forEach(Contact => {
        const ExRow = get.Names.findIndex((name: string) => name == Contact.Name) + 1;  // Might be better to use uniqueIDs at some point.
        const Jobs = Contact.Jobs? buildJobsString(Contact.Jobs, Contact.More).split('!')[1] : '';  // Maybe Sylph should do this instead.
        const Entry : DBContact = {
            ...get.Default,
            ...Contact,
            Comment: `${ExRow ? '' : get.Default.NewMessage}${Jobs}${ExRow ? '\n'+get.Default.OldMessage : ''}`,
            Name_id: !Contact.Name_linkedin ? '' : Contact.Name_linkedin.split('/in/')[1] ?? Contact.Name_linkedin.split('/company/')[1],
            Company_id: (!Contact.Company_linkedin || Contact.Company_linkedin === 'NA')
                ? (Contact.Name_linkedin.includes('company') ? Contact.Name_linkedin.split('/company/')[1] : '')
                : Contact.Company_linkedin.split('/company/')[1].replace('/', ''),
            Apollo_link: `${Contact.Name_apollo.startsWith('#') ? get.Default.URL : ''}${Contact.Name_apollo}`
        };
        ExRow ? (RowIndex.push(ExRow), UpdContacts.push(Entry)) : NewContacts.push(Entry);
    });
    
    type RowContact = Omit<DBContact, 'Row'>;
    const writeRow = (DBContact: RowContact) => Object.keys(get.Cols).map((col) => DBContact[col as keyof RowContact] ?? '');
    const updateRows = (Incoming: any[][], FirstRow: number, RowIndex: number[], Updated: any[][], Rich?: string) => {
        RowIndex.forEach((Row, Entry) => {
            const Indexed = Row - FirstRow;
            if (!Rich)
                Incoming[Entry][get.Cols.Comment] = `${Updated[Indexed][get.Cols.Comment]}\n${Incoming[Entry][get.Cols.Comment]}`;
            Updated[Indexed] = Incoming[Entry];
        });
        return Updated;
    };

    [NewContacts, UpdContacts].forEach((Contacts, Upd) => {
        // Setup phase. We want to know how much we have in terms of rows. For updates, we want everything from first row to last.
        const DataLength = Contacts.length
        if (!DataLength) return;
        if (Upd) UpdRows.push(...RowIndex.sort((a, b) => a - b));   // Logic and ordered reporting, all rolled into a nice spicy burrito!
        const FirstRow = Upd ? UpdRows[0] : get.NewRow, Rows = Upd ? (UpdRows[UpdRows.length - 1] - FirstRow) + 1 : DataLength;

        // Regular values. Here we just convert the object into raw data that sheet.setValues() can use, and set the range accordingly.
        const Values = Contacts.map(Contact => writeRow(Contact));
        if (!Upd) get.DB.insertRowsAfter(get.NewRow, DataLength);
        const ValueRange = get.DB.getRange(FirstRow, get.Cols.Checkbox + 1, Rows, Values[0].length);
        
        // RichText values. We need them even for non-links in-between links. Link in Comment was moved to Title to have a single range.
        const Riches = Values.map((Cols, Row) => 
            Cols.slice(get.Cols.Name, get.Cols.Company + 1).map((Field, Col) => 
                RichCols.includes(Col) ? SpreadsheetApp.newRichTextValue()
                    .setText(Field).setLinkUrl(Contacts[Row][Link[RichCols.indexOf(Col)] as keyof DBContact]!).build()
                    : SpreadsheetApp.newRichTextValue().setText(Field).build()
            )
        );
        const RichRange = get.DB.getRange(FirstRow, get.Cols.Name + 1, Rows, get.Cols.Company)
        const [OldValues, OldRiches] = Upd ? [ValueRange.getValues(), RichRange.getRichTextValues()] : [[], []];
        // ⚠️ Extremely important to record the OldRiches and pass it to the updateRows function. Otherwise it will delete all links.
        ValueRange.setValues(Upd ? updateRows(Values, FirstRow, RowIndex, OldValues) : Values);
        RichRange.setRichTextValues(Upd ? updateRows(Riches, FirstRow, RowIndex, OldRiches, 'Rich') : Riches);
        if (!Upd) get.DB!.getRange(get.NewRow, get.Cols.Checkbox + 1, Rows, get.Cols.Checkbox + 1).insertCheckboxes().check();
    });

    const [NewRows, Upd] = [NewContacts.length, UpdRows.length];
    const Resp = {Row: get.DB.getLastRow() as number, Added: NewRows, Update: Upd ? true : false, Updated: '', Message: ''};
    Resp.Updated = Upd ? `${UpdRows[0]}` : '';
    const Msg = `Last row ${Resp.Row}: ${JSON.stringify(get.DB.getRange(`${Resp.Row}:${Resp.Row}`).getValues())}`;
    const Update = Upd ? `${Upd} updated! Row(s): ${UpdRows.toString()}`: (NewRows ? '' : `\nNo updates.`);
    Resp.Message = `${Msg}\n🧜‍♂️ Lancer has added ${NewRows} new contact(s)!\n${Update}`;

    const JSONOutput = ContentService.createTextOutput(JSON.stringify(Resp));
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}