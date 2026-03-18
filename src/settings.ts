import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import type MemosPlugin from "./plugin";
import { importFlomoHtml } from "./flomo-import";
import { i18n, t } from "./i18n";

export class MemosSettingTab extends PluginSettingTab {
  plugin: MemosPlugin;

  constructor(app: App, plugin: MemosPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName(i18n.memosSettings).setHeading();

    new Setting(containerEl)
      .setName(i18n.saveFolder)
      .setDesc(i18n.saveFolderDesc)
      .addText((text) =>
        text
          .setPlaceholder("00-Inbox")
          .setValue(this.plugin.settings.saveFolder)
          .onChange(async (value) => {
            this.plugin.settings.saveFolder = value.trim() || "00-Inbox";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(i18n.useFixedTag)
      .setDesc(i18n.useFixedTagDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useFixedTag)
          .onChange(async (value) => {
            this.plugin.settings.useFixedTag = value;
            await this.plugin.saveSettings();
            this.display(); // re-render to show/hide tag input
          })
      );

    if (this.plugin.settings.useFixedTag) {
      new Setting(containerEl)
        .setName(i18n.fixedTagValue)
        .setDesc(i18n.fixedTagValueDesc)
        .addText((text) =>
          text
            .setPlaceholder("memo")
            .setValue(this.plugin.settings.fixedTag)
            .onChange(async (value) => {
              this.plugin.settings.fixedTag = value.trim().replace(/^#+/, "");
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl).setName(i18n.extendedMetadata).setHeading();

    new Setting(containerEl)
      .setName(i18n.enableMood)
      .setDesc(i18n.enableMoodDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableMood)
          .onChange(async (value) => {
            this.plugin.settings.enableMood = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.enableMood) {
      new Setting(containerEl)
        .setName(i18n.moodOptions)
        .setDesc(i18n.moodOptionsDesc)
        .addText((text) =>
          text
            .setPlaceholder("💡, 🤔, 😊, 😤, 📖")
            .setValue(this.plugin.settings.moodOptions.join(", "))
            .onChange(async (value) => {
              this.plugin.settings.moodOptions = value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName(i18n.enableSource)
      .setDesc(i18n.enableSourceDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableSource)
          .onChange(async (value) => {
            this.plugin.settings.enableSource = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.enableSource) {
      new Setting(containerEl)
        .setName(i18n.sourceOptions)
        .setDesc(i18n.sourceOptionsDesc)
        .addText((text) =>
          text
            .setPlaceholder("thought, kindle, web, conversation, podcast")
            .setValue(this.plugin.settings.sourceOptions.join(", "))
            .onChange(async (value) => {
              this.plugin.settings.sourceOptions = value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl).setName(i18n.imageExport).setHeading();

    new Setting(containerEl)
      .setName(i18n.showAuthorName)
      .setDesc(i18n.showAuthorNameDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showAuthorInExport)
          .onChange(async (value) => {
            this.plugin.settings.showAuthorInExport = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.showAuthorInExport) {
      new Setting(containerEl)
        .setName(i18n.authorName)
        .setDesc(i18n.authorNameDesc)
        .addText((text) =>
          text
            .setPlaceholder("Your name")
            .setValue(this.plugin.settings.authorName)
            .onChange(async (value) => {
              this.plugin.settings.authorName = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName(i18n.showBranding)
      .setDesc(i18n.showBrandingDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showBrandingInExport)
          .onChange(async (value) => {
            this.plugin.settings.showBrandingInExport = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName(i18n.importHeading).setHeading();

    new Setting(containerEl)
      .setName(i18n.importFromFlomo)
      .setDesc(i18n.importFromFlomoDesc)
      .addButton((btn) =>
        btn
          .setButtonText(i18n.chooseHtmlFile)
          .setCta()
          .onClick(() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".html,.htm";
            input.addEventListener("change", async () => {
              const file = input.files?.[0];
              if (!file) return;

              new Notice(t("readingFile", { name: file.name }));
              try {
                const html = await file.text();
                const count = await importFlomoHtml(
                  this.app,
                  html,
                  this.plugin.settings.saveFolder
                );
                if (count > 0) {
                  new Notice(t("importSuccess", { count }));
                } else {
                  new Notice(i18n.importNoNew);
                }
              } catch (err) {
                new Notice(
                  t("importFailed", { err: err instanceof Error ? err.message : String(err) })
                );
              }
            });
            input.click();
          })
      );
  }
}
