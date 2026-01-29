import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FlexLayout,
  FlexItem,
  StackingLayout,
  Title,
  TextLabel,
  Badge,
  Divider,
  FolderIcon,
  CPUIcon,
  MultiSelect,
  Select,
  Input,
  Popover,
  Link,
  StoreIcon,
  TimeIcon,
  InformationStatusIcon,
  Loader,
  Button,
} from '@nutanix-ui/prism-reactjs';

import analysisApi from '../../services/analysisApi';
import { Card } from '../../components/common';
import styles from './ClusterView.module.css';

// Sort options
const SORT_OPTIONS = [
  { key: 'count_desc', label: 'Most Cases' },
  { key: 'count_asc', label: 'Least Cases' },
  { key: 'name_asc', label: 'Alphabetical (A-Z)' },
  { key: 'name_desc', label: 'Alphabetical (Z-A)' },
];

// Severity levels based on case count - gives color meaning
const getSeverityInfo = (count) => {
  if (count >= 50) return { color: '#dc2626', label: 'Critical', level: 'critical' };
  if (count >= 20) return { color: '#f59e0b', label: 'High', level: 'high' };
  if (count >= 10) return { color: '#3b82f6', label: 'Medium', level: 'medium' };
  return { color: '#6b7280', label: 'Low', level: 'low' };
};

