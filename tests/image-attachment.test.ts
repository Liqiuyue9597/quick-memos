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

  it("rejects images larger than 20 MB", async () => {
    const app = new App();
    const getAvailablePathSpy = vi.spyOn(app.fileManager, "getAvailablePathForAttachment");
    const createBinarySpy = vi.spyOn(app.vault, "createBinary");

    const fakeFile = {
      name: "huge.png",
      size: 25 * 1024 * 1024, // 25 MB
      arrayBuffer: vi.fn(),
    };

    await expect(saveImageAttachment(app, fakeFile)).rejects.toThrow("Image too large");
    expect(getAvailablePathSpy).not.toHaveBeenCalled();
    expect(fakeFile.arrayBuffer).not.toHaveBeenCalled();
    expect(createBinarySpy).not.toHaveBeenCalled();
  });

  it("allows images exactly at the 20 MB limit", async () => {
    const app = new App();
    vi.spyOn(app.fileManager, "getAvailablePathForAttachment").mockResolvedValue("attachments/big.png");
    vi.spyOn(app.vault, "createBinary");

    const fakeFile = {
      name: "big.png",
      size: 20 * 1024 * 1024, // exactly 20 MB
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const path = await saveImageAttachment(app, fakeFile);
    expect(path).toBe("attachments/big.png");
  });

  it("propagates errors from getAvailablePathForAttachment", async () => {
    const app = new App();
    const pathError = new Error("no attachment path");
    const getAvailablePathSpy = vi
      .spyOn(app.fileManager, "getAvailablePathForAttachment")
      .mockRejectedValue(pathError);
    const createBinarySpy = vi.spyOn(app.vault, "createBinary");
    const fakeFile = {
      name: "photo.png",
      arrayBuffer: vi.fn(),
    };

    await expect(saveImageAttachment(app, fakeFile)).rejects.toThrow("no attachment path");
    expect(getAvailablePathSpy).toHaveBeenCalledTimes(1);
    expect(fakeFile.arrayBuffer).not.toHaveBeenCalled();
    expect(createBinarySpy).not.toHaveBeenCalled();
  });

  it("propagates errors from vault.createBinary", async () => {
    const app = new App();
    const writeError = new Error("write failed");
    vi.spyOn(app.fileManager, "getAvailablePathForAttachment").mockResolvedValue(
      "attachments/photo.png"
    );
    const createBinarySpy = vi
      .spyOn(app.vault, "createBinary")
      .mockRejectedValue(writeError);

    const fakeFile = {
      name: "photo.png",
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    await expect(saveImageAttachment(app, fakeFile)).rejects.toThrow("write failed");
    expect(fakeFile.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(createBinarySpy).toHaveBeenCalledTimes(1);
  });
});
