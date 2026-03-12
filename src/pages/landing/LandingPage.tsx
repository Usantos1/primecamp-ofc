import { useEffect } from 'react';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingProblem } from './LandingProblem';
import { LandingFeatures } from './LandingFeatures';
import { LandingComparison } from './LandingComparison';
import { LandingBenefits } from './LandingBenefits';
import { LandingDemonstracao } from './LandingDemonstracao';
import { LandingCTA } from './LandingCTA';
import { LandingFooter } from './LandingFooter';
import { APP_URL } from './constants';

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add('landing-page');
    document.body.classList.add('landing-page');
    return () => {
      document.documentElement.classList.remove('landing-page');
      document.body.classList.remove('landing-page');
    };
  }, []);

  const demoUrl = `${APP_URL}/demo`;

  return (
    <div className="min-h-screen bg-[#030504] text-[#F5F7F6] overflow-x-hidden font-sans antialiased">
      <LandingHeader />
      <main>
        <LandingHero demoUrl={demoUrl} />
        <LandingProblem />
        <LandingFeatures />
        <LandingComparison />
        <LandingBenefits />
        <LandingDemonstracao demoUrl={demoUrl} />
        <LandingCTA />
        <LandingFooter />
      </main>
    </div>
  );
}
