/* import { InternalSymbolName } from "./node_modules/typescript/lib/typescript";

type ColIndexInfo = {
    fullA1: string,
    sheetName: string,
    colName: string,
    short: boolean,
    doubles: boolean,
    bad: boolean
}
type IndexInfo = {
    spreadID: string,
    deployedURL: string,
    indexName: string,
    indexes: {[key: string]: ColIndexInfo}
}

const IndexInterface = (() => {
    let storedProps: GoogleAppsScript.Properties.Properties;
    let storedIndex: IndexInfo;

    class IndexInterface {
        constructor(indexName: string, props?: GoogleAppsScript.Properties.Properties) {
            storedProps = props || PropertiesService.getScriptProperties();
            storedIndex = JSON.parse(storedProps.getProperty(indexName) as string);
            return this;
        }
        public getInfo = () => ({...storedIndex});
        public getCols = (sheetName: string) => Object.values(storedIndex.indexes).filter(col => col.sheetName === sheetName);
        public getSheets = () => new Set(Object.values(storedIndex.indexes).map(col => col.sheetName));
        public getIndex = (sheetNameColName: string) => {
            const index = storedIndex.indexes[sheetNameColName];
            if (!index) return null;
            return JSON.parse(storedProps.getProperty(storedIndex.indexName + sheetNameColName) as string);
        }
        public indexCol = (params: ColIndexInfo) => {
            const SS = SpreadsheetApp.openById(storedIndex.spreadID);
            if (!SS) throw new Error('⛔ Cannot open Spreadsheet with ID "' + storedIndex.spreadID + "'");
            const sheet = SS.getSheetByName(params.sheetName);
            if (!sheet) throw new Error('⛔ No valid sheet in info. Check with the getInfo() and fix with the setInfo() methods.');
            const range = sheet.getRange(params.fullA1 + sheet.getLastRow());
            const links = range.getRichTextValues().flat() as GoogleAppsScript.Spreadsheet.RichTextValue[];
            const index = genericIndex(links);
            const props = params.short ? index.Unique.map(tuple => tuple[0]) : index.Unique;
            const bad = params.bad ? index.Unique.filter(tuple => tuple[0].startsWith('BAD')) : [];
            const double = params.doubles ? index.Double : [];
            const propName = storedIndex.indexName + params.sheetName + params.colName;
            storedProps.setProperty(propName, JSON.stringify(props));
            if (bad.length) storedProps.setProperty(propName + '.bad', JSON.stringify(bad));
            if (double.length) storedProps.setProperty(propName + '.double', JSON.stringify(double));
        }
        public deleteId = (sheetNameColName: string, type: 'unique' | 'double', id: string) => {
            const index = storedIndex.indexes[sheetNameColName];
            if (!index) return null;
            const indexName = storedIndex.indexName + sheetNameColName;
            const indexData = type === 'unique'
                ? JSON.parse(storedProps.getProperty(indexName) as string) as string[] | string[][]
                : JSON.parse(storedProps.getProperty(indexName + '.double') as string) as string[];
            const found = type === 'unique'
                ? (index.short ? indexData.findIndex(elem => elem === id) : indexData.findIndex(elem => elem[0] === id)) 
                : indexData.findIndex(elem => elem === id);
            if (found === -1) return false;
            indexData.splice(found, 1);
            type === 'unique'
                ? storedProps.setProperty(indexName, JSON.stringify(indexData))
                : storedProps.setProperty(indexName + '.double', JSON.stringify(indexData));
            return true;
        }
        public addElems = (sheetNameColName: string, args: {short?: string[], long?: [string, string][]}) => {
            const index = storedIndex.indexes[sheetNameColName];
            if (!index) return null;
            if ((index.short && !args.short?.length) || (!index.short && !args.long?.length)) return null;
            const indexName = storedIndex.indexName + sheetNameColName;
            const indexData = index.short
                ? JSON.parse(storedProps.getProperty(indexName) as string) as string[]
                : JSON.parse(storedProps.getProperty(indexName) as string) as string[][];
            const results = index.short
                ? this.shortIndex(indexData as string[], ...args.short!) 
                : (this.longIndex(indexData as string[][], ...args.long!));
            if (results.unique.length) storedProps.setProperty(indexName, JSON.stringify(results.unique));
            if (results.double.length) storedProps.setProperty(indexName, JSON.stringify(results.double));
            return index.short ? results.unique?.slice(-args.short!.length) : results.unique?.slice(-args.long!.length);
        }
        public sendToSheet = () => {
            const indexes = Object.values(storedIndex.indexes);
            indexes.forEach(index => {
                const indexName = storedIndex.indexName + index.sheetName + index.colName;
                let payload = indexName + ':' + storedProps.getProperty(indexName);
                if (index.doubles) payload += ':double:' + storedProps.getProperty(indexName + '.double');
                if (index.bad) payload += ':bad:' + storedProps.getProperty(indexName + '.bad');
                UrlFetchApp.fetch(getFWDBPost(), {method: 'post', contentType: 'text/plain', payload: payload});
            });
        }
        private shortIndex = (indexData: string[], ...elems : string[]) => {
            const double : string[] = []
            elems.forEach(elem => indexData.findIndex(id => id === elem) === -1 ? indexData.push(elem) : double.push(elem));
            return {unique: [...indexData], double: [...double]};
        }
        private longIndex = (indexData: string[][], ...elems : [string, string][]) => {
            const double : string[] = [];
            elems.forEach(elem => indexData.findIndex(id => id[0] === elem[0]) === -1 ? indexData.push(elem) : double.push(elem[0]));
            return {unique: [...indexData], double: [...double]};
        }
    }
    return IndexInterface;
})();

// FAST Indexing and double counting function: 1 and a half seconds for 700+ RichTextValue links!
function genericIndex(linkColumn: GoogleAppsScript.Spreadsheet.RichTextValue[]) {
    const Links = linkColumn.map(link => [link.getLinkUrl(), link.getText()]), [ID, title] = [0, 1];
    const PopLi = (url: string | null, row: number) => (url?.split('/').pop() || url?.split('/').at(-2) || `BAD: ${row + 2}`);
    const IDMap = Links.map((link, row) => [(link[ID] ? PopLi(link[ID], row) : `BAD-NULL: ${row + 2}`), link[title]] as const);
    const UnIDs = new Map(IDMap);
    const Count = new Map(), CountDown = (row : number) => Count.set(IDMap[row][ID], Count.get(IDMap[row][ID]) - 1);
    const Doubs: string[] = [], DoubPush = (row : number) => Doubs.push(`${row + 2}: ${IDMap[row][title]}`);
    IDMap.forEach(row => Count.set(row[ID], (Count.get(row[ID]) || 0) + 1));
    for (let row: number = IDMap.length - 1; row >= 0; row--) 
        IDMap[row][ID] && (Count.get(IDMap[row][ID]) > 1) ? (DoubPush(row), CountDown(row)) : CountDown(row);
    return {Unique: Array.from(UnIDs), Double: Doubs};
}

function indexTests() {
    const index = new IndexInterface('FWDBLeads');
    console.log(index.getInfo());
    const Jobs = index.getIndex('LeadsDBJobs');
    console.log(Jobs!);
} */