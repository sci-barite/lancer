function getStatusSheet() : GoogleAppsScript.Spreadsheet.Sheet {
    const SS = SpreadsheetApp.getActiveSpreadsheet();
    const Sheets = SS.getSheets();
    let StatusSheet = null;
    Sheets.forEach(function (sheet) {
        if (sheet.getName().startsWith("DOUBLE") || sheet.getName().startsWith("No doubles")) StatusSheet = sheet;
    });
    if (!StatusSheet) StatusSheet = SS.insertSheet().setName("Doubles..?");
    return StatusSheet;
}

