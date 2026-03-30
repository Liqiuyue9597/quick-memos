import { describe, it, expect, vi } from "vitest";
import { App } from "obsidian";

import { saveImageAttachment } from "../src/image-attachment";

describe("saveImageAttachment", () => {
  it("stores the image through fileManager and vault.createBinary", async () => {
    const app = new App();
    const getAvailablePathSpy = vi
      .spyOn(app.fileManager, "getAvailablePathForAttachment")
      .mockResolvedValue("attachments/photo.png");
    const createBinarySpy = vi.spyOn(app.vault, "createBinary");

    const fakeFile = {
      name: "photo.png",
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const path = await saveImageAttachment(app, fakeFile);

    expect(path).toBe("attachments/photo.png");
    expect(getAvailablePathSpy).toHaveBeenCalledWith("photo.png", "");
    expect(fakeFile.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(createBinarySpy).toHaveBeenCalledWith(
      "attachments/photo.png",
      expect.any(ArrayBuffer)
    );
  });
});
