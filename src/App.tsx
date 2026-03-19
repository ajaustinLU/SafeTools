import { useState, lazy, Suspense } from 'react';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import HomePage from './components/home/HomePage';

const MergePdf = lazy(() => import('./tools/pdf/MergePdf'));
const SplitPdf = lazy(() => import('./tools/pdf/SplitPdf'));
const CompressPdf = lazy(() => import('./tools/pdf/CompressPdf'));
const RotateReorderPdf = lazy(() => import('./tools/pdf/RotateReorderPdf'));
const AddPageNumbers = lazy(() => import('./tools/pdf/AddPageNumbers'));
const PasswordProtectPdf = lazy(() => import('./tools/pdf/PasswordProtectPdf'));
const RemovePdfPassword = lazy(() => import('./tools/pdf/RemovePdfPassword'));
const ExtractImagesPdf = lazy(() => import('./tools/pdf/ExtractImagesPdf'));

const CompressImage = lazy(() => import('./tools/image/CompressImage'));
const ConvertImageFormat = lazy(() => import('./tools/image/ConvertImageFormat'));
const ResizeImage = lazy(() => import('./tools/image/ResizeImage'));
const StripExif = lazy(() => import('./tools/image/StripExif'));
const ImageToPdf = lazy(() => import('./tools/image/ImageToPdf'));

const CreateZip = lazy(() => import('./tools/files/CreateZip'));
const ExtractZip = lazy(() => import('./tools/files/ExtractZip'));
const FileSizeAnalyser = lazy(() => import('./tools/files/FileSizeAnalyser'));

const WordCounter = lazy(() => import('./tools/text/WordCounter'));
const FindReplace = lazy(() => import('./tools/text/FindReplace'));
const RemoveDuplicates = lazy(() => import('./tools/text/RemoveDuplicates'));
const TextDiff = lazy(() => import('./tools/text/TextDiff'));
const CsvDiff = lazy(() => import('./tools/text/CsvDiff'));
const JsonFormatter = lazy(() => import('./tools/text/JsonFormatter'));
const CsvJsonConverter = lazy(() => import('./tools/text/CsvJsonConverter'));
const Base64Tool = lazy(() => import('./tools/text/Base64Tool'));
const CsvEncodingFixer = lazy(() => import('./tools/text/CsvEncodingFixer'));

const StripMetadata = lazy(() => import('./tools/privacy/StripMetadata'));
const Sha256Hash = lazy(() => import('./tools/privacy/Sha256Hash'));
const MagicByteChecker = lazy(() => import('./tools/privacy/MagicByteChecker'));
const EncryptDecryptText = lazy(() => import('./tools/privacy/EncryptDecryptText'));
const QrCodeGenerator = lazy(() => import('./tools/privacy/QrCodeGenerator'));
const PasswordGenerator = lazy(() => import('./tools/privacy/PasswordGenerator'));

const UnitConverter = lazy(() => import('./tools/calculators/UnitConverter'));
const DateDifference = lazy(() => import('./tools/calculators/DateDifference'));
const UnixTimestamp = lazy(() => import('./tools/calculators/UnixTimestamp'));
const FileSizeConverter = lazy(() => import('./tools/calculators/FileSizeConverter'));

const RegexTester = lazy(() => import('./tools/developer/RegexTester'));
const JwtDecoder = lazy(() => import('./tools/developer/JwtDecoder'));
const ColorPicker = lazy(() => import('./tools/developer/ColorPicker'));

const toolComponents: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  'merge-pdf': MergePdf,
  'split-pdf': SplitPdf,
  'compress-pdf': CompressPdf,
  'rotate-reorder-pdf': RotateReorderPdf,
  'add-page-numbers': AddPageNumbers,
  'password-protect-pdf': PasswordProtectPdf,
  'remove-pdf-password': RemovePdfPassword,
  'extract-images-pdf': ExtractImagesPdf,
  'compress-image': CompressImage,
  'convert-image': ConvertImageFormat,
  'resize-image': ResizeImage,
  'strip-exif': StripExif,
  'image-to-pdf': ImageToPdf,
  'create-zip': CreateZip,
  'extract-zip': ExtractZip,
  'file-size-analyser': FileSizeAnalyser,
  'word-counter': WordCounter,
  'find-replace': FindReplace,
  'remove-duplicates': RemoveDuplicates,
  'text-diff': TextDiff,
  'csv-diff': CsvDiff,
  'json-formatter': JsonFormatter,
  'csv-json-converter': CsvJsonConverter,
  'base64': Base64Tool,
  'csv-encoding-fixer': CsvEncodingFixer,
  'strip-metadata': StripMetadata,
  'sha256-hash': Sha256Hash,
  'magic-byte-checker': MagicByteChecker,
  'encrypt-decrypt-text': EncryptDecryptText,
  'qr-code-generator': QrCodeGenerator,
  'password-generator': PasswordGenerator,
  'unit-converter': UnitConverter,
  'date-difference': DateDifference,
  'unix-timestamp': UnixTimestamp,
  'file-size-converter': FileSizeConverter,
  'regex-tester': RegexTester,
  'jwt-decoder': JwtDecoder,
  'color-picker': ColorPicker,
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ActiveComponent = activeTool ? toolComponents[activeTool] : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onGoHome={() => setActiveTool(null)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {ActiveComponent ? (
            <Suspense fallback={<LoadingSpinner />}>
              <ActiveComponent />
            </Suspense>
          ) : (
            <HomePage onSelectTool={setActiveTool} />
          )}
        </main>
      </div>
    </div>
  );
}
