import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * US-091 & US-093: System Settings & Site Branding
 */
export async function getPublicSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.setting.findMany({
      where: { isPublic: true },
    });

    const settingMap: Record<string, any> = {
      site_name: "FinTech ELMS",
      site_logo: "/logo.svg",
      maintenance_mode: "false",
      default_currency: "USD",
      contact_email: "support@fintechelms.com",
    };

    settings.forEach((s) => {
      settingMap[s.key] = s.value;
    });

    res.json({ data: settingMap });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch public settings", error: err.message });
  }
}

export async function getAllSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: "asc" },
    });

    res.json({ data: settings });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch settings", error: err.message });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const { settings } = req.body; // array of { key, value, type?, group?, isPublic?, label?, description? }

    if (!Array.isArray(settings)) {
      res.status(400).json({ message: "Settings must be an array of objects" });
      return;
    }

    const updated = [];
    for (const item of settings) {
      if (!item.key) continue;
      const s = await prisma.setting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: String(item.value),
          type: item.type || "string",
          group: item.group || "general",
          label: item.label,
          description: item.description,
          isPublic: item.isPublic !== undefined ? Boolean(item.isPublic) : false,
        },
        update: {
          value: String(item.value),
          ...(item.type && { type: item.type }),
          ...(item.group && { group: item.group }),
          ...(item.label && { label: item.label }),
          ...(item.description && { description: item.description }),
          ...(item.isPublic !== undefined && { isPublic: Boolean(item.isPublic) }),
        },
      });
      updated.push(s);
    }

    res.json({ message: "Settings updated successfully", data: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update settings", error: err.message });
  }
}
