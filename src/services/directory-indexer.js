const BaseService = require('../core/base-service');
const DataManager = require('../core/data-manager');
const path = require('path');

class DirectoryIndexer extends BaseService {
  constructor() {
    super('DirectoryIndexer');
    this.dataManager = new DataManager();
  }

  async run() {
    this.generateIndex('./data');
    return { message: 'Directory indexes generated successfully' };
  }

  generateIndex(root, relativePath = '') {
    const fullPath = path.join(root, relativePath);
    this.logger.info(`Generating index for: ${fullPath}`);
    
    const contents = this.dataManager.list(fullPath, (item) => 
      item.isDirectory() || 
      (/\./.test(item.name) && item.name !== 'index.html' && !item.name.startsWith('.'))
    );

    // Sort directories first, then files
    contents.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    const html = this.generateHTML(contents, fullPath);
    this.dataManager.write(path.join(fullPath, 'index.html'), html, { formatted: false });

    // Recursively generate indexes for subdirectories
    contents
      .filter(item => item.isDirectory)
      .forEach(dir => {
        this.generateIndex(root, path.join(relativePath, dir.name));
      });
  }

  generateHTML(contents, currentPath) {
    const items = contents.map(item => {
      if (item.isDirectory) {
        return `<li><a href="./${item.name}">📂 ${item.name}</a></li>`;
      } else {
        const fs = require('fs');
        const { size } = fs.statSync(item.path);
        return `<li><a href="./${item.name}">📄 ${item.name}</a> ${size}b</li>`;
      }
    }).join('');

    return `<!DOCTYPE html>
<style>*{font-family: sans-serif}a{text-decoration: none}</style>
<p><a href="../">↖️ Parent</a></p>
<ul>${items}</ul>`;
  }
}

module.exports = DirectoryIndexer;