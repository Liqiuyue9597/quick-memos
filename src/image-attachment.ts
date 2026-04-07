import { App } from "obsidian";

/** Maximum allowed image size in bytes (20 MB). */
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

/**
 * Save a selected image into the vault's configured attachment location and
 * return the final vault path.
 */
export async function saveImageAttachment(
  app: App,
  file: Pick<File, "name" | "arrayBuffer"> & { size?: number },
  sourcePath = ""
): Promise<string> {
  if (typeof file.size === "number" && file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Image too large (${sizeMB} MB). Maximum allowed size is 20 MB.`);
  }

  const attachmentPath = await app.fileManager.getAvailablePathForAttachment(
    file.name,
    sourcePath
  );
  const arrayBuffer = await file.arrayBuffer();
  await app.vault.createBinary(attachmentPath, arrayBuffer);
  return attachmentPath;
}
