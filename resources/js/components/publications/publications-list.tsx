import { Link } from "@inertiajs/react";
import { Paginated, Publication } from "@/types";
import PublicationCard from "./publication-card";

export default function PublicationList({ publications }: { publications: Paginated<Publication> }) {
    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Publicaciones</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {publications.data.map((p, _) => (
                    <PublicationCard key={_} publication={p} />
                ))}
            </div>

            {/* Paginación */}
            <div className="flex justify-center mt-6 gap-2">
                {publications.links.map((link, i) =>
                    link.url ? (
                        <Link
                            key={i}
                            href={link.url}
                            className={`px-3 py-1 border rounded ${link.active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                                }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ) : (
                        <span
                            key={i}
                            className="px-3 py-1 text-gray-400 cursor-not-allowed"
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    )
                )}
            </div>
        </div>
    );
}
