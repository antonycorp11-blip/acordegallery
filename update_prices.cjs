
const fs = require('fs');
const path = require('path');

const filePath = '/Users/aquillesantonysantiagosantos/Downloads/galeria-de-jogos-dos-alunos/constants.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Regex to find price: NUMBER
content = content.replace(/price: (\d+)/g, (match, price) => {
    const newPrice = Math.round((parseInt(price) * 1.4) / 10) * 10;
    return `price: ${newPrice}`;
});

fs.writeFileSync(filePath, content);
console.log('Prices updated successfully by 40%.');
