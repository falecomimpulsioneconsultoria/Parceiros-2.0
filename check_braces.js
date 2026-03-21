const fs = require('fs');
const content = fs.readFileSync('c:/Users/MyDeLL/Downloads/Parceiros2.0/Parceiros-2.0/src/pages/ClientsPage.tsx', 'utf8');
let stack = [];
let line = 1;
let col = 1;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '\n') {
    line++;
    col = 1;
  } else {
    col++;
  }

  if (char === '{') {
    stack.push({ line, col });
  } else if (char === '}') {
    if (stack.length === 0) {
      console.log(`Extra closing brace at ${line}:${col}`);
    } else {
      stack.pop();
    }
  }
}

if (stack.length > 0) {
  console.log(`Unclosed braces: ${stack.length}`);
  stack.forEach(b => console.log(`Unclosed brace at ${b.line}:${b.col}`));
} else {
  console.log('Braces are balanced!');
}
