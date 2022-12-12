function buildJobsString(number: string, jobs: string) {
    return ' via Sylph Chrome Extension!\n\n'+number+' engineering jobs posted.\n\n'+jobs.replaceAll(',', '\n').replaceAll('htt', '➡️ htt');
}

function FWDBLeads(Get : any, db : string) {
    if (db == "Contacts") {
        const DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName("ContactsDB");
        const Names = DB?.getRange('B:B').getValues();

        const Search = (element: any) => element == decodeURIComponent(Get.name);
        let RowN = Names?.findIndex(Search);

        if (RowN == -1) {
            DB!.appendRow([
                '', '', Get.personlink.split("in/")[1], '0.New', Get.person, Get.loc, '', Get.compsize, 
                Get.comp.split("company/")[1], (new Date()).toDateString(),'', '', Get.complink
                ]);

            RowN = DB!.getLastRow();
            const Row = DB?.getRange(RowN+':'+RowN);
            const Person = DB?.getRange('B'+RowN);
            let Company = DB?.getRange('G'+RowN);
            let Comment = DB?.getRange('K'+RowN);
            
            let PersonLink = SpreadsheetApp.newRichTextValue()
            .setText(Get.name)
            .setLinkUrl(Get.personlink)
            .build();
            Person?.setRichTextValue(PersonLink);
            Person?.offset(0,-1).insertCheckboxes();

            let CompanyLink = SpreadsheetApp.newRichTextValue()
            .setText(Get.app)
            .setLinkUrl(Get.comp)
            .build();
            Company?.setRichTextValue(CompanyLink);

            let CommentLink = SpreadsheetApp.newRichTextValue()
            .setText('Added'+buildJobsString(Get.date, Get.more))
            .setLinkUrl('https://app.apollo.io/?utm_source=cio#'+Get.url.split("apollo")[1])
            .build();
            Comment?.setRichTextValue(CommentLink);

            Row?.offset(-(RowN -3),0).copyTo(Row, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
            
            let JSONString = 'Row '+RowN+': '+JSON.stringify(Row?.getValues());  
            let JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph has added a new contact!");
            JSONOutput.setMimeType(ContentService.MimeType.JSON);

            return JSONOutput;
        }
        else {
            RowN = RowN as number +1;
            const Row = DB?.getRange('A'+RowN+':M'+RowN).getValues()!;
            const Person = DB?.getRange('B'+RowN);
            const Company = DB?.getRange('G'+RowN);
            const Comment = DB?.getRange('K'+RowN);

            if (!Row[0][2] || Row[0][2].includes(' ')) Row[0][2] = Get.personlink.split("in/")[1];
            if (!Row[0][4]) Row[0][4] = Get.person.includes("@") ? 'IMPORT AGAIN' : Get.person;
            if (!Row[0][5]) Row[0][5] = Get.loc;
            if (!Row[0][7]) Row[0][7] = Get.compsize;
            if (!Row[0][8] || Row[0][8].includes(' ')) Row[0][8] = Get.comp.split("company/")[1];
            Row[0][10] += '\n\nEnriched'+buildJobsString(Get.date, Get.more);
            if (!Row[0][11]) Row[0][11] = parseInt(Get.app.charAt(2)) ? Get.app : 'NA'; // Telephone
            if (!Row[0][12]) Row[0][12] = Get.complink;
            if (!Row[0][13]) Row[0][13] =  Get.person.includes("@") ? Get.person : '';

            DB?.getRange('A'+RowN+':N'+RowN).setValues(Row as any [][]);

            const PersonLink = SpreadsheetApp.newRichTextValue()
            .setText(Row![0][1])
            .setLinkUrl(Get.personlink)
            .build();
            Person?.setRichTextValue(PersonLink);
            Person?.offset(0,-1).insertCheckboxes();

            const CompanyLink = SpreadsheetApp.newRichTextValue()
            .setText(Row![0][6])
            .setLinkUrl(Get.comp)
            .build();
            Company?.setRichTextValue(CompanyLink);

            const CommentLink = SpreadsheetApp.newRichTextValue()
            .setText(Row[0][10])
            .setLinkUrl('https://app.apollo.io/#'+Get.url.split("apollo")[1])
            .build();
            Comment?.setRichTextValue(CommentLink);

            const JSONString = 'Row '+RowN+': '+JSON.stringify(Row);  
            const JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was casted successfully!");
            JSONOutput.setMimeType(ContentService.MimeType.JSON);

            return JSONOutput;
        }
    }

    const DB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName("LeadsDB");
    
    if (Get.ex) {
        const RowN = parseInt(Get.ex)+2;
        const Row = DB?.getRange('C'+RowN+':T'+RowN).getValues().flat()!;
        let Update = 'Row '+(parseInt(Get.ex)+2)+':\n';

        if (Get.date == 'Closed') {
            Update += ' - Job status changed from '+Row[1]+' to X.Closed.\n';
            DB?.getRange('D'+RowN).setValue('X.Closed');
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
            let PersonLink = SpreadsheetApp.newRichTextValue()
            .setText(Get.person)
            .setLinkUrl(Get.personlink)
            .build();
            DB?.getRange('K'+RowN).setRichTextValue(PersonLink);
            Update += ' - Contact person added: '+Get.person+'.\n';
        }
        if (Update.length <= 10) Update += ' - Nothing to update.'

        let JSONOutput = ContentService.createTextOutput("🧜‍♂️ "+Update+"\n🧚‍♀️ Sylph's spell was casted successfully!");
        JSONOutput.setMimeType(ContentService.MimeType.JSON);

        return JSONOutput;
    }

    DB!.appendRow([
    '', Get.comp, Get.compsize, '0.New', decodeURIComponent(Get.name), '??', Get.date, '1', '', Get.loc, 
    Get.person,'', '', '', '', '', '', '', 'Added via Sylph Chrome Extension!', Get.app
    ]);
    const RowN = DB?.getLastRow();
    const Company = DB?.getRange('B'+RowN);
    const Job = DB?.getRange('E'+RowN);
    const Person = DB?.getRange('K'+RowN);
    const ScoreFormula = DB?.getRange('I2');
    const Score = DB?.getRange('I'+RowN);
    const Row = DB?.getRange(RowN+':'+RowN);

    const CompanyLink = SpreadsheetApp.newRichTextValue()
    .setText(Get.comp)
    .setLinkUrl(decodeURI(Get.complink).replace("/life/", ""))
    .build();
    Company?.setRichTextValue(CompanyLink);
    Company?.offset(0,-1).insertCheckboxes();

    const JobLink = SpreadsheetApp.newRichTextValue()
    .setText(decodeURIComponent(Get.name))
    .setLinkUrl(Get.url.replace("/jobs", "/comm/jobs"))     // This allows further scraping, I noticed.
    .build();
    Job?.setRichTextValue(JobLink);

    if (Get.person != "NA") {
        const PersonLink = SpreadsheetApp.newRichTextValue()
        .setText(Get.person)
        .setLinkUrl(Get.personlink)
        .build();
        Person?.setRichTextValue(PersonLink);
    }

    Row?.offset(-(RowN! -3),0).copyTo(Row, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    ScoreFormula?.copyTo((Score as GoogleAppsScript.Spreadsheet.Range), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);

    const JSONString = 'Row '+RowN+': '+JSON.stringify(Row?.getValues());  
    const JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was casted successfully!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);

    addUniqueIDs(Get.complink, Get.url, Get.personlink);    // Needs an update! Uses the old sheet-based system 💩

    return JSONOutput;
}