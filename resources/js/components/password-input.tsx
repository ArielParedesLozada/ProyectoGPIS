import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
    showToggle?: boolean;
}

export default function PasswordInput({ showToggle = true, className, ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <Input
                type={showPassword ? 'text' : 'password'}
                className={cn("pr-10", className)}
                {...props}
            />
            {showToggle && (
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                </button>
            )}
        </div>
    );
}
