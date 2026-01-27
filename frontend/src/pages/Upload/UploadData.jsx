import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Title,
  TextLabel,
  Button,
  Loader,
  StackingLayout,
  TextInput,
  TextArea,
} from '@nutanix-ui/prism-reactjs';
import * as XLSX from 'xlsx';
import { uploadReport } from '../../redux/slices/reportsSlice';
import styles from './UploadData.module.css';

function UploadData() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [caseNumbers, setCaseNumbers] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { uploading, error } = useSelector((state) => state.reports);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await dispatch(uploadReport(selectedFile)).unwrap();
      navigate(`/dashboard/${result.id}/action-center`);
    } catch {
      // For demo purposes, navigate anyway with a mock ID
      navigate('/dashboard/demo-report-1');
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const canProceed = Boolean(selectedFile);
  const showPreview = Boolean(selectedFile);
  const previewLimit = 12;
  const previewCases = caseNumbers.slice(0, previewLimit);

  const parseCsvRows = (text) => {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else if (char === '\n' && !inQuotes) {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else if (char !== '\r') {
        current += char;
      }
    }

    if (current.length > 0 || row.length > 0) {
      row.push(current);
      rows.push(row);
    }

    return rows;
  };

  const extractCaseNumbers = (rows) => {
    if (!rows.length) return [];
    const headerRow = rows[0].map((value) => String(value).trim());
    const caseIndex = headerRow.findIndex(
      (header) => header.toLowerCase() === 'case number',
    );
    if (caseIndex === -1) return [];

    const values = rows
      .slice(1)
      .map((row) => String(row[caseIndex] ?? '').trim())
      .filter(Boolean);

    return Array.from(new Set(values));
  };

  useEffect(() => {
    if (!selectedFile) {
      setCaseNumbers([]);
      setPreviewError('');
      setIsParsing(false);
      return;
    }

    const fileName = selectedFile.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    setIsParsing(true);
    setPreviewError('');

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let rows = [];
        if (isCsv) {
          rows = parseCsvRows(String(event.target?.result ?? ''));
        } else if (isExcel) {
          const workbook = XLSX.read(event.target?.result, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        } else {
          throw new Error('Unsupported file type');
        }

        const extracted = extractCaseNumbers(rows);
        if (!extracted.length) {
          setPreviewError('No "Case Number" field found in the uploaded file.');
        }
        setCaseNumbers(extracted);
      } catch {
        setPreviewError('Unable to read case numbers from this file.');
        setCaseNumbers([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setPreviewError('Unable to read this file.');
      setCaseNumbers([]);
      setIsParsing(false);
    };

    if (isCsv) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  }, [selectedFile]);

  return (
    <div className={styles.uploadPage}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <Title size="h2" className={styles.pageTitle}>Create New Report</Title>
          <Button type="primary" onClick={() => navigate('/reports')}>
            My Reports
          </Button>
        </div>
        <TextLabel type="secondary">
          Select a data source to begin your case review and analysis.
        </TextLabel>
      </div>

      <div className={styles.sourceCards}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>📤</div>
            <div>
              <Title size="h4">Upload CSV File</Title>
              <TextLabel type="secondary">Import local data from your computer.</TextLabel>
            </div>
          </div>

          <StackingLayout itemSpacing="16px" className={styles.inputStack}>
            <div className={styles.inputGroup}>
              <TextLabel className={styles.inputLabel}>NAME</TextLabel>
              <TextInput
                className={styles.textInput}
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Add a report name"
              />
            </div>
            <div className={styles.inputGroup}>
              <TextLabel className={styles.inputLabel}>DESCRIPTION</TextLabel>
              <TextArea
                className={styles.textInput}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Add a short description"
                rows={3}
              />
            </div>
          </StackingLayout>

          <div
            className={`${styles.dropZone} ${dragActive ? styles.active : ''} ${selectedFile ? styles.hasFile : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />

            {selectedFile ? (
              <div className={styles.dropContent}>
                <span className={styles.fileIcon}>📄</span>
                <TextLabel className={styles.fileName}>{selectedFile.name}</TextLabel>
                <TextLabel type="secondary">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </TextLabel>
              </div>
            ) : (
              <div className={styles.dropContent}>
                <span className={styles.uploadIcon}>☁️</span>
                <TextLabel>Drag and drop file here</TextLabel>
                <TextLabel type="secondary">
                  or <span className={styles.browseLink}>Browse files</span>
                </TextLabel>
                <TextLabel type="secondary" className={styles.supportedFormats}>
                  MAXIMUM SIZE: 50MB
                </TextLabel>
              </div>
            )}
          </div>

          <div className={styles.alternateNote}>
            <span className={styles.infoIcon}>i</span>
            <TextLabel type="secondary">
              You can also connect using a Salesforce Report ID from your instance.
            </TextLabel>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div>
              <Title size="h4">Preview of Case Numbers</Title>
              <TextLabel type="secondary">
                Showing a sample so you can confirm the report uploaded correctly.
              </TextLabel>
            </div>
            <TextLabel className={styles.previewMeta}>
              {caseNumbers.length
                ? `Showing ${previewCases.length} of ${caseNumbers.length}`
                : 'No case numbers found'}
            </TextLabel>
          </div>
          {isParsing && (
            <div className={styles.previewState}>
              <Loader size="small" />
              <TextLabel type="secondary">Reading file...</TextLabel>
            </div>
          )}
          {!isParsing && previewError && (
            <TextLabel className={styles.previewError}>{previewError}</TextLabel>
          )}
          {!isParsing && !previewError && (
            <div className={styles.previewList}>
              {previewCases.map((caseId) => (
                <div key={caseId} className={styles.previewItem}>
                  {caseId}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.bottomBar}>
        <div className={styles.helpText}>
          <span className={styles.infoIcon}>?</span>
          <TextLabel type="secondary">
            Need help choosing? <span className={styles.link}>View documentation.</span>
          </TextLabel>
        </div>

        <div className={styles.actions}>
          <Button type="secondary" onClick={() => navigate('/reports')}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={!canProceed || uploading}
          >
            {uploading ? (
              <span className={styles.loaderInline}>
                <Loader size="small" />
                <span>Processing...</span>
              </span>
            ) : (
              'Proceed to Analysis'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <TextLabel className={styles.errorText}>
          Error: {typeof error === 'string' ? error : 'Upload failed'}
        </TextLabel>
      )}

      <div className={styles.recentSection}>
        <Title size="h4">Recently Connected Sources</Title>
        <div className={styles.recentGrid}>
          {[
            { name: 'Q4_Support_Cases.csv', meta: 'Uploaded 2h ago', type: 'csv' },
            { name: 'Critical High-Priority (SF)', meta: 'Fetched Yesterday', type: 'sf' },
            { name: 'Customer_Feedback_2023.csv', meta: 'Uploaded 3d ago', type: 'csv' },
          ].map((source) => (
            <div key={source.name} className={styles.recentCard}>
              <div className={styles.recentIcon}>{source.type === 'sf' ? '🗄️' : '📄'}</div>
              <div>
                <TextLabel className={styles.recentName}>{source.name}</TextLabel>
                <TextLabel type="secondary">{source.meta}</TextLabel>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UploadData;
