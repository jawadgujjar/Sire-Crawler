"use server";

import { revalidatePath } from "next/cache";
import { getDb, toObjectId } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/dal";
import { str } from "@/lib/server/validate";
import { QUOTE_STATUSES } from "@/lib/plans";

async function assertAdmin() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Not authorised");
  return admin;
}

export async function updateQuote(formData) {
  const admin = await assertAdmin();
  const _id = toObjectId(String(formData.get("id")));
  const status = String(formData.get("status") || "");
  if (!_id) return;
  const set = { updatedAt: new Date(), updatedBy: admin.email };
  if (QUOTE_STATUSES.some((s) => s.id === status)) set.status = status;
  if (formData.has("note")) set.adminNote = str(formData.get("note"), 2000);
  const db = await getDb();
  await db.collection("quotes").updateOne({ _id }, { $set: set });
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
}

export async function setUserDisabled(formData) {
  const admin = await assertAdmin();
  const _id = toObjectId(String(formData.get("id")));
  if (!_id || String(_id) === admin.id) return; // admins can't lock themselves out
  const disabled = formData.get("disabled") === "true";
  const db = await getDb();
  // Bumping sessionVersion signs the user out everywhere when suspended
  await db.collection("users").updateOne(
    { _id, role: { $ne: "admin" } },
    disabled ? { $set: { disabled: true, updatedAt: new Date() }, $inc: { sessionVersion: 1 } } : { $set: { disabled: false, updatedAt: new Date() } }
  );
  revalidatePath("/admin/users");
}
