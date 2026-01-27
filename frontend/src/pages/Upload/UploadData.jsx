import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FlexLayout,
  FlexItem,
  Title,
  TextLabel,
  Button,
  Loader,
  StackingLayout,
  DashboardWidgetLayout,
  DashboardWidgetHeader,
} from '@nutanix-ui/prism-reactjs';
import { uploadReport } from '../../redux/slices/reportsSlice';
import styles from './UploadData.module.css';

function UploadData() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
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
      navigate(`/dashboard/${result.id}`);
    } catch (err) {
      console.error('Upload failed:', err);
      // For demo purposes, navigate anyway with a mock ID
      navigate('/dashboard/demo-report-1');
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <StackingLayout className={styles.uploadPage} padding="40px" itemSpacing="32px">
      {/* Page Header */}
      <StackingLayout itemSpacing="8px">
        <Title size="h2">Upload Case Data</Title>
        <TextLabel type="secondary">
          Upload your case report to start AI-powered analysis and get actionable insights
        </TextLabel>
      </StackingLayout>

      {/* Upload Widget */}
      <DashboardWidgetLayout
        header={
          <DashboardWidgetHeader title="Upload File" showCloseIcon={false} />
        }
        bodyContent={
          <StackingLayout padding="24px" itemSpacing="24px">
            {/* Drop Zone */}
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
                <StackingLayout alignItems="center" itemSpacing="8px">
                  <span className={styles.fileIcon}>📄</span>
                  <TextLabel className={styles.fileName}>{selectedFile.name}</TextLabel>
                  <TextLabel type="secondary">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </TextLabel>
                </StackingLayout>
              ) : (
                <StackingLayout alignItems="center" itemSpacing="8px">
                  <span className={styles.uploadIcon}>📁</span>
                  <TextLabel>Drag & drop your file here</TextLabel>
                  <TextLabel type="secondary">or click to browse</TextLabel>
                  <TextLabel type="secondary" className={styles.supportedFormats}>
                    Supported formats: CSV, Excel, JSON (Max 50MB)
                  </TextLabel>
                </StackingLayout>
              )}
            </div>

            {error && (
              <TextLabel className={styles.errorText}>
                Error: {typeof error === 'string' ? error : 'Upload failed'}
              </TextLabel>
            )}

            {/* Action Buttons */}
            <FlexLayout itemSpacing="12px">
              <Button
                type="primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <FlexLayout alignItems="center" itemSpacing="8px">
                    <Loader size="small" />
                    <span>Processing...</span>
                  </FlexLayout>
                ) : (
                  'Start Analysis'
                )}
              </Button>
              <Button type="secondary" onClick={() => navigate('/reports')}>
                View My Reports
              </Button>
            </FlexLayout>
          </StackingLayout>
        }
      />

      {/* Feature Cards */}
      <FlexLayout itemSpacing="24px" className={styles.features}>
        {[
          {
            icon: '🤖',
            title: 'AI Analysis',
            description: 'Intelligent case clustering and pattern detection',
          },
          {
            icon: '💬',
            title: 'NLP Chat',
            description: 'Ask questions about your data in natural language',
          },
          {
            icon: '📊',
            title: 'Visual Insights',
            description: 'Interactive charts and cluster visualizations',
          },
        ].map((feature, index) => (
          <FlexItem key={index} flexGrow="1">
            <DashboardWidgetLayout
              className={styles.featureCard}
              bodyContent={
                <StackingLayout alignItems="center" padding="24px" itemSpacing="12px">
                  <span className={styles.featureIcon}>{feature.icon}</span>
                  <Title size="h4">{feature.title}</Title>
                  <TextLabel type="secondary" className={styles.featureDesc}>
                    {feature.description}
                  </TextLabel>
                </StackingLayout>
              }
            />
          </FlexItem>
        ))}
      </FlexLayout>
    </StackingLayout>
  );
}

export default UploadData;
