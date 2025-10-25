import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
    error?: string;
    className?: string;
}

export default function ErrorMessage({ error, className = "" }: ErrorMessageProps) {
    if (!error) return null;

    return (
        <div className={`flex items-center gap-1 mt-1 text-red-500 text-sm ${className}`}>
            <AlertCircle className="w-4 h-4" />
            {error}
        </div>
    );
}
