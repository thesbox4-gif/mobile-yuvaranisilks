const fs = require('fs');
const path = require('path');

const files = [
  'src/components/orders/ShipmentSheet.jsx',
  'src/components/orders/StatusUpdateSheet.jsx',
  'src/lib/pickImage.js',
  'src/screens/categories/CategoriesScreen.jsx',
  'src/screens/coupons/CouponsScreen.jsx',
  'src/screens/employees/EmployeesScreen.jsx',
  'src/screens/products/ProductDetailScreen.jsx',
  'src/screens/products/ProductsScreen.jsx',
  'src/screens/products/wizard/ProductWizardScreen.jsx',
  'src/screens/products/wizard/Step2Images.jsx',
  'src/screens/products/wizard/Step4Content.jsx',
  'src/screens/products/wizard/StepAIGenerate.jsx',
  'src/screens/products/wizard/StepContent.jsx',
  'src/screens/products/wizard/StepPhotos.jsx',
  'src/screens/profile/ProfileScreen.jsx',
  'src/screens/team/TeamScreen.jsx',
  'src/screens/users/CreateUserScreen.jsx'
];

files.forEach(f => {
  let file = f.replace(/\\/g, '/');
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('Alert.alert')) return;

  // Calculate relative path to src/lib/dialog
  const depth = file.split('/').length - 2;
  let importPath = '';
  if (depth === 1) importPath = '../lib/dialog';
  else if (depth === 2) importPath = '../../lib/dialog';
  else if (depth === 3) importPath = '../../../lib/dialog';
  else importPath = '../../../../lib/dialog';

  if (!content.includes('alertDialog')) {
    const importStatement = `import { alertDialog } from '${importPath}';\n`;
    const lines = content.split('\n');
    for (let i=0; i<lines.length; i++) {
      if (lines[i].startsWith('import ') && lines[i].includes('react-native')) {
        lines[i] = lines[i].replace('Alert,', '').replace('Alert', '').replace('{ ,', '{ ').replace(', }', ' }').replace('{  }', '');
        if (lines[i].trim() === "import from 'react-native';" || lines[i].trim() === "import {} from 'react-native';") {
          lines[i] = '';
        }
      }
    }
    content = lines.join('\n');
    
    const allLines = content.split('\n');
    let lastImportIdx = 0;
    for (let i=0; i<allLines.length; i++) {
      if (allLines[i].startsWith('import ')) {
        lastImportIdx = i;
      }
    }
    allLines.splice(lastImportIdx + 1, 0, importStatement);
    content = allLines.join('\n');
  }

  content = content.replace(/Alert\.alert\(/g, 'alertDialog(');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated', file);
});