function ClusterView() {
  const { reportId } = useOutletContext();
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalClusters: 0,
    significantClusters: 0,
    singletonClusters: 0,
    totalCases: 0,
    casesInSignificantClusters: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadClusters = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await analysisApi.getClusters(reportId || 'latest');
        const rawClusters = Array.isArray(response.data) ? response.data : [];

        // Only include significant clusters
        const significantClusters = rawClusters.filter((c) => c?.is_significant === true);

        const mappedClusters = significantClusters.map((cluster, index) => {
          const count = Number(cluster?.size ?? 0);
          const product = cluster?.dominant_product || 'Unknown';
          const severity = getSeverityInfo(count);
          // Extract case subjects for tooltip 
          const casesList = (cluster?.cases || []).map((c) => ({
            caseNumber: c?.case_number || 'N/A',
            subject: c?.subject || 'Untitled',
            priority: c?.priority || 'N/A',
          }));
          return {
            id: cluster?._id ?? `${cluster?.generated_name || 'cluster'}-${index}`,
            name: cluster?.generated_name || 'Untitled Cluster',
            description: cluster?.cases?.[0]?.subject || 'Issues grouped by semantic similarity',
            count,
            component: product,
            severity,
            themeKeywords: cluster?.theme_keywords?.slice(0, 6) || [],
            avgResolutionDays: cluster?.avg_resolution_days || 0,
            uniqueAccounts: cluster?.unique_accounts || 0,
            cases: casesList,
          };
        });

        // Calculate summary stats
        const totalCases = rawClusters.reduce((sum, c) => sum + (c?.size || 0), 0);
        const casesInSignificant = significantClusters.reduce((sum, c) => sum + (c?.size || 0), 0);

        if (isMounted) {
          setClusters(mappedClusters);
          setSummary({
            totalClusters: rawClusters.length,
            significantClusters: significantClusters.length,
            singletonClusters: rawClusters.filter((c) => (c?.size || 0) === 1).length,
            totalCases,
            casesInSignificantClusters: casesInSignificant,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load clusters');
          setClusters([]);
          setSummary({
            totalClusters: 0,
            significantClusters: 0,
            singletonClusters: 0,
            totalCases: 0,
            casesInSignificantClusters: 0,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadClusters();

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  // Extract unique components from clusters for MultiSelect
  const componentOptions = useMemo(() => {
    const uniq = Array.from(new Set(clusters.map((c) => c.component))).sort((a, b) =>
      a.localeCompare(b),
    );
    return uniq.map((c) => ({ key: c, id: c, label: c }));
  }, [clusters]);

  // Filter and sort clusters
  const filteredClusters = useMemo(() => {
    let result = [...clusters];

    // Filter by search query (title)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    // Filter by selected components (show clusters that match ANY selected component)
    if (selectedComponents.length > 0) {
      result = result.filter((c) => selectedComponents.includes(c.component));
    }

    // Sort
    result.sort((a, b) => {
      switch (selectedSort.key) {
        case 'count_desc':
          return b.count - a.count;
        case 'count_asc':
          return a.count - b.count;
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [clusters, searchQuery, selectedComponents, selectedSort]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <FlexLayout
          alignItems="center"
          justifyContent="center"
          style={{ height: '100%', minHeight: '400px' }}
        >
          <StackingLayout itemGap="S" style={{ alignItems: 'center' }}>
            <Loader />
            <TextLabel>Loading issue groupings...</TextLabel>
          </StackingLayout>
        </FlexLayout>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <FlexLayout
          alignItems="center"
          justifyContent="center"
          style={{ height: '100%', minHeight: '400px' }}
        >
          <StackingLayout itemGap="S" style={{ alignItems: 'center' }}>
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ color: '#dc2626' }}>
              {error}
            </TextLabel>
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
              Please try refreshing the page.
            </TextLabel>
          </StackingLayout>
        </FlexLayout>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container} style={{ padding: '18px' }}>
        {/* Header */}
        <FlexLayout justifyContent="space-between" alignItems="center" style={{ marginBottom: '20px' }}>
          <FlexLayout alignItems="center" itemGap="L">
            <Title size="h2">Issue Groups</Title>
            <FlexLayout alignItems="center" itemGap="S">
              <Badge color="blue" count={`${summary.significantClusters} clusters`} />
              <Badge color="green" count={`${summary.casesInSignificantClusters} cases grouped`} />
              
            </FlexLayout>
          </FlexLayout>
        </FlexLayout>

        {/* Filters */}
        <FlexLayout alignItems="center" itemGap="M" style={{ marginBottom: '20px' }} flexWrap="wrap">
          {/* Search by title */}
          <FlexItem style={{ minWidth: '200px', maxWidth: '300px' }}>
            <Input
              name="search-clusters"
              placeholder="Search by title..."
              search={true}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              clearButtonProps={{ 'aria-label': 'Clear search' }}
            />
          </FlexItem>

          {/* Component filter */}
          <div style={{ minWidth: '200px' }}>
            <MultiSelect
              placeholder="Component"
              rowsData={componentOptions}
              selectedRows={componentOptions.filter((c) => selectedComponents.includes(c.key))}
              onSelectedChange={(rows) => setSelectedComponents(rows.map((r) => r.key))}
              inputProps={{ placeholder: 'Search components...' }}
            />
          </div>

          {/* Sort */}
          <FlexLayout alignItems="center" itemGap="XS">
            <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>Sort:</TextLabel>
            <Select
              rowsData={SORT_OPTIONS.map((opt, idx) => ({ ...opt, key: idx, label: opt.label }))}
              selectedRow={selectedSort}
              onSelectedChange={(row) =>
                setSelectedSort(SORT_OPTIONS.find((o) => o.label === row.label) || SORT_OPTIONS[0])
              }
              style={{ minWidth: '160px' }}
            />
          </FlexLayout>

          {/* Severity Legend */}
          <FlexItem style={{ marginLeft: 'auto' }}>
            <FlexLayout alignItems="center" itemGap="S">
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} style={{ fontSize: '12px' }}>
                Severity:
              </TextLabel>
              <Badge color="red" count="50+ cases" />
              <Badge color="orange" count="20-49 cases" />
              <Badge color="blue" count="10-19 cases" />
              <Badge color="gray" count="<10 cases" />
            </FlexLayout>
          </FlexItem>
        </FlexLayout>

        {/* Cluster Cards Grid */}
        {filteredClusters.length === 0 ? (
          <FlexLayout
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '200px', padding: '40px' }}
          >
            <StackingLayout itemGap="S" style={{ alignItems: 'center' }}>
              <FolderIcon style={{ width: 48, height: 48, color: '#9ca3af' }} />
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} style={{ fontSize: '16px' }}>
                {clusters.length === 0 ? 'No issue groupings found' : 'No issue groupings match your filters'}
              </TextLabel>
              <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}>
                {clusters.length === 0
                  ? 'Upload data and run analysis to generate clusters.'
                  : 'Try adjusting your search or filter criteria.'}
              </TextLabel>
            </StackingLayout>
          </FlexLayout>
        ) : (
        <div className={styles.clusterGrid}>
          {filteredClusters.map((cluster) => {
            // Popover content for cases list
            const casesPopoverContent = cluster.cases && cluster.cases.length > 0 ? (
                <StackingLayout itemGap="XS" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {cluster.cases.map((c, idx) => (
                    <FlexLayout
                      key={idx}
                      alignItems="flex-start"
                      itemGap="S"
                      style={{ padding: '6px 0', borderBottom: idx < cluster.cases.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                    >
                      <Link
                        style={{ fontWeight: 600, fontSize: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        0{c.caseNumber}
                      </Link>
                      <TextLabel
                        type={TextLabel.TEXT_LABEL_TYPE.SECONDARY}
                        style={{
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.1',
                        }}
                      >
                        {c.subject}
                      </TextLabel>
                    </FlexLayout>
                  ))}
                </StackingLayout>
            ) : null;

            return (
              <div key={cluster.id} className={styles.clusterCardWrapper}>
                <Card className={styles.clusterCard} style={{ borderLeftColor: cluster.severity.color }}>
                  

                  <StackingLayout itemGap="S" style={{ padding: '12px', overflow: 'hidden' }}>
                    <FlexLayout alignItems="center" justifyContent="space-between" itemGap="S" style={{ minWidth: 0 }}>
                      {/* Title - truncated with tooltip on hover */}
                      <div className={styles.clusterTitleWrapper} title={cluster.name}>
                        <span className={styles.clusterName}>{cluster.name}</span>
                      </div>

                      {/* Info icon button with popover */}
                      <Popover
                        oldPopover={false}
                        content={casesPopoverContent}
                        title={'Cases in this cluster'}
                        getPopupContainer={(trigger) => trigger.parentNode}
                        showCaret={true}
                      >
                        <Button type={ Button.ButtonTypes.BORDERLESS } size="small"><InformationStatusIcon/></Button>
                      </Popover>
                    </FlexLayout>
                    
                    
                    {/* Top Row - Component badge */}
                    <FlexLayout justifyContent="space-between" alignItems="center">
                      <FlexLayout alignItems="center" itemGap="XS">
                        <CPUIcon />
                        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.PRIMARY} >
                          {cluster.component}
                        </TextLabel>
                      </FlexLayout>
                    </FlexLayout>

                    {/* Stats Row - Key metrics in a clean layout */}
                    <FlexLayout alignItems="center" justifyContent="space-between" itemGap="L" style={{ marginTop: '8px' }}>
                      <FlexLayout alignItems="center" itemGap="XS">
                        <FolderIcon />
                        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} >
                          {cluster.count} cases
                        </TextLabel>
                      </FlexLayout>

                      <FlexLayout alignItems="center" itemGap="XS">
                        <StoreIcon />
                        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} >
                          {cluster.uniqueAccounts} accounts
                        </TextLabel>
                      </FlexLayout>

                      <FlexLayout alignItems="center" itemGap="XS">
                        <TimeIcon  />
                        <TextLabel type={TextLabel.TEXT_LABEL_TYPE.SECONDARY} >
                          {cluster.avgResolutionDays.toFixed(1)} days (Avg resolution time)
                        </TextLabel>
                      </FlexLayout>
                    </FlexLayout>

                    {/* Tags - Only show if there are keywords */}
                    {cluster.themeKeywords.length > 0 && (
                      <>
                        <Divider style={{ margin: '8px 0' }} />
                        <FlexLayout alignItems="center" itemGap="XS" style={{ flexWrap: 'wrap' }}>
                          {cluster.themeKeywords.map((tag, idx) => (
                            <span key={idx} className={styles.tag}>
                              {tag}
                            </span>
                          ))}
                        </FlexLayout>
                      </>
                    )}
                  </StackingLayout>
                </Card>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

export default ClusterView;
