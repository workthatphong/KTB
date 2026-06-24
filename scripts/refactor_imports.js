const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'frontend/src');

const replacements = {
  '@/hooks/useDashboardData.js': '@/features/dashboard/hooks/useDashboardData.js',
  '@/hooks/useDashboardDataFetching.js': '@/features/dashboard/hooks/useDashboardDataFetching.js',
  '@/hooks/useDashboardDataState.js': '@/features/dashboard/hooks/useDashboardDataState.js',
  '@/hooks/useDashboardFilterState.js': '@/features/dashboard/hooks/useDashboardFilterState.js',
  '@/lib/kpiUtils.js': '@/features/dashboard/utils/kpiUtils.js',
  '@/lib/segmentUtils.js': '@/features/dashboard/utils/segmentUtils.js',
  
  '@/hooks/useDashboardData': '@/features/dashboard/hooks/useDashboardData',
  '@/hooks/useDashboardDataFetching': '@/features/dashboard/hooks/useDashboardDataFetching',
  '@/hooks/useDashboardDataState': '@/features/dashboard/hooks/useDashboardDataState',
  '@/hooks/useDashboardFilterState': '@/features/dashboard/hooks/useDashboardFilterState',
  '@/lib/kpiUtils': '@/features/dashboard/utils/kpiUtils',
  '@/lib/segmentUtils': '@/features/dashboard/utils/segmentUtils',
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) walk(dirPath, callback);
    else callback(dirPath);
  });
}

walk(srcDir, (filePath) => {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  for (const [oldPath, newPath] of Object.entries(replacements)) {
    const singleQuoteOld = `from '${oldPath}'`;
    const doubleQuoteOld = `from "${oldPath}"`;
    const singleQuoteNew = `from '${newPath}'`;
    const doubleQuoteNew = `from "${newPath}"`;
    
    if (content.includes(singleQuoteOld)) {
      content = content.replaceAll(singleQuoteOld, singleQuoteNew);
      changed = true;
    }
    if (content.includes(doubleQuoteOld)) {
      content = content.replaceAll(doubleQuoteOld, doubleQuoteNew);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated alias imports in ${filePath}`);
  }
});
