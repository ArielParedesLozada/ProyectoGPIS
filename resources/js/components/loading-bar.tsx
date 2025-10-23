import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function LoadingBar() {
    const { processing } = usePage().props;
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (processing) {
            setIsVisible(true);
            setProgress(0);
            
            // Simulate progress
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 15;
                });
            }, 100);

            return () => clearInterval(interval);
        } else {
            // Complete the progress bar
            setProgress(100);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setProgress(0);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [processing]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 bg-gray-200">
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
