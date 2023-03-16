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
    Row: number,
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
    const UpdRows : number[] = [];

    Contacts.forEach(Contact => {
        const ExRow = get.Names.findIndex((name: string) => name == Contact.Name) + 1;  // Might be better to use uniqueIDs at some point.
        const Jobs = Contact.Jobs? buildJobsString(Contact.Jobs, Contact.More).split('!')[1] : '';  // Maybe Sylph should do this instead.
        const Entry : DBContact = {
            ...get.Default,
            ...Contact as ApolloContact,
            Row: ExRow,
            Comment: `${ExRow ? '' : get.Default.NewMessage}${Jobs}${ExRow ? '\n'+get.Default.OldMessage : ''}`,
            Name_id: !Contact.Name_linkedin ? '' : Contact.Name_linkedin.split('/in/')[1].replace('/', ''),
            Company_id: !Contact.Company_linkedin ? '' : Contact.Company_linkedin.split('/company/')[1].replace('/', ''),
            Apollo_link: `${Contact.Name_apollo.startsWith('#') ? get.Default.URL : ''}${Contact.Name_apollo}`
        };
        Entry.Row ? UpdContacts.push(Entry) : NewContacts.push(Entry);
    });
    
    type RowContact = Omit<DBContact, 'Row'>;
    const writeRow = (DBContact: RowContact) => Object.keys(get.Cols).map((col) => DBContact[col as keyof RowContact] ?? '');
    const updateRows = (Values: any[][], Range: GoogleAppsScript.Spreadsheet.Range, Index: number[], FirstRow: number, Rich?: string) =>
        (Rich ? Range.getRichTextValues() : Range.getValues()).map((Cols, RowN) => {
            const Row = Index.indexOf(FirstRow + RowN);
            if (Row === -1) return Cols;
            if (!Rich) Values[Row][get.Cols.Comment] = `${Cols[get.Cols.Comment]}\n${Values[Row][get.Cols.Comment]}`;  // Fastest way, I think.
            return Values[Row];
        });

    [NewContacts, UpdContacts].forEach((Contacts, Upd) => {
        // Setup phase. We want to know how much we have in terms of rows. For updates, we want everything from first row to last.
        const DataLength = Contacts.length
        if (!DataLength) return;
        const RowIndex = Upd ? Contacts.map(Contact => Contact.Row) : [];
        if (Upd) UpdRows.push(...RowIndex.sort((a, b) => a - b));   // To get the smallest value, and report nicely to Sylph.
        const FirstRow = Upd ? UpdRows[0] : get.NewRow, Rows = Upd ? (UpdRows[UpdRows.length - 1] - FirstRow) + 1 : DataLength;

        // Regular values. Here the main difficulty is updating: rows are found via indexOf on Rows, which has the same order as the source.
        const Values = Contacts.map(Contact => writeRow(Contact)), Columns = Values[0].length;
        if (!Upd) get.DB.insertRowsAfter(get.NewRow, DataLength);                               // So we never miss with getRange, below.
        const ValueRange = get.DB.getRange(FirstRow, get.Cols.Checkbox + 1, Rows, Columns);     // Avoiding magic numbers as much as possible.
        
        // RichText values. We build them all first, then pick if updating. Link in Comment was moved to Title to reduce to a single range.
        const Riches = Values.map((Cols, Row) => 
            Cols.slice(get.Cols.Name, get.Cols.Company + 1).map((Field, Col) => 
                RichCols.includes(Col) ? SpreadsheetApp.newRichTextValue()
                    .setText(Field as string).setLinkUrl(Contacts[Row][Link[RichCols.indexOf(Col)] as keyof DBContact] as string).build()
                    : SpreadsheetApp.newRichTextValue().setText(Field as string).build()
            )
        );
        const RichRange = get.DB.getRange(FirstRow, get.Cols.Name + 1, Rows, get.Cols.Company);
        
        ValueRange.setValues(Upd ? updateRows(Values, ValueRange, RowIndex, FirstRow) : Values);
        RichRange.setRichTextValues(Upd ? updateRows(Riches, RichRange, RowIndex, FirstRow, 'Rich') : Riches);
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