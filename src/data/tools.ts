import type { Category } from '../types/tools';

export const categories: Category[] = [
  {
    id: 'pdf',
    name: 'PDF Tools',
    icon: 'FileText',
    color: 'text-red-400',
    tools: [
      { id: 'merge-pdf', name: 'Merge PDFs', description: 'Combine multiple PDFs into one file', category: 'pdf' },
      { id: 'split-pdf', name: 'Split PDF', description: 'Extract specific pages or split into individual files', category: 'pdf' },
      { id: 'compress-pdf', name: 'Compress PDF', description: 'Reduce PDF file size by compressing images', category: 'pdf' },
      { id: 'rotate-reorder-pdf', name: 'Rotate & Reorder Pages', description: 'Rearrange and rotate individual PDF pages', category: 'pdf' },
      { id: 'add-page-numbers', name: 'Add Page Numbers', description: 'Insert page numbers into any PDF', category: 'pdf' },
      { id: 'password-protect-pdf', name: 'Password Protect PDF', description: 'Encrypt a PDF with a password', category: 'pdf' },
      { id: 'remove-pdf-password', name: 'Remove PDF Password', description: 'Unlock a password-protected PDF', category: 'pdf' },
      { id: 'extract-images-pdf', name: 'Extract Images from PDF', description: 'Pull all embedded images out of a PDF', category: 'pdf' },
    ],
  },
  {
    id: 'image',
    name: 'Image Tools',
    icon: 'Image',
    color: 'text-emerald-400',
    tools: [
      { id: 'compress-image', name: 'Compress Image', description: 'Reduce image file size with quality control', category: 'image' },
      { id: 'convert-image', name: 'Convert Image Format', description: 'Convert between JPG, PNG, WebP, BMP', category: 'image' },
      { id: 'resize-image', name: 'Resize Image', description: 'Scale images to exact dimensions', category: 'image' },
      { id: 'strip-exif', name: 'Strip Image Metadata (EXIF)', description: 'Remove GPS, camera, and timestamp data from photos', category: 'image' },
      { id: 'image-to-pdf', name: 'Convert Image to PDF', description: 'Turn images into a multi-page PDF', category: 'image' },
    ],
  },
  {
    id: 'files',
    name: 'File & Archive Tools',
    icon: 'Archive',
    color: 'text-blue-400',
    tools: [
      { id: 'create-zip', name: 'Create ZIP Archive', description: 'Bundle multiple files into a ZIP', category: 'files' },
      { id: 'extract-zip', name: 'Extract ZIP', description: 'Unpack and browse ZIP contents', category: 'files' },
      { id: 'file-size-analyser', name: 'File Size Analyser', description: 'Inspect file sizes, types, and dates', category: 'files' },
    ],
  },
  {
    id: 'text',
    name: 'Text & Data Tools',
    icon: 'Type',
    color: 'text-teal-400',
    tools: [
      { id: 'word-counter', name: 'Word & Character Counter', description: 'Count words, characters, sentences, and reading time', category: 'text' },
      { id: 'find-replace', name: 'Find & Replace', description: 'Search and replace text with regex support', category: 'text' },
      { id: 'remove-duplicates', name: 'Remove Duplicate Lines', description: 'Eliminate repeated lines from text', category: 'text' },
      { id: 'text-diff', name: 'Text Diff Checker', description: 'Compare two texts line by line', category: 'text' },
      { id: 'csv-diff', name: 'CSV Diff Checker', description: 'Compare two CSV files by cell values', category: 'text' },
      { id: 'json-formatter', name: 'JSON Formatter & Validator', description: 'Beautify, minify, and validate JSON', category: 'text' },
      { id: 'csv-json-converter', name: 'CSV / JSON Converter', description: 'Convert between CSV and JSON formats', category: 'text' },
      { id: 'base64', name: 'Base64 Encode / Decode', description: 'Encode or decode text and files in Base64', category: 'text' },
      { id: 'csv-encoding-fixer', name: 'CSV Encoding Fixer', description: 'Fix garbled characters from encoding mismatches', category: 'text' },
    ],
  },
  {
    id: 'privacy',
    name: 'Privacy & Security',
    icon: 'Shield',
    color: 'text-amber-400',
    tools: [
      { id: 'strip-metadata', name: 'Strip File Metadata', description: 'Remove author, GPS, and tracking data from files', category: 'privacy' },
      { id: 'sha256-hash', name: 'SHA-256 File Hash', description: 'Generate cryptographic file checksums', category: 'privacy' },
      { id: 'magic-byte-checker', name: 'File Signature Checker', description: 'Verify true file type via magic bytes', category: 'privacy' },
      { id: 'encrypt-decrypt-text', name: 'Encrypt / Decrypt Text', description: 'AES-256-GCM text encryption with passphrase', category: 'privacy' },
      { id: 'qr-code-generator', name: 'QR Code Generator', description: 'Generate QR codes locally', category: 'privacy' },
      { id: 'password-generator', name: 'Strong Password Generator', description: 'Cryptographically secure random passwords', category: 'privacy' },
    ],
  },
  {
    id: 'calculators',
    name: 'Calculators & Converters',
    icon: 'Calculator',
    color: 'text-sky-400',
    tools: [
      { id: 'unit-converter', name: 'Unit Converter', description: 'Convert length, weight, temperature, and more', category: 'calculators' },
      { id: 'date-difference', name: 'Date Difference Calculator', description: 'Calculate time between two dates', category: 'calculators' },
      { id: 'unix-timestamp', name: 'Unix Timestamp Converter', description: 'Convert between Unix timestamps and dates', category: 'calculators' },
      { id: 'file-size-converter', name: 'File Size Unit Converter', description: 'Convert between B, KB, MB, GB, TB', category: 'calculators' },
    ],
  },
  {
    id: 'developer',
    name: 'Developer Tools',
    icon: 'Code2',
    color: 'text-cyan-400',
    tools: [
      { id: 'regex-tester', name: 'Regex Tester', description: 'Test and debug regular expressions live', category: 'developer' },
      { id: 'jwt-decoder', name: 'JWT Decoder', description: 'Decode and inspect JSON Web Tokens', category: 'developer' },
      { id: 'color-picker', name: 'Colour Picker & Converter', description: 'Convert between HEX, RGB, and HSL', category: 'developer' },
    ],
  },
];

export const allTools = categories.flatMap((c) => c.tools);

export function findTool(id: string) {
  return allTools.find((t) => t.id === id);
}

export function findCategory(id: string) {
  return categories.find((c) => c.id === id);
}
