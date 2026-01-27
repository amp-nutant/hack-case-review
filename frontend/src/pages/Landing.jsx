import { useState, useEffect } from 'react';
import { Button, FlexLayout, Title, TextLabel } from '@nutanix-ui/prism-reactjs';
import api from '../services/api';
import styles from './Landing.module.css';

function Landing() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      setLoading(true);
      const response = await api.get('/health');
      setHealthStatus(response.data);
    } catch (error) {
      setHealthStatus({ status: 'error', message: 'API not reachable' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.landing}>
      <div className={styles.backgroundGradient} />
      <div className={styles.gridOverlay} />

      <main className={styles.content}>
        <div className={styles.heroSection}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Hackathon Project
          </div>

          <Title size="h1" className={styles.title}>
            Case Review
          </Title>

          <TextLabel className={styles.subtitle}>
            AI-powered case review and analysis platform built with React, Node.js, and MongoDB
          </TextLabel>

          <FlexLayout gap="20px" justifyContent="center" className={styles.actions}>
            <Button type="primary" onClick={checkApiHealth}>
              Check API Status
            </Button>
            <Button type="secondary">Get Started</Button>
          </FlexLayout>

          <div className={styles.statusCard}>
            <FlexLayout alignItems="center" gap="12px">
              <div
                className={`${styles.statusIndicator} ${loading
                    ? styles.loading
                    : healthStatus?.status === 'ok'
                      ? styles.healthy
                      : styles.error
                  }`}
              />
              <div>
                <TextLabel type="secondary" className={styles.statusLabel}>
                  Backend Status
                </TextLabel>
                <TextLabel className={styles.statusValue}>
                  {loading
                    ? 'Checking...'
                    : healthStatus?.status === 'ok'
                      ? 'Connected'
                      : 'Disconnected'}
                </TextLabel>
              </div>
            </FlexLayout>
          </div>
        </div>

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤖</div>
            <Title size="h4">LLM Integration</Title>
            <TextLabel type="secondary">
              Leverage AI models for intelligent case analysis
            </TextLabel>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <Title size="h4">Analytics</Title>
            <TextLabel type="secondary">Visualize case data with interactive charts</TextLabel>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🗄️</div>
            <Title size="h4">MongoDB</Title>
            <TextLabel type="secondary">Scalable document storage for case data</TextLabel>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Landing;

