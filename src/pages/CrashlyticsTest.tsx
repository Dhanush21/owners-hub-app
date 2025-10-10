import React from 'react';
import { CrashlyticsTestSuite } from '../components/CrashlyticsTestSuite';
import Header from '../components/Header';

const CrashlyticsTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-6">
        <CrashlyticsTestSuite />
      </main>
    </div>
  );
};

export default CrashlyticsTest;
