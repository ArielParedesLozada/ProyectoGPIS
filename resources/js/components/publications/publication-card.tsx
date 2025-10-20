import { publicationView } from "@/routes";
import { Publication } from "@/types";
import { Link } from "@inertiajs/react";

interface PublicationCardProps {
    publication: Publication
}

export default function PublicationCard({ publication }: PublicationCardProps) {
    return (
        <Link href={publicationView(publication.id)} className="group">
            <div
                key={publication.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col"
            >
                <img
                    src={publication.image || "https://picsum.photos/200/160"}
                    alt={publication.title}
                    className="rounded-md mb-3 w-full h-40 object-cover"
                />
                <h3 className="font-semibold text-lg">{publication.title}</h3>
                <p className="text-gray-600 flex-grow">{publication.description}</p>
                <p className="text-blue-600 font-bold mt-2">${publication.price}</p>
                <button>Peek</button>
            </div>
        </Link>

    )
}