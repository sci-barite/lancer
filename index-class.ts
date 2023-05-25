type IndexProps = {unique: string[] | [string, string | null][], double?: string[], bad?: [string, string | null][]};
type ColumnInfo = {A1: string, sheetName: string, short?: boolean, doubles?: boolean, bad?: boolean};
type IndexInfo = {name: string, spreadsheet: string, stores?: number};

const Index = (() => {
    const [sheetAddress, colAddress] = [1, 2];
    const object : {[sheet: string]: {[column: string]: ColumnIndex}} = {};
    const caches : WeakMap<ColumnIndex, IndexProps> = new WeakMap();
    const colMap : Map<string, string[]> = new Map();
    const sheets : Set<string> = new Set();
    const labels = (originalName: string) => originalName.trim().replace(':', '').split(' ').slice(0, 2).join('');
    let params : {SS: GoogleAppsScript.Spreadsheet.Spreadsheet, stores: GoogleAppsScript.Properties.Properties, prefix: string};
    let info : IndexInfo;
    let keys : string[];

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
        public readProp = () => JSON.parse(params.stores.getProperty(this.#key + '.index')!) as IndexProps;
        public getProps = () => caches.set(this, JSON.parse(params.stores.getProperty(this.#key + '.index')!) as IndexProps);
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
            const props = { unique: this.#info.short ? index.Unique.map(tuple => tuple[0]) : index.Unique } as IndexProps;
            if (this.#info.bad) props.bad = index.Unique.filter(tuple => tuple[0].startsWith('BAD'));
            if (this.#info.doubles) props.double = index.Double;
            caches.set(this, props);
            return this;
        }
        public getInfo = () => ({...this.#info});
        public setInfo = (params: Partial<ColumnInfo>) => this.#info = {...this.#info, ...params} as ColumnInfo;
    }

    class Index {
        constructor(SS: GoogleAppsScript.Spreadsheet.Spreadsheet, stores?: GoogleAppsScript.Properties.Properties, prefix?: string) {
            this.setParams({SS: SS, stores: stores, prefix: prefix})
            console.warn(params.SS.getName(), params.stores.getKeys(), prefix);
            keys = this.getKeys();
            this.initClass();
        }
        private initClass = () => {
            const storedInfo = params.stores.getProperty(params.prefix + '.info');
            if (storedInfo) info = JSON.parse(storedInfo), keys.splice(keys.indexOf(params.prefix + '.info'), 1);
            else info = {name: params.prefix, spreadsheet: params.SS.getId(), stores: keys.length};
            console.log(info);
        }
        private setParams = (args: Partial<typeof params>) => {
            const ssName = args.SS!.getName();
            if (!ssName) throw new Error(`⛔ Invalid Spreadsheet. Querying for Spreadsheet ID: ${args.SS!.getId() as string}`);
            args.stores = args.stores ?? PropertiesService.getScriptProperties();
            args.prefix = args.prefix ?? labels(ssName);
            params = {...args} as typeof params;
        }
        public getInfo = () => ({...info});
        public getKeys = () => params.stores.getKeys().filter(key => key.startsWith(params.prefix as string));
        public setInfo = (newInfo: Partial<IndexInfo>) => info = {...info, ...newInfo};
        public getSheets = () => Array.from(sheets);
        public writeCols = () => colMap.forEach((cols, sheet) => cols.forEach(col => object[sheet][col].setProps()));
        public indexCols = () => colMap.forEach((cols, sheet) => cols.forEach(col => object[sheet][col].indexCol()));
        public writeInfo = () => { 
            info.stores = params.stores.getKeys().filter(key => key.startsWith(params.prefix)).length - 1;
            params.stores.setProperty(params.prefix + '.info', JSON.stringify(info));
        }
        public getObjMod = () => {
            keys = this.getKeys();
            for (const key of keys) {
                const sheet = key.split('.')[sheetAddress];
                object[sheet] = {};
                sheets.add(sheet);
            }
            for (const sheet of sheets) {
                const columns = Array
                    .from(new Set(keys.filter(key => key.startsWith(`${params.prefix}.${sheet}`)).map(key => key.split('.')[colAddress])));
                colMap.set(sheet, columns);
                for (const column of columns) object[sheet][column] = new ColumnIndex(`${params.prefix}.${sheet}.${column}`);
            }
            console.log(JSON.stringify(object, undefined, 1));
            return {...object}
        };
        public addNewCol = (colInfo: ColumnInfo, colName?: string) => {
            const {A1, sheetName} = colInfo, sheet = params.SS.getSheetByName(sheetName);
            if (!sheet) 
                return `⛔ Found no sheet named "${sheetName}" in Spreadsheet "${params.SS.getName()}".`;
            if (!colName) colName = labels(sheet.getRange(A1.charAt(0) + 1).getValue());
            const existing = colMap.get(sheetName);
            if (existing && existing.includes(colName)) 
                return `⛔ Existing index for "${colName}". Use .getObjMod().${sheetName}.${colName} to get it.`;
            const colObject = new ColumnIndex(`${params.prefix}.${sheetName}.${colName}`, colInfo);
            object[sheetName][colName] = colObject;
            existing ? colMap.set(sheetName, existing.concat(colName)) : colMap.set(sheetName, [colName]);
            console.log(`✅ Added index for "${colName}". Use .getObjMod().${sheetName}.${colName} to get it.`);
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