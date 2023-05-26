type IndexProps = {unique: string[] | [string, string | null][], double?: string[], bad?: [string, string | null][]};
type ColumnInfo = {A1: string, sheetName: string, short?: boolean, doubles?: boolean, bad?: boolean};
type IndexInfo = {name: string, spreadsheet: string, stores?: number};

const Index = (() => {
    const [sheetAddress, colAddress, excludedStoreTags] = [1, 2, ['.index', '.info']];
    const objMod : {[sheet: string]: {[column: string]: ColumnIndex}} = {};
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
        public getProps = () => JSON.parse(params.stores.getProperty(this.#key + '.index')!) as IndexProps;
        public readProp = () => {
            caches.set(this, JSON.parse(params.stores.getProperty(this.#key + '.index')!) as IndexProps);
            return this;
        }
        public setProps = () => {
            const cache = caches.get(this);
            if (!cache) return false;
            params.stores.setProperty(this.#key + '.index', JSON.stringify(cache));
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
        public deleteId = (type: 'unique' | 'double', id: string) => {
            const cache = caches.get(this);
            if (!cache) return false;
            const found = type === 'unique' ? cache.unique.findIndex(elem => elem === id) : cache.double?.findIndex(elem => elem === id) as number;
            if (found === -1) return false;
            type === 'unique' ? cache.unique.splice(found, 1) : cache.double?.splice(found, 1);
            caches.set(this, cache);
            return true;
        }
        public addElems = (short: boolean, ...elems: string[] | [string, string | null][]) => {
            const cache = caches.get(this);
            if (!cache) return false;
            if (short !== this.#info.short) return false;
            const updatedIndex = short
                ? [...(cache.unique as string[]), ...(elems as string[]).filter(elem => typeof elem === "string")]
                : [...(cache.unique as [string, string | null][]), ...(elems as [string, string | null][]).filter(elem => Array.isArray(elem))];
            const updatedUnique = short
                ? Array.from(new Set(updatedIndex as string[]))
                : Array.from(new Map(updatedIndex as [string, string | null][]));
            caches.set(this, { ...cache, ...{ unique: updatedUnique } });
            return true;
        }
        public getInfo = () => ({...this.#info});
        public setInfo = (params: Partial<ColumnInfo>) => {
            this.#info = {...this.#info, ...params};
            return {... this.#info};
        }
    }

    class Index {
        constructor(SS: GoogleAppsScript.Spreadsheet.Spreadsheet, stores?: GoogleAppsScript.Properties.Properties, prefix?: string) {
            this.setParams({SS: SS, stores: stores, prefix: prefix})
            keys = this.getKeys();
            this.initClass();
        }
        private initClass = () => {
            const storedInfo = params.stores.getProperty(params.prefix + '.info');
            if (storedInfo) info = JSON.parse(storedInfo);
            else info = {name: params.prefix, spreadsheet: params.SS.getId()};
            info.stores = keys.length;
            console.log(info);
        }
        private setParams = (args: Partial<typeof params>) => {
            const ssName = args.SS!.getName();
            if (!ssName) throw new Error(`⛔ Invalid Spreadsheet. Querying for Spreadsheet ID: ${args.SS!.getId() as string}`);
            args.stores = args.stores ?? PropertiesService.getScriptProperties();
            args.prefix = args.prefix ?? labels(ssName);
            params = {...args} as typeof params;
            console.warn(params.SS.getName(), params.stores.getKeys(), params.prefix);
        }
        public getInfo = () => ({...info});
        public getKeys = () => params.stores.getKeys().filter(this.isStore);
        public setInfo = (newInfo: Partial<IndexInfo>) => info = {...info, ...newInfo};
        public isStore = (key: string) => key.startsWith(params.prefix) && !excludedStoreTags.some(tag => key.endsWith(tag));
        public getSheets = () => Array.from(sheets);
        public writeCols = () => colMap.forEach((cols, sheet) => cols.forEach(col => objMod[sheet][col].setProps()));
        public indexCols = () => colMap.forEach((cols, sheet) => cols.forEach(col => objMod[sheet][col].indexCol()));
        public writeInfo = () => params.stores.setProperty(params.prefix + '.info', JSON.stringify({...info, ...{stores: this.getKeys().length}}));
        public getObjMod = () => {
            keys = this.getKeys();
            for (const key of keys) {
                const sheetName = key.split('.')[sheetAddress];
                objMod[sheetName] = {};
                sheets.add(sheetName);
            }
            for (const sheet of sheets) {
                const columns = keys.filter(key => key.startsWith(`${params.prefix}.${sheet}`)).map(key => key.split('.')[colAddress]);
                colMap.set(sheet, columns);
                for (const column of columns) objMod[sheet][column] = new ColumnIndex(`${params.prefix}.${sheet}.${column}`);
            }
            console.log(JSON.stringify(objMod, undefined, 1));
            return {...objMod}
        };
        public addNewCol = (colInfo: ColumnInfo, colName?: string) => {
            const {A1, sheetName} = colInfo, sheet = params.SS.getSheetByName(sheetName);
            if (!sheet) return `⛔ Found no sheet named "${sheetName}" in Spreadsheet "${params.SS.getName()}".`;
            if (!colName) colName = labels(sheet.getRange(A1.charAt(0) + 1).getValue());
            const existing = colMap.get(sheetName);
            if (existing && existing.includes(colName)) return `⛔ "${colName}" already indexed. Use .getObjMod().${sheetName}.${colName} to interact.`;
            const colObject = new ColumnIndex(`${params.prefix}.${sheetName}.${colName}`, colInfo);
            objMod[sheetName][colName] = colObject;
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
    const index = new Index(SS, Props);
    const FWDB = index.getObjMod();
    console.log('Jobs index:', FWDB.LeadsDB.Jobs.readProp());
    console.log('Info object:', FWDB.info)
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