import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Title,
  TextLabel,
  Button,
  Loader,
  TextInput,
  TextArea,
  VerticalSeparator,
  DatePicker,
  FlexLayout,
  FlexItem,
  Divider,
} from '@nutanix-ui/prism-reactjs';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { uploadReport } from '../../redux/slices/reportsSlice';
import styles from './UploadData.module.css';

function UploadData() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportComponent, setReportComponent] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isProceeding, setIsProceeding] = useState(false);
  const fileInputRef = useRef(null);
  const proceedTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { uploading, error } = useSelector(state => state.reports);

  const handleDrag = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = e => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await dispatch(uploadReport(selectedFile)).unwrap();
      message.success('Report uploaded successfully.');
      navigate(`/dashboard/${result.id}/action-center`);
    } catch {
      // For demo purposes, navigate anyway with a mock ID
      navigate('/dashboard/demo-report-1');
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const isLeftPanelComplete =
    Boolean(reportName.trim())
    && Boolean(reportDescription.trim())
    && Boolean(reportComponent.trim())
    && Boolean(dateRangeStart)
    && Boolean(dateRangeEnd)
    && Boolean(accountName.trim());
  const canProceed = isLeftPanelComplete || Boolean(selectedFile);
  const showPreview = Boolean(selectedFile);
  const previewRowLimit = 5;
  const previewSampleRows = previewRows.slice(0, previewRowLimit);

  const handleProceed = () => {
    if (!canProceed || isProceeding) return;
    setIsProceeding(true);
    if (proceedTimeoutRef.current) {
      clearTimeout(proceedTimeoutRef.current);
    }
    proceedTimeoutRef.current = setTimeout(() => {
      if (selectedFile) {
        handleUpload();
      } else {
        navigate('/dashboard/demo-report-1');
      }
      setIsProceeding(false);
    }, 10000);
  };

  const parseCsvRows = text => {
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

  useEffect(() => {
    if (!selectedFile) {
      setPreviewHeaders([]);
      setPreviewRows([]);
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

    reader.onload = event => {
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

        if (rows.length > 0) {
          const headerRow = rows[0].map(value => String(value ?? '').trim());
          const dataRows = rows.slice(1);
          setPreviewHeaders(headerRow);
          setPreviewRows(dataRows);
        } else {
          setPreviewHeaders([]);
          setPreviewRows([]);
        }
      } catch {
        setPreviewError('Unable to read rows from this file.');
        setPreviewHeaders([]);
        setPreviewRows([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setPreviewError('Unable to read this file.');
      setPreviewHeaders([]);
      setPreviewRows([]);
      setIsParsing(false);
    };

    if (isCsv) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  }, [selectedFile]);

  useEffect(() => () => {
    if (proceedTimeoutRef.current) {
      clearTimeout(proceedTimeoutRef.current);
    }
  }, []);

  return (
    <Loader
      loading={isProceeding}
      tip="Loading..."
      aria-live="polite"
      style={{ height: '100%' }}
    >
      <div className={styles.uploadPage}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <Title size="h2" className={styles.pageTitle}>
            Create New Report
          </Title>
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
              <Title size="h3">Select Data Source</Title>
              <TextLabel type="secondary">Choose how you want to create this report.</TextLabel>
            </div>
          </div>

          <FlexLayout>
            <FlexItem className={styles.leftPanel}>
              <Title size="h2">Fetch Cases</Title>
              <TextLabel type="secondary">Use filters to pull cases directly</TextLabel>
              <Divider className={styles.sectionDivider} />
              <FlexLayout alignItems="stretch" flexDirection="column" className={styles.inputStack}>
                <FlexItem className={styles.inputGroup}>
                  <TextLabel className={styles.inputLabel}>Name</TextLabel>
                  <TextInput
                    className={styles.textInput}
                    value={reportName}
                    onChange={e => setReportName(e.target.value)}
                    placeholder="Add a report name"
                  />
                </FlexItem>
                <FlexItem className={styles.inputGroup}>
                  <TextLabel className={styles.inputLabel}>Description</TextLabel>
                  <TextArea
                    className={styles.textInput}
                    value={reportDescription}
                    onChange={e => setReportDescription(e.target.value)}
                    placeholder="Add a short description"
                    rows={3}
                  />
                </FlexItem>
                <FlexItem className={styles.inputGroup}>
                  <TextLabel className={styles.inputLabel}>Component</TextLabel>
                  <TextInput
                    className={styles.textInput}
                    value={reportComponent}
                    onChange={e => setReportComponent(e.target.value)}
                    placeholder="e.g. Storage, Networking"
                  />
                </FlexItem>
                <FlexItem className={styles.inputGroup}>
                  <TextLabel className={styles.inputLabel}>Date Range</TextLabel>
                  <FlexLayout alignItems="stretch" itemSpacing="15px" className={styles.inputStack}>
                    <DatePicker
                      oldDatePicker={false}
                      onChange={date => setDateRangeStart(date)}
                      value={dateRangeStart}
                    />
                    <DatePicker
                      oldDatePicker={false}
                      onChange={date => setDateRangeEnd(date)}
                      value={dateRangeEnd}
                    />
                  </FlexLayout>
                </FlexItem>
                <FlexItem className={styles.inputGroup}>
                  <TextLabel className={styles.inputLabel}>Account</TextLabel>
                  <TextInput
                    className={styles.textInput}
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="Search account name"
                  />
                </FlexItem>
              </FlexLayout>
            </FlexItem>

            <VerticalSeparator size="large" />

            <FlexItem className={styles.rightPanel}>
              <Title size="h2">Upload CSV File</Title>
              <TextLabel type="secondary" className={styles.panelSubtext}>
                Import local data from your computer.
              </TextLabel>
              <Divider className={styles.sectionDivider} />
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

              {/* <div className={styles.alternateNote}>
                <span className={styles.infoIcon}>i</span>
                <TextLabel type="secondary">
                  You can also connect using a Salesforce Report ID from your instance.
                </TextLabel>
              </div> */}
            </FlexItem>
          </FlexLayout>
        </div>
      </div>

      {/* {showPreview && (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div>
              <Title size="h4">Preview of Case Numbers</Title>
              <TextLabel type="secondary">
                Showing a sample so you can confirm the report uploaded correctly.
              </TextLabel>
            </div>
            <TextLabel className={styles.previewMeta}>
              {previewRows.length
                ? `Showing ${previewSampleRows.length} of ${previewRows.length} rows`
                : 'No preview rows found'}
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
            <div className={styles.previewTable}>
              <div className={styles.previewTableHeader}>
                {previewHeaders.map(header => (
                  <div key={header} className={styles.previewCell}>
                    {header || 'Field'}
                  </div>
                ))}
              </div>
              <div className={styles.previewTableBody}>
                {previewSampleRows.map((row, rowIndex) => (
                  <div key={`row-${rowIndex}`} className={styles.previewTableRow}>
                    {previewHeaders.map((header, colIndex) => (
                      <div key={`${header}-${rowIndex}-${colIndex}`} className={styles.previewCell}>
                        {String(row[colIndex] ?? '')}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )} */}

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
            onClick={handleProceed}
            disabled={!canProceed || uploading || isProceeding}
          >
            {uploading || isProceeding ? (
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

      {/* <div className={styles.recentSection}>
        <Title size="h4">Recently Connected Sources</Title>
        <div className={styles.recentGrid}>
          {[
            { name: 'Q4_Support_Cases.csv', meta: 'Uploaded 2h ago', type: 'csv' },
            { name: 'Critical High-Priority (SF)', meta: 'Fetched Yesterday', type: 'sf' },
            { name: 'Customer_Feedback_2023.csv', meta: 'Uploaded 3d ago', type: 'csv' },
          ].map(source => (
            <div key={source.name} className={styles.recentCard}>
              <div className={styles.recentIcon}>{source.type === 'sf' ? '🗄️' : '📄'}</div>
              <div>
                <TextLabel className={styles.recentName}>{source.name}</TextLabel>
                <TextLabel type="secondary">{source.meta}</TextLabel>
              </div>
            </div>
          ))}
        </div>
      </div> */}
      </div>
    </Loader>
  );
}

export default UploadData;
