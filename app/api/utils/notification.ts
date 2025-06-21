import prisma from "@/app/libs/prismadb";
import { NotificationType } from "@prisma/client";

interface NotificationDetails {
  contactPhone?: string;
}

export async function sendNotification(
  userId: string,
  message: string,
  type: NotificationType = NotificationType.SYSTEM,
  details: NotificationDetails = {}
) {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }

    const isCancellation =
      message.toLowerCase().includes("cancelled") ||
      message.toLowerCase().includes("canceled");
    if (isCancellation) {
      message += " Please contact support if you have any questions.";
    }

    if (details.contactPhone) {
     
      const phone = details.contactPhone ? ` ${details.contactPhone}` : "";

      message += `  ${phone}`;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        type,
        contactPhone: details.contactPhone,
      },
    });

    return notification;
  } catch (error) {
    console.error("Failed to send notification:", error);
    throw new Error('Failed to send notification');
  }
}
