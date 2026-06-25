const XLSX = require('xlsx');

const workbook = XLSX.readFile('/workspaces/KTB/data/Audit log.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Columns:", Object.keys(data[0] || {}));

const spread1 = data.filter(r => r['Event Type'] === 'SYSTEM_INITIAL_PROCESSING');
const spread2 = data.filter(r => r['Event Type'] === 'SYSTEM_SCHEDULED_REPROCESSING' || r['Event Type'] === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2');

console.log("\nSample SYSTEM_INITIAL_PROCESSING (Spread 1):");
console.log(spread1.slice(0, 5).map(r => ({ Time: r['Time'], User: r['User'], EventType: r['Event Type'], Message: r['Message'] })));

console.log("\nSample SYSTEM_SCHEDULED_REPROCESSING (Spread 2):");
console.log(spread2.slice(0, 5).map(r => ({ Time: r['Time'], User: r['User'], EventType: r['Event Type'], Message: r['Message'] })));
