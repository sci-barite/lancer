function FWDBCandidates (Get : any, db : string | GoogleAppsScript.Spreadsheet.Sheet) {
    let JSONString = JSON.stringify("Error: "+db+" "+Get);  
    let JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was miscasted!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);

    switch (db) {
        case 'DB': db = SpreadsheetApp.openById(getFWDB()).getSheetByName("DB")!; break;
        case 'Free': db = SpreadsheetApp.openById(getFWDB()).getSheetByName("FreelanceDB")!; break;
        case 'Contacts': db = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName("ContactsDB")!; break;
        default: return JSONOutput;
    }

    const Today = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy");
    //const Names = db.getRange('A:A').getValues();
    //const Search = (element: any) => element == Get.name;
    //if (Names?.findIndex(Search) != -1) var name = 'DUPLICATE! '+Get.name; else var name : string = Get.name;

    if (db.getSheetName() == 'ContactsDB') {
        const ID = Get.url.split('in/')[1].replace('/','');
        const Links = db?.getRange('B:B').getValues();
        const Search = (element: any) => element[0].includes(ID);
        const RowN : number = Links!.findIndex(Search) + 1 || db!.getLastRow() + 1;
        const ORowRange = db.getRange(RowN,1,1,16), ORow = ORowRange.getValues();
        const CompID = Get.status.includes('company') ? Get.status.split('company/')[1].replace('/','') : Get.status;
        const Row = [true, Get.name, ID, ORow[0][3], Get.pos, Get.loc, Get.eng, '', CompID, new Date(), 'Sylph!', '', '', '', '', ''];
        ORowRange.setValues([Row]);
        const PersLink = SpreadsheetApp.newRichTextValue().setText(Get.name).setLinkUrl(Get.url).build();
        db.getRange('B'+RowN).setRichTextValue(PersLink);
        const CompLink = SpreadsheetApp.newRichTextValue().setText(Get.eng).setLinkUrl(Get.status.slice(0, -1)).build();
        db.getRange('G'+RowN).setRichTextValue(CompLink);
        JSONString = JSON.stringify('Row '+RowN+': '+ORowRange?.getValues());  
        JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was casted successfully!");
        return JSONOutput;
    }

    const RowData = [
        Get.name, '', Get.status, 'Sylph', Today, decodeURIComponent(Get.pos), decodeURIComponent(Get.skills), 
        Get.loc, '', Get.more, '', '', Get.eng, Get.rate, '', '', ''
    ];
    if (!Get.ex) db.appendRow(RowData);
    
    const RowN = (Get.ex) ? parseInt(Get.ex)+2 : db.getLastRow();
    const Name = db.getRange('A'+RowN);
    const Row = db.getRange(RowN+':'+RowN);
    if (Get.ex) {
        const prevVals = Row.getValues().flat();
        [prevVals[2], prevVals[3], prevVals[4], prevVals[5], prevVals[6], prevVals[9]] = 
        [RowData[2], RowData[3], RowData[4], 
        (RowData[5] == 'Other bookmarks' ? prevVals[5] : RowData[5]), 
        (prevVals[6].includes(RowData[6]) ? prevVals[6] : prevVals[6]+', '+RowData[6]), prevVals[9]+'\nUpdated via Sylph!'];
        Row.setValues([prevVals]);
    }
    const Link = SpreadsheetApp.newRichTextValue().setText(Get.name).setLinkUrl(Get.url).build();
    Name?.setRichTextValue(Link);
    Name?.offset(0,1).insertCheckboxes();
    Row?.offset(-1,0).copyTo(Row, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    Name?.offset(0,3).setFontWeight("bold");
    Row?.setVerticalAlignment('middle');

    JSONString = JSON.stringify('Row '+RowN+': '+Row?.getValues());  
    JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was casted successfully!");

    return JSONOutput;
}

