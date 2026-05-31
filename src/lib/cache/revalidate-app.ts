import { revalidatePath } from "next/cache";

function revalidatePaths(paths: string[]) {
  for (const path of new Set(paths)) {
    revalidatePath(path);
  }
}

export function revalidateLeadPages() {
  revalidatePaths(["/leads", "/pipelines", "/dashboard", "/account"]);
}

export function revalidateClientPages() {
  revalidatePaths(["/leads", "/dashboard", "/account"]);
}

export function revalidateJobPages() {
  revalidatePaths(["/jobs", "/pipelines", "/dashboard", "/account"]);
}

export function revalidateTaskPages() {
  revalidatePaths(["/tasks", "/dashboard", "/account"]);
}

export function revalidateAccountPages() {
  revalidatePaths(["/account"]);
}
