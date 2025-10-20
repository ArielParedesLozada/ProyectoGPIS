export default function MarketplaceLogo() {
    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            {/* Logo with M */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-xl">M</span>
            </div>
            {/* Brand name */}
            <span className="text-xl sm:text-2xl font-semibold text-blue-600">
                Marketplace
            </span>
        </div>
    );
}
