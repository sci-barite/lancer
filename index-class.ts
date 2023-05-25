type IndexObject = {unique: string[] | [string, string | null][], double?: string[], bad?: [string, string | null][]};
type ColumnInfo =  {A1: string, sheetName: string, short?: boolean, doubles?: boolean, bad?: boolean};
type IndexInfo = {name: string, spreadsheet: string, stores?: number};

const Index = (() => {
    const [sheetAddress, colAddress] = [1, 2];
    const object : {[sheet: string]: {[column: string]: ColumnIndex}} = {};
    const caches : WeakMap<ColumnIndex, IndexObject> = new WeakMap();
    const colMap : Map<string, string[]> = new Map();
    const sheets : Set<string> = new Set();
    const labels = (originalName: string) => originalName.trim().replace(':', '').split(' ').slice(0, 2).join('');
    let params : {SS: GoogleAppsScript.Spreadsheet.Spreadsheet, stores: GoogleAppsScript.Properties.Properties, prefix: string};
    let info : IndexInfo;

    class ColumnIndex {
        #key: string;
        #info: ColumnInfo;
        constructor(key: string, info?: ColumnInfo) {
            this.#key = key;
            this.#info = info ?? JSON.parse(params.stores.getProperty(key)!) ??
                {A1: 'NN', sheetName: key.split('.')[sheetAddress], short: true, doubles: false, bad: false};
            return this;
        }
        public getCache = () => caches.get(this);
        public readProp = () => JSON.parse(params.stores.getProperty(this.#key + '.index')!) as IndexObject;
        public getProps = () => caches.set(this, JSON.parse(params.stores.getProperty(this.#key + '.index')!) as IndexObject);
        public setProps = () => {
            const cached = caches.get(this);
            if (!cached) return false;
            params.stores.setProperty(this.#key + '.index', JSON.stringify(cached));
            return true;
        }
        public indexCol = () => {
            const sheet = params.SS.getSheetByName(this.#info.sheetName);
            if (!sheet) throw new Error('⛔ No valid sheet in info. Check with the getInfo() and fix with the setInfo() methods.');
            const range = sheet.getRange(this.#info.A1 + '2:' + this.#info.A1 + sheet.getLastRow());
            const links = range.getRichTextValues().flat() as GoogleAppsScript.Spreadsheet.RichTextValue[];
            const index = genericIndex(links);
            const model = { unique: this.#info.short ? index.Unique.map(tuple => tuple[0]) : index.Unique } as IndexObject;
            if (this.#info.doubles) model.double = index.Double;
            if (this.#info.bad) model.bad = index.Unique.filter(tuple => tuple[0].startsWith('BAD'));
            caches.set(this, model);
            return this;
        }
        public getInfo = () => ({...this.#info});
        public setInfo = (params: Partial<ColumnInfo>) => this.#info = {...this.#info, ...params} as ColumnInfo;

    }

    class Index {
        constructor(SS: GoogleAppsScript.Spreadsheet.Spreadsheet, stores?: GoogleAppsScript.Properties.Properties, prefix?: string) {
            const ssName = SS.getName()
            if (!ssName) throw new Error(`⛔ Invalid Spreadsheet. Querying for Spreadsheet ID: ${SS.getId() as string}`)

            stores = stores ?? PropertiesService.getScriptProperties();
            prefix = prefix ?? labels(ssName);
            params = { SS, stores, prefix };
            console.warn(params.SS.getName(), stores.getKeys(), prefix);
            
            const storedKeys = stores.getKeys().filter(key => key.startsWith(prefix as string));
            const storedInfo = stores.getProperty(prefix + '.info');
            if (storedInfo) info = JSON.parse(storedInfo), storedKeys.splice(storedKeys.indexOf(prefix + '.info'), 1);
            else info = {name: prefix, spreadsheet: ssName, stores: storedKeys.length};
            console.log(info);

            for (const key of storedKeys) {
                const sheet = key.split('.')[sheetAddress];
                object[sheet] = {};
                sheets.add(sheet);
            }
            for (const sheet of sheets) {
                const columns = Array.from(new Set(storedKeys.filter(key => key.startsWith(`${prefix}.${sheet}`)).map(key => key.split('.')[colAddress])));
                colMap.set(sheet, columns);
                for (const column of columns) object[sheet][column] = new ColumnIndex(`${prefix}.${sheet}.${column}`);
            }
            console.log(JSON.stringify(object, undefined, 1));
        }
        public getInfo = () => info;
        public setInfo = (passedInfo: Partial<IndexInfo>) => info = {...info, ...passedInfo};
        public getSheets = () => Array.from(sheets);
        public getObjMod = () => ({...object});
        public writeCols = () => colMap.forEach((cols, sheet) => cols.forEach(col => object[sheet][col].setProps()));
        public indexCols = () => colMap.forEach((cols, sheet) => cols.forEach(col => object[sheet][col].indexCol()));
        public writeInfo = () => { 
            info.stores = params.stores.getKeys().filter(key => key.startsWith(params.prefix)).length - 1;
            params.stores.setProperty(params.prefix + '.info', JSON.stringify(info));
        }
        public addNewCol = (colInfo: ColumnInfo, colName?: string) => {
            const {A1, sheetName} = colInfo, sheet = params.SS.getSheetByName(sheetName);
            if (!sheet) return `⛔ Found no sheet named "${sheetName}" in Spreadsheet "${params.SS.getName()}".`;
            if (!colName) colName = labels(sheet.getRange(A1.charAt(0) + 1).getValue());
            const existing = colMap.get(sheetName);
            if (existing && existing.includes(colName)) return `⛔ Existing index for "${colName}". Use .getObjMod().${sheetName}.${colName} to access it.`;
            const colObject = new ColumnIndex(`${params.prefix}.${sheetName}.${colName}`, colInfo);
            object[sheetName][colName] = colObject;
            existing ? colMap.set(sheetName, existing.concat(colName)) : colMap.set(sheetName, [colName]);
            console.log(`✅ Added index for "${colName}". Use .getObjMod().${sheetName}.${colName} to access it.`);
            return colObject;
        }
    }
    return Index;
})();

function indexTests() {
    const Props = PropertiesService.getScriptProperties();
    const SS = SpreadsheetApp.openById(getFWDBLeads());
    const Info : IndexInfo = {name: 'FWDBLeads', spreadsheet: SS.getName()};
    Props.setProperty('FWDBLeads.info', JSON.stringify(Info));
    const ColInfo : ColumnInfo = {A1: 'E', sheetName: 'LeadsDB', short: true};
    Props.setProperty('FWDBLeads.LeadsDB.Jobs', JSON.stringify(ColInfo));
    const index = new Index(SS, Props);
    const FWDB = index.getObjMod();
    console.log('Jobs index:', FWDB.LeadsDB.Jobs.readProp());
}