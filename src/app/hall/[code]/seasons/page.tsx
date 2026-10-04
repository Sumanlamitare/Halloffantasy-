import { notFound, redirect } from "next/navigation";
import { Unavailable } from "@/components/ui";
import { getHall } from "@/lib/hall/queries";

export default async function SeasonsIndex({ params }: PageProps<"/hall/[code]/seasons">) {
  const hall = await getHall((await params).code);
  if (!hall) notFound();
  const latest = hall.records.allSeasons[0];
  if (!latest) return <Unavailable>No seasons imported yet.</Unavailable>;
  redirect(`/hall/${hall.league.code}/seasons/${latest}`);
}
