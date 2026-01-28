import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Select } from 'antd';
import { mockCaseClusters } from '../../data/mockAnalysis';
import styles from './ClusterView.module.css';

const { Option } = Select;

const TIME_RANGE_OPTIONS = [
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '90days', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const ICONS = {
  doc: (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  chip: (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
      />
    </svg>
  ),
};

function ClusterView() {
  useOutletContext(); // Available for future use
  const [componentFilter, setComponentFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('30days');

  const componentOptions = useMemo(() => {
    const uniq = Array.from(new Set(mockCaseClusters.map((c) => c.component))).sort((a, b) =>
      a.localeCompare(b),
    );
    return [{ value: 'all', label: 'All Components' }, ...uniq.map((c) => ({ value: c, label: c }))];
  }, []);

  const filteredClusters = useMemo(() => {
    const byComponent =
      componentFilter === 'all'
        ? mockCaseClusters
        : mockCaseClusters.filter((c) => c.component === componentFilter);

    // Time filter is present for UI parity with the reference.
    // When real data includes timestamps, hook it up here.
    return byComponent;
  }, [componentFilter]);

  const severityClass = (severity) => {
    switch (severity) {
      case 'high':
        return styles.severityHigh;
      case 'medium':
        return styles.severityMedium;
      case 'low':
        return styles.severityLow;
      default:
        return styles.severityDefault;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Case Clusters</h1>
          <p className={styles.pageSubtitle}>Cases grouped by semantic similarity</p>
        </div>

        {/* Filters (below header, left-aligned like reference) */}
        <div className={styles.filtersRow}>
          <Select
            value={componentFilter}
            onChange={setComponentFilter}
            className={styles.filterSelect}
            dropdownMatchSelectWidth={false}
          >
            {componentOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>

          <Select
            value={timeFilter}
            onChange={setTimeFilter}
            className={styles.filterSelect}
            dropdownMatchSelectWidth={false}
          >
            {TIME_RANGE_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </div>

        {/* Grid */}
        <div className={styles.clusterGrid}>
          {filteredClusters.map((cluster) => {
            const trendIsUp = String(cluster.trend || '').trim().startsWith('+');
            const trendText = String(cluster.trend || '').trim();
            return (
              <div
                key={cluster.id}
                className={styles.clusterCard}
                style={{ '--card-accent-color': cluster.color }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardTitleRow}>
                    <span
                      className={styles.clusterIndicator}
                      style={{ backgroundColor: cluster.color }}
                      aria-hidden="true"
                    />
                    <div className={styles.clusterName} title={cluster.name}>
                      {cluster.name}
                    </div>
                  </div>

                  <span className={`${styles.severityBadge} ${severityClass(cluster.severity)}`}>
                    {cluster.severity}
                  </span>
                </div>

                <div className={styles.cardMetaRow}>
                  <div className={styles.metaItem}>
                    {ICONS.doc}
                    <span className={styles.metaText}>{cluster.count} cases</span>
                  </div>
                  <div className={styles.metaItem}>
                    {ICONS.chip}
                    <span className={styles.metaText}>{cluster.component}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={`${styles.trendText} ${trendIsUp ? styles.trendUp : styles.trendDown}`}>
                      {trendText}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ClusterView;
