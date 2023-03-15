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
    Date: string,
    Comment: string,
    Name_id: string,
    Company_id: string,
    Apollo_link: string
}

function Get(...args : string[]) : {[key: string]: any} {
    const Pack : {[key: string]: any} = {};
    Pack.Today = new Date().toLocaleDateString();
    if (args.includes('ContactsDB')) {
        Pack.Cols = {
            Row: 0, Name: 1, Name_id: 2, Status: 3, Title: 4, Location: 5, Company: 6, Employees: 7, 
            Company_id: 8, Date: 9, Comment: 10, Phone: 11, Company_web: 12, Email: 13
        };
        Pack.Default = {
            Status: '0.Imported', Date: Pack.Today,
            NewMessage: 'Imported via Sylph!', OldMessage: 'Updated via Sylph on '+Pack.Today, URL: 'https://app.apollo.io/',
        };
        Pack.DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName('ContactsDB');
        Pack.Names = Pack.DB.getRange('B:B').getValues().flat();
    }
    Pack.LastRow = Pack.DB ? Pack.DB.getLastRow() : null;
    Pack.NewRow = Pack.LastRow + 1 ?? null;
    Pack.DB ? Pack.RichTextRow = Pack.DB.getRange(2, 2, 1, 10) : null;
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
        const ExRow = get.Names.findIndex((name: string) => name == Contact.Name) + 1;
        const Jobs = Contact.Jobs? buildJobsString(Contact.Jobs, Contact.More).split('!')[1] : '';
        const Entry : DBContact = {
            ...get.Default,
            ...Contact as ApolloContact,
            Row: ExRow,
            Comment: `${ExRow ? '' : get.Default.NewMessage}${Jobs}${ExRow ? get.Default.OldMessage : ''}`,
            Apollo_link: `${Contact.Name_apollo.startsWith('#') ? get.Default.URL : ''}${Contact.Name_apollo}`,
            Name_id: !Contact.Name_linkedin ? '' : Contact.Name_linkedin.split('/in/')[1].replace('/', ''),
            Company_id: !Contact.Company_linkedin ? '' : Contact.Company_linkedin.split('/company/')[1].replace('/', '')
        };
        Entry.Row ? UpdContacts.push(Entry) : NewContacts.push(Entry);
    });

    const writeRow = (DBContact: DBContact) => Object.keys(get.Cols).map((col) => DBContact[col as keyof DBContact] ?? '');

    [NewContacts, UpdContacts].forEach((DataLoad, Upd) => {
        const Data = DataLoad.length
        if (!Data) return;
        const Rows = Upd ? DataLoad.map(Contact => Contact.Row) : [];
        if (Upd) UpdRows.push(...Rows.sort((a, b) => a - b));
        const FirstRow = Upd ? UpdRows[0] : get.NewRow, Quantity = Upd ? (UpdRows[Rows.length - 1] - FirstRow) + 1 : Data;
        const Values = DataLoad.map(contact => writeRow(contact));
        if (!Upd) get.DB.insertRowsAfter(get.NewRow, Data);
        const ValueRange = get.DB.getRange(FirstRow, 1, Quantity, Values[0].length);
        const OldValues : string[][] = Upd ? ValueRange.getValues() : [[]]
        const UpdValues = Upd ? OldValues.map((Cols, RowN) => {
            const Row = Rows.indexOf(FirstRow + RowN);
            if (Row >= 0) return Cols.map((Field, Col) => Col != get.Cols.Comment ? Values[Row][Col] : `${Field}\n${Values[Row][Col]}`);
            else return Cols;
        }) : [[]];

        const Riches = Values.map((Cols, Row) => 
            Cols.slice(1, 7).map((Field, Col) => RichCols.includes(Col) ? SpreadsheetApp.newRichTextValue()
                .setText(Field as string).setLinkUrl(DataLoad[Row][Link[RichCols.indexOf(Col)] as keyof DBContact] as string).build()
                : SpreadsheetApp.newRichTextValue().setText(Field as string).build()
            )
        );
        const RichRange = get.DB.getRange(FirstRow, 2, Quantity, 6);
        const OldRiches : GoogleAppsScript.Spreadsheet.RichTextValue[][] = Upd? RichRange.getRichTextValues() : [[]];
        const UpdRiches = Upd ? OldRiches.map((Cols, RowN) => {
            const Row = Rows.indexOf(FirstRow + RowN)
            if (Row >= 0) return Riches[Row];
            else return Cols;
        }) : [[]];
        
        ValueRange.setValues(Upd ? UpdValues.map(Cols => [true, ...Cols.slice(1)]) : Values.map(Cols => [true, ...Cols.slice(1)]));
        RichRange.setRichTextValues(Upd ? UpdRiches : Riches);
        if (!Upd) get.DB!.getRange(get.NewRow, 1, Quantity, 1).insertCheckboxes().check();
    })

    const [NewRows, Upd] = [NewContacts.length, UpdRows.length];
    const Resp = {Row: get.DB.getLastRow() as number, Added: NewRows, Update: Upd ? true : false, Updated: '', Message: ''};
    Resp.Updated = Upd ? `${UpdRows[0]}` : '';
    const Msg = `Last row ${Resp.Row}: ${JSON.stringify(get.DB.getRange(`${Resp.Row}:${Resp.Row}`).getValues())}`;
    const Update = Upd ? `${UpdRows.length} updated! Row(s): ${UpdRows.toString()}`: (NewRows ? '' : `\nNo updates.`);
    Resp.Message = `${Msg}\n🧜‍♂️ Lancer has added ${NewRows} new contact${NewRows == 1 ? '' : 's'}!\n${Update}`;

    const JSONOutput = ContentService.createTextOutput(JSON.stringify(Resp));
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}