import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import StatsBar from '@/components/landing/StatsBar';
import FeaturesSection from '@/components/landing/FeaturesSection';
import WorkflowSection from '@/components/landing/WorkflowSection';
import SecuritySection from '@/components/landing/SecuritySection';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-dark-950 text-dark-100 font-sans overflow-x-hidden">
            <Navbar />
            <HeroSection />
            <StatsBar />
            <FeaturesSection />
            <WorkflowSection />
            <SecuritySection />
            <Footer />
        </div>
    );
}
