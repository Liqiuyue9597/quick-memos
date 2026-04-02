import { App } from "obsidian";

/**
 * Save a selected image into the vault's configured attachment location and
 * return the final vault path.
 */
export async function saveImageAttachment(
  app: App,
  file: Pick<File, "name" | "arrayBuffer">,
  sourcePath = ""
): Promise<string> {
  const attachmentPath = await app.fileManager.getAvailablePathForAttachment(
    file.name,
    sourcePath
  );
  const arrayBuffer = await file.arrayBuffer();
  await app.vault.createBinary(attachmentPath, arrayBuffer);
  return attachmentPath;
}
