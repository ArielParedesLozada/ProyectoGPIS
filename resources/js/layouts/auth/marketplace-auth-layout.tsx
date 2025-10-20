import { type PropsWithChildren } from 'react';

interface MarketplaceAuthLayoutProps {
    children: React.ReactNode;
}

export default function MarketplaceAuthLayout({
    children,
}: PropsWithChildren<MarketplaceAuthLayoutProps>) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-0 w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-10 sm:left-20 w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            
            {/* Main content */}
            <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                    {children}
                </div>
            </div>
        </div>
    );
}
