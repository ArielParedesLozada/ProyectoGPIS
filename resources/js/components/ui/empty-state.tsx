import { Button } from "@/components/ui/button";
import { Link } from "@inertiajs/react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    buttonText?: string;
    buttonHref?: string;
    buttonIcon?: LucideIcon;
    buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    buttonClassName?: string;
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    buttonText,
    buttonHref,
    buttonIcon: ButtonIcon,
    buttonVariant = "default",
    buttonClassName = ""
}: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
                {title}
            </h3>
            <p className="text-gray-500 mb-6">
                {description}
            </p>
            {buttonText && buttonHref && (
                <Link href={buttonHref}>
                    <Button 
                        variant={buttonVariant}
                        className={buttonClassName}
                    >
                        {ButtonIcon && <ButtonIcon className="w-4 h-4 mr-2" />}
                        {buttonText}
                    </Button>
                </Link>
            )}
        </div>
    );
}
