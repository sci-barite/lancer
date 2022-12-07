function FWDBCandidates (e : any, db : string | GoogleAppsScript.Spreadsheet.Sheet) {
    let JSONString = JSON.stringify("Error: "+db+" "+e);  
    let JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was miscasted!");
    JSONOutput.setMimeType(ContentService.MimeType.JSON);

    switch (db) {
        case 'DB': db = SpreadsheetApp.openById(getFWDB()).getSheetByName("DB")!; break;
        case 'Free': db = SpreadsheetApp.openById(getFWDB()).getSheetByName("FreelanceDB")!; break;
        default: return JSONOutput;
    }

    const Today = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy");
    const Names = db.getRange('A:A').getValues();
    const Search = (element: any) => element == e.name;
    if (Names?.findIndex(Search) != -1) var name = 'DUPLICATE! '+e.name; else var name : string = e.name;

    db.appendRow([
    name, '', e.status, 'Sylph', Today, decodeURIComponent(e.pos), decodeURIComponent(e.skills), e.loc, '', e.more, '', '', e.eng, e.rate
    ]);
    const Name = db.getRange('A'+db.getLastRow());
    const Row = db.getRange(db.getLastRow()+':'+db.getLastRow());
    const Link = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(e.url).build();
    Name?.setRichTextValue(Link);
    Name?.offset(0,1).insertCheckboxes();
    Row?.offset(-1,0).copyTo(Row, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    Name?.offset(0,3).setFontWeight("bold");
    Row?.setVerticalAlignment('middle');

    JSONString = JSON.stringify(Row?.getValues());  
    JSONOutput = ContentService.createTextOutput(JSONString+"\n🧚‍♀️ Sylph's spell was casted successfully!");

    return JSONOutput;
}

