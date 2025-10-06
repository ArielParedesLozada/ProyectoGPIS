import { Head } from '@inertiajs/react';

interface HomeData {
    data?: string;
}

interface TestPageProps {
    homeData: HomeData;
    additionalData?: string;
}

export default function Test({ homeData, additionalData }: TestPageProps) {
    return (
        <div className='flex flex-col items-center justify-center'>
            <Head title="Página de Test" />
            <p>{homeData.data}</p>
            <p>{additionalData}</p>
        </div>
    );
}