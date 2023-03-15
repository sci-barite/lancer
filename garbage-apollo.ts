function ContactsListOld(Contacts: ApolloContact[]) {
    const get = Get('ContactsDB')!;
    if (!get.DB) return;
    const [NewContacts, UpdContacts] : DBContact[][] = [[], []];
    const [Field, Link] = [['Name', 'Company', 'Comment'], ['Name_linkedin', 'Company_linkedin', 'Apollo_link']];

    Contacts.forEach(Contact => {
        const Entry : DBContact = {
            ...Contact as ApolloContact,
            Row: get.Names.findIndex((name: string) => name == Contact.Name) + 1,
            Comment: `${get.Default.NewMessage}${Contact.Jobs? buildJobsString(Contact.Jobs, Contact.More).split('!')[1] : ''}`,
            Apollo_link: `${Contact.Name_apollo.startsWith('#') ? get.Default.URL : ''}${Contact.Name_apollo}`,
            Name_id: !Contact.Name_linkedin.includes('/in/') ? '' : Contact.Name_linkedin.split('/in/')[1].replace('/', ''),
            Company_id: !Contact.Name_linkedin.includes('/company/') ? '' : Contact.Name_linkedin.split('/company/')[1].replace('/', '')
        };
        Entry.Row ? UpdContacts.push(Entry) : NewContacts.push(Entry);
    });

    const writeRow = (DBContact: DBContact) => Object.entries(get.Cols).map((col) => DBContact[col[0] as keyof DBContact] ?? '');

    const NewRows = NewContacts.length, UpdRows = UpdContacts.length;

    if (NewRows) {
        const   Data = NewContacts.map(contact => writeRow(contact)),
                Rows = Data.length,
                Area = get.DB.getRange(get.NewRow, get.Cols['☑️'] + 1, Rows, Data[0].length),
                Name = get.DB.getRange(get.NewRow, get.Cols.Name + 1, Rows, 1),
                Comp = get.DB.getRange(get.NewRow, get.Cols.Company + 1, Rows, 1),
                Comm = get.DB.getRange(get.NewRow, get.Cols.Comment + 1, Rows, 1),
                Ranges = [Name, Comp, Comm];

        get.DB.insertRowsAfter(get.NewRow, Rows);
        Area.setValues(Data);
        Ranges.forEach(Range => Range.setRichTextValues(NewContacts.map((New, i) => {
            SpreadsheetApp.newRichTextValue().setText(New[Field[i] as keyof DBContact]!).setLinkUrl(New[Link[i] as keyof DBContact]!).build();
        })));
        get.DB!.getRange(get.NewRow, get.Cols['☑️'] + 1, Rows, 1).insertCheckboxes().check();
        get.DB!.getRange('2:2').copyTo(Area, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }

    if (UpdRows) {
        UpdContacts.forEach(Contact => {
            const   Row = get.DB.getRange(Contact.Row!, get.Cols.Name, 1, Object.keys(get.Cols).length),
                    Old = Row.getValues(),
                    Name = get.DB.getRange(Contact.Row!, get.Cols.Name + 1, 1, 1),
                    Comp = get.DB.getRange(Contact.Row!, get.Cols.Company + 1, 1, 1),
                    Comm = get.DB.getRange(Contact.Row!, get.Cols.Comment + 1, 1, 1),
                    Ranges = [Name, Comp, Comm];
            Contact.Comment = 
                `${Old[get.Cols.Comment]}\n
                ${Contact.Jobs ? buildJobsString(Contact.Jobs, Contact.More!).split('!')[1] : ''}${get.Default.OldMessage}`;

            Row.setValues(writeRow(Contact));
            Ranges.forEach((Range, i) => {
                const RichText = SpreadsheetApp.newRichTextValue()
                    .setText(Contact[Field[i] as keyof DBContact]!).setLinkUrl(Contact[Link[i] as keyof DBContact]!).build();
                Range.setRichTextValue(RichText);
            });
            get.DB!.getRange(Contact.Row!, get.Cols['☑️'] + 1, 1, 1).check();
        })
    }

    const Resp = {Row: get.DB.getLastRow() as number, Added: NewRows, Update: UpdRows ? true : false, Updated: '', Message: ''};
    Resp.Updated = `${UpdContacts[0].Row}`;
    const Msg = `Last row ${Resp.Row}: ${JSON.stringify(get.DB.getRange(`${Resp.Row}:${Resp.Row}`).getValues())}`;
    Resp.Message = `${Msg}\n🧜‍♂️ Lancer has added ${NewRows} new contact${NewRows == 1 ? '' : 's'}!${Resp.Update}`;

    const JSONOutput = ContentService.createTextOutput(JSON.stringify(Resp));
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    return JSONOutput;
}