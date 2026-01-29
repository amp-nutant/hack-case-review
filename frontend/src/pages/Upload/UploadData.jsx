import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Title,
  TextLabel,
  Button,
  Loader,
  Input,
  TextArea,
  DatePicker,
  FlexLayout,
  FlexItem,
  Divider,
  Alert,
  FormItemProvider,
  StackingLayout,
  ChevronLeftIcon,
  ChevronRightIcon,
  UploadIcon,
  ReportIcon,
  CloseIcon,
  StatusTickMiniIcon,
  Link,
  FilterIcon,
  ImportIcon,
} from '@nutanix-ui/prism-reactjs';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { uploadReport } from '../../redux/slices/reportsSlice';
import { analysisApi } from '../../services/analysisApi';
import styles from './UploadData.module.css';

// Create form components with labels using FormItemProvider
const InputWithLabel = FormItemProvider(Input);
const TextAreaWithLabel = FormItemProvider(TextArea);
const DatePickerWithLabel = FormItemProvider(DatePicker);

// Data source options
const DATA_SOURCES = {
  FETCH_CASES: 'fetch_cases',
  UPLOAD_CSV: 'upload_csv',
};

function UploadData() {
  // Data source selection
  const [dataSource, setDataSource] = useState(null);
  
  // Form state for Fetch Cases
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportComponent, setReportComponent] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);
  const [accountName, setAccountName] = useState('');
  
  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  
  // Form validation state
  const [isDirty, setIsDirty] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);
  
  const fileInputRef = useRef(null);
  const proceedTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { uploading } = useSelector(state => state.reports);

  // Validation checks
  const isFetchCasesValid = useMemo(() => {
    return (
      Boolean(reportName.trim()) &&
      Boolean(reportComponent.trim()) &&
      Boolean(dateRangeStart) &&
      Boolean(dateRangeEnd)
    );
  }, [reportName, reportComponent, dateRangeStart, dateRangeEnd]);

  const isUploadCsvValid = useMemo(() => {
    return Boolean(selectedFile) && Boolean(reportName.trim());
  }, [selectedFile, reportName]);

  const canProceed = useMemo(() => {
    if (dataSource === DATA_SOURCES.FETCH_CASES) {
      return isFetchCasesValid;
    }
    if (dataSource === DATA_SOURCES.UPLOAD_CSV) {
      return isUploadCsvValid;
    }
    return false;
  }, [dataSource, isFetchCasesValid, isUploadCsvValid]);

  // File handling
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

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setPreviewError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleCancel = () => {
    setDataSource(null);
    setReportName('');
    setReportDescription('');
    setReportComponent('');
    setDateRangeStart(null);
    setDateRangeEnd(null);
    setAccountName('');
    setSelectedFile(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setPreviewError('');
    setIsParsing(false);
    setIsDirty(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProceed = () => {
    setIsDirty(true);
    if (!canProceed || isProceeding) return;
    
    setIsProceeding(true);
    if (proceedTimeoutRef.current) {
      clearTimeout(proceedTimeoutRef.current);
    }
    
    proceedTimeoutRef.current = setTimeout(async () => {
      try {
        if (dataSource === DATA_SOURCES.UPLOAD_CSV && selectedFile) {
          await handleUpload();
          return;
        }

        const response = await analysisApi.create({
          name: reportName.trim(),
          description: reportDescription.trim(),
          account: accountName.trim(),
          component: reportComponent.trim(),
          startDate: dateRangeStart,
          endDate: dateRangeEnd,
          cases: [],
        });

        message.success('Analysis created successfully.');
        navigate(`/dashboard/${response.data.id}/action-center`);
      } catch {
        message.error('Something went wrong!', 10);
      } finally {
        setIsProceeding(false);
      }
    }, 4000);
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

  // Parse file when selected
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

  // Render data source selection card
  const renderDataSourceCard = (type, title, description, icon) => {
    const isSelected = dataSource === type;

    return (
      <FlexItem flexGrow="1" flexBasis="0">
        <div
          className={`${styles.dataSourceCard} ${isSelected ? styles.dataSourceCardSelected : ''}`}
          onClick={() => setDataSource(type)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setDataSource(type)}
        >
          <FlexLayout flexDirection="column" itemSpacing="16px">
            <FlexLayout alignItems="center" itemGap="S" style={{ padding: '10px' }}>
              <div className={`${styles.dataSourceIcon} ${isSelected ? styles.dataSourceIconSelected : ''}`}>
                {icon}
              </div>
              <FlexLayout flexDirection="column" itemGap="S">
                <Title size="h3">{title}</Title>
                <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
                  {description}
                </TextLabel>
              </FlexLayout>
            </FlexLayout>
          </FlexLayout>
        </div>
      </FlexItem>
    );
  };

  // Render Fetch Cases form
  const renderFetchCasesForm = () => (
    <StackingLayout itemGap="S">
      <FlexLayout flexDirection="column" itemGap="S">
        <InputWithLabel
          label={<span>Report Name <span className={styles.required}>*</span></span>}
          value={reportName}
          onChange={e => setReportName(e.target.value)}
          placeholder="e.g., Q4 2025 Case Analysis"
          error={isDirty && !reportName.trim()}
          helpText={isDirty && !reportName.trim() ? 'Report name is required' : undefined}
        />
        <TextAreaWithLabel
          label="Description (Optional)"
          value={reportDescription}
          onChange={e => setReportDescription(e.target.value)}
          placeholder="Add a brief description of this report..."
          rows={3}
        />

        <Divider />

              <FlexLayout alignItems="center" itemGap="S">
        <FilterIcon />
        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ fontWeight: 600 }}>
          Select Filters
        </TextLabel>
      </FlexLayout>

        <InputWithLabel
          label="Component"
          value={reportComponent}
          onChange={e => setReportComponent(e.target.value)}
          placeholder="e.g., Storage, Networking, Prism Central"
          error={isDirty && !reportComponent.trim()}
          helpText={isDirty && !reportComponent.trim() ? 'Component is required' : undefined}
        />

        <FlexLayout itemGap="S">
          <DatePickerWithLabel
            label="Start Date"
            oldDatePicker={false}
            onChange={date => setDateRangeStart(date)}
            value={dateRangeStart}
            error={isDirty && !dateRangeStart}
            helpText={isDirty && !dateRangeStart ? 'Start date is required' : undefined}
          />
          <DatePickerWithLabel
            label="End Date"
            oldDatePicker={false}
            onChange={date => setDateRangeEnd(date)}
            value={dateRangeEnd}
            error={isDirty && !dateRangeEnd}
            helpText={isDirty && !dateRangeEnd ? 'End date is required' : undefined}
          />
        </FlexLayout>

        <InputWithLabel
          label="Account (Optional)"
          value={accountName}
          onChange={e => setAccountName(e.target.value)}
          placeholder="Search account name..."
        />
      </FlexLayout>
    </StackingLayout>
  );

  // Render Upload CSV form
  const renderUploadCsvForm = () => (
    <StackingLayout itemGap="S">
      <FlexLayout flexDirection="column" itemGap="S">
        <InputWithLabel
          label={<span>Report Name <span className={styles.required}>*</span></span>}
          value={reportName}
          onChange={e => setReportName(e.target.value)}
          placeholder="e.g., Q4 2025 Case Analysis"
          error={isDirty && !reportName.trim()}
          helpText={isDirty && !reportName.trim() ? 'Report name is required' : undefined}
        />
      </FlexLayout>

      <FlexLayout>
        <FlexItem flexGrow="1">
          <TextAreaWithLabel
            label="Description (Optional)"
            value={reportDescription}
            onChange={e => setReportDescription(e.target.value)}
            placeholder="Add a brief description of this report..."
            rows={3}
          />
        </FlexItem>
      </FlexLayout>

      <Divider />

      <FlexLayout alignItems="center" itemGap="S">
        <UploadIcon />
        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ fontWeight: 600 }}>
          Upload File
        </TextLabel>
      </FlexLayout>

      <div
        className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''} ${selectedFile ? styles.dropZoneHasFile : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!selectedFile ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />

        {selectedFile ? (
          <FlexLayout flexDirection="column" alignItems="center" itemSpacing="16px">
            <div className={styles.fileIconWrapper}>
              <ReportIcon />
            </div>
            <FlexLayout flexDirection="column" alignItems="center" itemSpacing="4px">
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ fontWeight: 600 }}>
                {selectedFile.name}
              </TextLabel>
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
                {(selectedFile.size / 1024).toFixed(2)} KB
              </TextLabel>
            </FlexLayout>
            <Button
              type={Button.ButtonTypes.SECONDARY}
              onClick={handleRemoveFile}
            >
              <CloseIcon /> Remove File
            </Button>
          </FlexLayout>
        ) : (
          <FlexLayout flexDirection="column" alignItems="center" itemGap="XS">
            <div className={styles.uploadIconWrapper}>
              <UploadIcon />
            </div>
            <FlexLayout flexDirection="column" alignItems="center" itemGap='XS'>
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY}>
                Drag and drop file here
              </TextLabel>
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
                or
              </TextLabel>
              <Button type={Button.ButtonTypes.PRIMARY}>
                Browse Files
              </Button>
            </FlexLayout>
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '12px' }}>
              CSV files only • Maximum size: 50MB
            </TextLabel>
          </FlexLayout>
        )}
      </div>

      {isDirty && !selectedFile && (
        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ color: '#ef4444' }}>
          Please upload a file to continue
        </TextLabel>
      )}

      {isParsing && (
        <FlexLayout alignItems="center" itemSpacing="10px">
          <Loader size="small" />
          <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Parsing file...</TextLabel>
        </FlexLayout>
      )}

      {previewError && (
        <Alert type={Alert.AlertTypes.ERROR} message={previewError} />
      )}
    </StackingLayout>
  );

  return (
    <Loader loading={isProceeding} tip="Generating report..." aria-live="polite" style={{ height: '100%' }}>
      <div className={styles.page}>
        <FlexLayout flexDirection="column" style={{ padding: '18px' }}>
          {/* Page Header */}
          <FlexLayout justifyContent="space-between" alignItems="center">
            <FlexLayout flexDirection="column" itemGap="S">
              <Title size="h2">Create New Report</Title>
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
                Select a data source to begin your case review and analysis
              </TextLabel>
            </FlexLayout>
            <Button type={Button.ButtonTypes.PRIMARY} onClick={() => navigate('/reports')}>
              <ReportIcon /> My Reports
            </Button>
          </FlexLayout>

          <FlexLayout justifyContent="center" style={{ width: '100%' }}>
          <FlexLayout flexDirection="column" style={{ width: '60%' }} itemGap="L">
            {/* Main Content Card */}
            <FlexLayout flexDirection="column" itemGap="L">
              {/* Step 1: Select Data Source */}
              <FlexLayout flexDirection="column" itemGap="M">
                <FlexLayout alignItems="center" itemGap="S">
                  <div className={styles.stepNumber}>1</div>
                  <Title size="h3">Select Data Source</Title>
                </FlexLayout>

                <FlexLayout itemGap="S">
                  {renderDataSourceCard(
                    DATA_SOURCES.FETCH_CASES,
                    'Fetch Cases from SFDC',
                    'Use filters to pull case data directly from the salesforce',
                    <ImportIcon />
                  )}
                  {renderDataSourceCard(
                    DATA_SOURCES.UPLOAD_CSV,
                    'Upload CSV File',
                    'Import local data from your computer (Max 50MB)',
                    <UploadIcon />
                  )}
                </FlexLayout>
              </FlexLayout>

              {/* Step 2: Configure Report - Only show when data source is selected */}
              {dataSource ? (
                <FlexLayout flexDirection="column" itemGap="L">
                  <FlexLayout alignItems="center" itemGap="S">
                    <div className={styles.stepNumber}>2</div>
                    <Title size="h3">Configure Report</Title>
                  </FlexLayout>

                  <FlexLayout flexDirection="column">
                    {dataSource === DATA_SOURCES.FETCH_CASES && renderFetchCasesForm()}
                    {dataSource === DATA_SOURCES.UPLOAD_CSV && renderUploadCsvForm()}
                  </FlexLayout>
                </FlexLayout>
              ) : (
                <FlexLayout
                  justifyContent="center"
                  alignItems="center"
                  padding="40px"
                  style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px' }}
                >
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
                    Select a data source above to continue
                  </TextLabel>
                </FlexLayout>
              )}
            </FlexLayout>

            {/* Help Banner */}
            <Alert
              type={Alert.AlertTypes.INFO}
              message={
                <span>
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ fontWeight: 600 }}>
                    Need help choosing?
                  </TextLabel>{' '}
                  <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
                    Use Fetch Cases for real-time data from the system, or Upload CSV for custom datasets and external analysis.
                  </TextLabel>{' '}
                  <Link href="#" onClick={e => e.preventDefault()}>
                    View documentation
                  </Link>
                </span>
              }
            />

            {/* Bottom Actions Bar */}
            <FlexLayout
              justifyContent="flex-end"
              alignItems="center"
              itemGap='S'
              
            >
{dataSource && (
                <Button type={Button.ButtonTypes.SECONDARY} onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type={Button.ButtonTypes.PRIMARY}
                onClick={handleProceed}
                disabled={!canProceed || uploading || isProceeding}
                loading={uploading || isProceeding}
              >
                Start Analysis <ChevronRightIcon />
              </Button>
            </FlexLayout>
          </FlexLayout>
          </FlexLayout>
        </FlexLayout>
      </div>
    </Loader>
  );
}

export default UploadData;
