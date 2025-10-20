import { publicationView } from "@/routes";
import { Publication } from "@/types";
import { Link } from "@inertiajs/react";
import { Label } from "../ui/label";

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
                <div className="flex flex-row gap-2">
                    <Label className="bg-amber-400 rounded-2xl w-fit p-1.5">
                        <p>{publication.category.name}</p>
                    </Label>
                    <Label className="bg-amber-400 rounded-2xl w-fit p-1.5">
                        <p>{publication.type}</p>
                    </Label>
                </div>
                <p className="text-blue-600 font-bold mt-2">${publication.price}</p>
                <button>Peek</button>
            </div>
        </Link>

    )
}