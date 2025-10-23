import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    const getRoleDisplayName = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'Super Administrador';
            case 'admin':
                return 'Administrador';
            case 'moderator':
                return 'Moderador';
            case 'user':
                return 'Usuario';
            default:
                return role;
        }
    };

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {showEmail && (
                    <>
                        <span className="truncate text-xs text-muted-foreground">
                            {user.email}
                        </span>
                        <span className="truncate text-xs font-medium text-blue-600 dark:text-blue-400">
                            {getRoleDisplayName(user.role as string)}
                        </span>
                    </>
                )}
            </div>
        </>
    );
}
