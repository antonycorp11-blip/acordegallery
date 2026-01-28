
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'constants.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the interface definition error
content = content.replace(/price:\s*\*\s*1\.5number;/g, 'price: number;');

// Fix the item prices: replace "price: X * 1.5" with "price: Y"
content = content.replace(/price:\s*(\d+)\s*\*\s*1\.5/g, (match, p1) => {
    const originalPrice = parseInt(p1, 10);
    const newPrice = originalPrice * 1.5;
    return `price: ${newPrice}`;
});

fs.writeFileSync(filePath, content);
console.log('Fixed constants.ts');
