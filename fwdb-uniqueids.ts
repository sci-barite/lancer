function addUniqueIDs(Comp : string, Job : string, Cont : string) {
    var UniqueIDsDB = SpreadsheetApp.openById(getFWDBLeads()).getSheetByName("UniqueIDsDB");
    
    let uniqueCompID = (Comp.split('company/')[1].replace("/life/", "") as string);
    let uniqueJobID = (Job.split('view/')[1].replace('/', '') as string);
    let uniqueContID = '';
    if (Cont) uniqueContID = (Cont.split('in/')[1] as string);

    UniqueIDsDB?.appendRow([uniqueCompID, uniqueJobID, uniqueContID]);

    let UniqueJobs = PropertiesService.getScriptProperties().getProperty("UniqueJobs")
    UniqueJobs = UniqueJobs+","+uniqueJobID;
    PropertiesService.getScriptProperties().setProperty("UniqueJobs", UniqueJobs);
}