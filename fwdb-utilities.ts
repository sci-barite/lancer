function getStatusSheet() : GoogleAppsScript.Spreadsheet.Sheet {
    const SS = SpreadsheetApp.openById(getFWDBLeads());
    const Initials = ['⚠️', 'DOUBLE', 'No double'];
    const Sheets = SS.getSheets();
    let StatusSheet = null;
    Sheets.forEach(function (sheet) {
        if (Initials.some(chars => sheet.getName().includes(chars))) StatusSheet = sheet;
    });
    if (!StatusSheet) StatusSheet = SS.insertSheet().setName("Doubles..?");
    return StatusSheet;
}

