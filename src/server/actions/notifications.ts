"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Opening the notifications page is what "reading" it means here — same mark-as-seen-on-open pattern already used for the WhatsApp inbox. */
export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new Error("Sessão inválida.");

  await prisma.notification.updateMany({
    where: { userId: session.user.id, channel: "IN_APP", status: { not: "READ" } },
    data: { status: "READ", readAt: new Date() },
  });
}
