/**
 * This is the big one! 
 * Gets data sent by my Sylph Chrome Extension, and writes an entry on Google Sheets.
 * Now writing data coming from LinkedIn, Upwork, Djinni, and Apollo too...
 */
function doGet(e: { parameter: any; }) {
    const Get = e.parameter;
    const JSONString = JSON.stringify([Get.url]);  
    const JSONOutput = ContentService.createTextOutput(JSONString+' parameter invalid.\n\nHave a nice day!');
    JSONOutput.setMimeType(ContentService.MimeType.JSON);
    let Resp = JSONOutput;

    if (Get.url.includes("linkedin")) {
      if (Get.url.includes("jobs")) Resp = FWDBLeads(Get);
      else Resp = FWDBCandidates(Get, 'DB');
    }
    else if (Get.url.includes("upwork") || Get.url.includes("djinni")) Resp = FWDBCandidates(Get, 'Free');
    else if (Get.url.includes("apollo")) Resp = FWDBContacts(Get)
    else if (Get.url == "GetUniqueJobs") 
      Resp = ContentService.createTextOutput(
        (PropertiesService.getScriptProperties().getProperty("UniqueJobs") as string)
      );
    else if (Get.url == "GetUniqueCands") 
      Resp = ContentService.createTextOutput(PropertiesService.getScriptProperties().getProperty("UniqueCands") as string);
    
    return Resp;
}

function doPost(e : any) {
  const JSONString = e.postData.contents;
  const JSONOutput = ContentService.createTextOutput(JSONString.substring(JSONString.length - 5));
  JSONOutput.setMimeType(ContentService.MimeType.JSON);

  if (JSONString.startsWith(  "UniqueJobs:")) 
    PropertiesService.getScriptProperties().setProperty("UniqueJobs", JSONString.replace("UniqueJobs:", ""))
  if (JSONString.startsWith('NewUniqueJobs:')) {
    PropertiesService.getScriptProperties().setProperty("NewUniqueJobs", JSONString.replace('NewUniqueJobs:', ''));
    prepareForSylph('NewUniqueJobs');
  }
  if (JSONString.startsWith('NewUniqueCands:')) {
    PropertiesService.getScriptProperties().setProperty("NewUniqueCands", JSONString.replace('NewUniqueCands:', ''));
    prepareForSylph('NewUniqueCands');
  }
  
  return JSONOutput;
}