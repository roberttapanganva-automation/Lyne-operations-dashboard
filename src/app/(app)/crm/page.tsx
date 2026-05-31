import { redirect } from "next/navigation";

type CrmRedirectPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmRedirectPage({
  searchParams,
}: CrmRedirectPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        nextSearchParams.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      nextSearchParams.set(key, value);
    }
  }

  const query = nextSearchParams.toString();
  redirect(query ? `/leads?${query}` : "/leads");
}
