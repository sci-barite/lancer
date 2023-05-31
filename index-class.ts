type IndexProps = {short: string[], long: [string, string | null][], double?: string[], bad?: [string, string | null][]};
type ColumnInfo = {A1: string, sheetName: string, short?: boolean, doubles?: boolean, bad?: boolean};
type SpreadInfo = {name: string, spreadsheet: string, postURL: string, stores?: number};

/* const Index = (() => {
    const [sheetAddress, colAddress, excludedStoreTags] = [1, 2, ['.index', '.info']];
    const objMod : {[sheet: string]: {[column: string]: ColumnIndex}} = {};
    const caches : WeakMap<ColumnIndex, IndexProps> = new WeakMap();
    const colMap : Map<string, string[]> = new Map();
    const sheets : Set<string> = new Set();
    const labels = (originalName: string) => originalName.trim().replace(':', '').split(' ').slice(0, 2).join('');
    let params : {SS: GoogleAppsScript.Spreadsheet.Spreadsheet, stores: GoogleAppsScript.Properties.Properties, prefix: string};
    let info : SpreadInfo;
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
        public getIndex = () => (JSON.parse(params.stores.getProperty(this.#key + '.index')!) as IndexProps).short.toString();
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
            const props = {
                short: this.#info.short ? index.Unique.map(tuple => tuple[0]) : [],
                long: this.#info.short ? [] : index.Unique
            } as IndexProps;
            if (this.#info.bad) props.bad = index.Unique.filter(tuple => tuple[0].startsWith('BAD'));
            if (this.#info.doubles) props.double = index.Double;
            caches.set(this, props);
            console.log(`✅ Indexed Column ${this.#info.A1} from "${this.#info.sheetName}": ${index.Unique.length} entries.`);
            return this;
        }
        public deleteId = (type: 'unique' | 'double', id: string) => {
            const cache = caches.get(this);
            if (!cache) return false;
            const found = type === 'unique'
                ? (this.#info.short ? cache.short.findIndex(elem => elem === id) : cache.long.findIndex(elem => elem[0] === id)) 
                : cache.double?.findIndex(elem => elem === id) as number;
            if (found === -1) return false;
            type === 'unique' ? (this.#info.short ? cache.short.splice(found, 1) : cache.long.splice(found, 1)) : cache.double?.splice(found, 1);
            caches.set(this, cache);
            return true;
        }
        public addElems = (args: {short?: string[], long?: [string, string | null][]}) => {
            const cache = caches.get(this), short = this.#info.short;
            if (!cache || (short && !args.short?.length)) return [];
            const results = args.short && short
                ? this.shortIndex(cache, ...args.short) 
                : (args.long && !short ? this.longIndex(cache, ...args.long) : {});
            const updated = this.#info.doubles ? 
                results : (short ? {short: results.short} : {long: results.double});
            caches.set(this, { ...cache, ...updated as Partial<IndexProps> });
            return short ? results.short?.slice(-args.short!.length) : results.long;
        }
        private shortIndex = (cache: IndexProps, ...elems : string[]): Partial<IndexProps> => {
            elems.forEach(elem => cache.short.findIndex(id => id === elem) === -1 ? cache.short.push(elem) : cache.double?.push(elem));
            return {short: [...cache.short], double: cache.double ? [...cache.double] : []};
        }
        private longIndex = (cache: IndexProps, ...elems : [string, string | null][]): Partial<IndexProps> => {
            elems.forEach(elem => cache.long.findIndex(id => id[0] === elem[0]) === -1 ? cache.long.push(elem) : cache.double?.push(elem[0]));
            return {long: [...cache.long], double: cache.double ? [...cache.double] : []};
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
            else info = {name: params.prefix, spreadsheet: params.SS.getId(), postURL: getFWDBPost()};
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
        public setInfo = (newInfo: Partial<SpreadInfo>) => info = {...info, ...newInfo};
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
})(); */