import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, saveConfig, setConfigValue, getConfigValue } from "../../store/config.js";
import type { Config } from "../../types/index.js";

const VALID_SETTINGS: Array<keyof Config["settings"]> = [
  "defaultCategory",
  "outputFormat",
];

export function registerConfigCommands(program: Command): void {
  const configCmd = program
    .command("config")
    .description("Manage CLI configuration");

  configCmd
    .command("get [key]")
    .description("Get configuration value(s)")
    .option("--json", "Output as JSON")
    .action(async function (this: Command, key?: string) {
      const opts = this.opts();
      const config = await loadConfig();

      if (key) {
        if (!VALID_SETTINGS.includes(key as keyof Config["settings"])) {
          console.error(chalk.red(`Unknown setting: ${key}`));
          console.log(chalk.dim(`Valid settings: ${VALID_SETTINGS.join(", ")}`));
          process.exit(1);
        }

        const value = config.settings[key as keyof Config["settings"]];
        if (opts.json) {
          console.log(JSON.stringify({ [key]: value }, null, 2));
        } else {
          console.log(`${key}: ${value ?? chalk.dim("(not set)")}`);
        }
      } else {
        if (opts.json) {
          console.log(JSON.stringify(config.settings, null, 2));
        } else {
          console.log(chalk.bold("Current settings:"));
          for (const setting of VALID_SETTINGS) {
            const value = config.settings[setting];
            console.log(`  ${setting}: ${value ?? chalk.dim("(not set)")}`);
          }
        }
      }
    });

  configCmd
    .command("set <key> <value>")
    .description("Set a configuration value")
    .action(async (key: string, value: string) => {
      if (!VALID_SETTINGS.includes(key as keyof Config["settings"])) {
        console.error(chalk.red(`Unknown setting: ${key}`));
        console.log(chalk.dim(`Valid settings: ${VALID_SETTINGS.join(", ")}`));
        process.exit(1);
      }

      // Validate specific settings
      if (key === "outputFormat" && !["pretty", "json"].includes(value)) {
        console.error(chalk.red('outputFormat must be "pretty" or "json"'));
        process.exit(1);
      }

      await setConfigValue(
        key as keyof Config["settings"],
        value as Config["settings"][keyof Config["settings"]]
      );
      console.log(chalk.green(`Set ${key} = ${value}`));
    });

  configCmd
    .command("reset")
    .description("Reset all configuration to defaults")
    .action(async () => {
      const prompts = await import("prompts");
      const { confirm } = await prompts.default({
        type: "confirm",
        name: "confirm",
        message: "Are you sure you want to reset all settings?",
        initial: false,
      });

      if (!confirm) {
        console.log(chalk.yellow("Cancelled."));
        return;
      }

      const config = await loadConfig();
      config.settings = { outputFormat: "pretty" };
      await saveConfig(config);
      console.log(chalk.green("Settings reset to defaults."));
    });

  configCmd
    .command("path")
    .description("Show configuration file path")
    .action(async () => {
      const { CONFIG_DIR, CONFIG_FILE } = await import("../../store/config.js");
      console.log(chalk.bold("Configuration directory:"));
      console.log(`  ${CONFIG_DIR}`);
      console.log(chalk.bold("Configuration file:"));
      console.log(`  ${CONFIG_FILE}`);
    });
}
