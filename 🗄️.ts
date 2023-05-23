// Spreadsheet.Sheet.Column index abstraction layer
const Index = (() => {
    const _columns: Map<string, {[key: string]: string | string[]}> = new Map();
    const _sheets: Set<string> = new Set();
    let _SS: GoogleAppsScript.Spreadsheet.Spreadsheet, _props: GoogleAppsScript.Properties.Properties;
    let _id: string, _propPrefix: string;
    let _info: {[key: string]: string};

    class ColumnIndex {
        private readonly colName: string;
        private readonly colA1: string;
        private readonly sheet: string;

        constructor(sheet: string, colName: string, colA1: string) {
            this.colName = colName;
            this.colA1 = colA1;
            this.sheet = sheet;
        }
        public get = () => _columns.get(this.sheet + this.colName)?.index
        public A1 = () => this.colA1;
        public spreadsheet = () => _SS.getName();
    }
    class Index {
        // This becomes an object model of the Index structure for each Spreadsheet
        public readonly of: {[key: string]: {[key: string]: ColumnIndex}} = {};

        constructor(spreadID: string, props: GoogleAppsScript.Properties.Properties) {
            _id = spreadID;
            _SS = SpreadsheetApp.openById(_id);
            _propPrefix = 'Index' + _SS.getName().split(': ')[1].split(' ')[0];
            _props = props;
            _info = {};
            const storedInfo = _propPrefix + '.info';
            const indexes = Object.keys(props.getProperties()).filter(prop => prop.startsWith(_propPrefix));
            indexes.forEach(index => _sheets.add(index.split('.')[1]));

            if (indexes.includes(storedInfo)) {
                _info = JSON.parse(props.getProperty(storedInfo) as string);
                indexes.splice(indexes.indexOf(storedInfo), 1);
            }
            else {
                _info = { prefix: _propPrefix, id: _id };
                _props.setProperty(storedInfo, JSON.stringify(_info));
            }
            if (_info.prefix !== _propPrefix) console.warn('Index mismatch!', _info.prefix, _propPrefix);
            
            // Builds the object model
            for (const sheet of _sheets) {
                this.of[sheet] = {};
                const columns = indexes.filter(prop => prop.startsWith(`${_propPrefix}.${sheet}`));
                columns.forEach(column => {
                    const routes = column.split('.');
                    const [colName, colA1] = [routes.at(-2), routes.at(-1)];
                    if (!colName || !colA1) return;
                    _columns.set(sheet + colName, { colName: colName, colA1: colA1, index: JSON.parse(props.getProperty(column)!) });
                    this.of[sheet][colName] = new ColumnIndex(sheet, colName, colA1);
                });
            }
        }
        public getInfo = () => _info;
        public getSheets = () => Array.from(_sheets);
        public getColumns = (sheet: string) => Object.keys(this.of[sheet]);
    }
    return Index;
})();

function indexTests() {
    const Props = PropertiesService.getScriptProperties();
    Props.deleteProperty('Index.info');
    Props.deleteProperty('Index.Leads.Jobs.B2');
    Props.setProperty('IndexLeads.Leads.Jobs.B2', '["283823873873"]');
    const index = new Index(getFWDBLeads(), Props)
    console.log(index.getInfo());
    console.log(index.getSheets());
    console.log(index.getColumns('Leads'));
    console.log(index.of.Leads.Jobs);
    console.log(index.of.Leads.Jobs.spreadsheet());
    console.log(index.of.Leads.Jobs.get()!);
}