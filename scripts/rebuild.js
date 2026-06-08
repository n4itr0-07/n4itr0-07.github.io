const fs = require('fs');
const path = require('path');

const WRITEUPS_DIR = path.join(__dirname, '..', 'writeups');
const OUTPUT_FILE = path.join(__dirname, '..', 'writeups.json');

// Helper to map directory names to display categories
const CATEGORY_MAP = {
    'tryhackme': 'TryHackMe',
    'hackthebox': 'HackTheBox',
    'ctf': 'CTFs',
    'blog': 'Blogs & Articles'
};

// Recursive file scanner
function getMarkdownFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) {
        return results;
    }
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getMarkdownFiles(filePath));
        } else if (file.endsWith('.md') && file !== 'template.md') {
            results.push(filePath);
        }
    });
    return results;
}

// Lightweight Markdown front-matter parser (zero-dependency YAML-like parser)
function parseFrontMatter(content) {
    const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)/);
    if (!match) {
        return { metadata: {}, body: content };
    }
    
    const yamlText = match[1];
    const body = match[2];
    const metadata = {};
    
    yamlText.split(/\r?\n/).forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim();
            const value = line.substring(colonIdx + 1).trim();
            
            if (key === 'tags') {
                metadata[key] = value.split(',')
                    .map(t => t.trim())
                    .filter(Boolean);
            } else {
                // Remove surrounding quotes if present
                metadata[key] = value.replace(/^['"]|['"]$/g, '');
            }
        }
    });
    
    return { metadata, body };
}

function rebuild() {
    console.log('Scanning writeups directory...');
    const files = getMarkdownFiles(WRITEUPS_DIR);
    console.log(`Found ${files.length} markdown files.`);

    const writeups = [];
    const allTagsSet = new Set();

    files.forEach(filePath => {
        const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
        const content = fs.readFileSync(filePath, 'utf8');
        const { metadata } = parseFrontMatter(content);

        // Determine Category based on folder structure
        const parentDir = path.basename(path.dirname(filePath)).toLowerCase();
        const category = CATEGORY_MAP[parentDir] || parentDir.charAt(0).toUpperCase() + parentDir.slice(1);
        const categoryId = parentDir;

        // Auto-generate missing metadata
        const id = path.basename(filePath, '.md');
        const title = metadata.title || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const date = metadata.date || new Date().toISOString().split('T')[0];
        const tags = metadata.tags || [];
        const difficulty = metadata.difficulty || 'N/A';
        const summary = metadata.summary || 'No summary available.';

        tags.forEach(tag => allTagsSet.add(tag.toLowerCase()));

        writeups.push({
            id,
            title,
            category,
            categoryId,
            date,
            tags,
            difficulty,
            summary,
            path: relativePath
        });
    });

    // Sort writeups by date descending (newest first)
    writeups.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Structure output
    const outputData = {
        lastUpdated: new Date().toISOString(),
        tags: Array.from(allTagsSet).sort(),
        writeups: writeups
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`Successfully compiled metadata for ${writeups.length} writeups into ${OUTPUT_FILE}`);
}

rebuild();
