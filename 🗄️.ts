// Spreadsheet.Sheet.Column index abstraction layer
const Index = (() => {
    const [lastFiveIDChars, sheetAddress, colAddress, colA1Address] = [-5, 1, 2, 3]
    const _columns: Map<string, {[key: string]: string | string[]}> = new Map();
    const _sheets: Set<string> = new Set();
    let _props: GoogleAppsScript.Properties.Properties, _SS: GoogleAppsScript.Spreadsheet.Spreadsheet;
    let _id: string, _propPrefix: string;
    let _info: {[key: string]: string} = {};

    class ColumnIndex {
        public readonly columnAddress: string;
        #cachedColumn:  {[key: string]: string | string[]};
        constructor(columnAddress: string) {
            this.columnAddress = columnAddress;
            this.#cachedColumn = _columns.get(this.columnAddress) ?? {colName: '⛔ Column not found!', A1: columnAddress, index: []};
        }
        public get = () => this.#cachedColumn?.index;
        public info = () => ({colName: this.#cachedColumn?.colName, A1: this.#cachedColumn?.A1});
        public retrieve = () => {
            if (this.#cachedColumn.index.length) return this;
            this.#cachedColumn.index = JSON.parse(_props.getProperty(this.columnAddress) as string) ?? [];
            _columns.set(this.columnAddress, this.#cachedColumn);
            return this;
        }
    }
    class SheetIndex {
        public readonly col: {[key: string]: ColumnIndex} = {};
        constructor(colName: string, columnIndex: ColumnIndex) {
            this.col[colName] = columnIndex;
        }
    }
    class Index {
        constructor(spreadID: string | GoogleAppsScript.Spreadsheet.Spreadsheet, props?: GoogleAppsScript.Properties.Properties) {
            [_id, _SS] = typeof spreadID === 'string' ? [spreadID, SpreadsheetApp.openById(spreadID)] : [spreadID.getId(), spreadID];
            _propPrefix = 'Index' + _id.slice(lastFiveIDChars);
            _props = (props ?? PropertiesService.getScriptProperties());
            const storedInfo = _propPrefix + '.info';
            const indexes = Object.keys(_props.getProperties()).filter(prop => prop.startsWith(_propPrefix));
            if (indexes.includes(storedInfo)) {
                _info = JSON.parse(_props.getProperty(storedInfo) as string);
                indexes.splice(indexes.indexOf(storedInfo), sheetAddress);
            }
            else {
                _info = { prefix: _propPrefix, spreadsheetName: _SS.getName() };
                _props.setProperty(storedInfo, JSON.stringify(_info));
            }
            if (_info.prefix !== _propPrefix) console.warn('Index mismatch!', _info.prefix, _propPrefix);
            
            // Builds the set of indexed sheets (names only)
            indexes.forEach(index => _sheets.add(index.split('.')[sheetAddress]));
            
            // Builds the object model (names/coordinates only)
            for (const sheet of _sheets) {
                const columns = indexes.filter(prop => prop.startsWith(`${_propPrefix}.${sheet}`));
                columns.forEach(columnAddress => {
                    const address = columnAddress.split('.');
                    const [colName, colA1] = [address[colAddress], address[colA1Address]];
                    if (!colName || !colA1) return;
                    _columns.set(columnAddress, { colName: colName, colA1: colA1, index: [] });
                    this.of[sheet] = new SheetIndex(colName, new ColumnIndex(columnAddress));
                });
            }
        }
        public readonly of: {[key: string]: SheetIndex} = {};
        public getInfo = () => _info;
        public getSheets = () => Array.from(_sheets);
        public getColumns = (sheet: string) => this.of[sheet] ? Object.keys(this.of[sheet].col) : `⚠️ "'${sheet}" not indexed!`;
        public getSpreadsheet = () => SpreadsheetApp.openById(_id);
    }
    return Index;
})();

function indexTests() {
    const Props = PropertiesService.getScriptProperties();
    Props.deleteProperty('Index_SBrc.Leads.Jobs.B2');
    Props.setProperty('Index_SBrc.LeadsDB.Jobs.B2', '[]');
    const index = new Index(getFWDBLeads(), Props)
    console.log(index.getInfo());
    console.log(index.getSheets());
    console.log(index.getColumns('LeadsDB'));
    console.log(index.of.LeadsDB.col);
    console.log(index.getSpreadsheet().getName());
    console.log(index.of.LeadsDB.col.Jobs.retrieve().get()!);
}