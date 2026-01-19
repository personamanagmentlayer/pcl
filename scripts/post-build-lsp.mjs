#!/usr/bin/env node
/**
 * Post-build script for LSP server
 * Adds shebang to the built LSP server file
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lspServerPath = join(__dirname, '..', 'dist', 'lsp', 'server.js');

try {
  const content = readFileSync(lspServerPath, 'utf8');

  // Add shebang if not present
  if (!content.startsWith('#!')) {
    const newContent = '#!/usr/bin/env node\n' + content;
    writeFileSync(lspServerPath, newContent, 'utf8');
    console.log('✅ Added shebang to dist/lsp/server.js');
  } else {
    console.log('✅ Shebang already present in dist/lsp/server.js');
  }
} catch (error) {
  console.error('❌ Error adding shebang:', error.message);
  process.exit(1);
}
