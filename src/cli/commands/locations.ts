import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getLocationsForPostCode } from "../../api/locations.js";

export function registerLocationCommands(program: Command): void {
  program
    .command("locations <postcode>")
    .description("Look up the location ids for a postcode (for listing templates)")
    .option("--json", "Output as JSON")
    .action(async (postCode: string, opts) => {
      const spinner = ora("Looking up locations...").start();
      const result = await getLocationsForPostCode(postCode);

      if (!result.success || !result.data) {
        spinner.fail(chalk.red("Failed to look up locations"));
        console.error(chalk.red(result.error?.message || "Unknown error occurred"));
        process.exit(1);
      }
      spinner.stop();

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }

      if (result.data.length === 0) {
        console.log(chalk.yellow(`No locations found for postcode ${postCode}.`));
        return;
      }

      console.log(chalk.bold(`Locations for postcode ${postCode}:\n`));
      for (const location of result.data) {
        console.log(`  ${chalk.cyan(String(location.id).padEnd(8))} ${location.description}`);
      }
      console.log(chalk.dim(`\nUse in a template: "postCode": "${postCode}", "location": "<name>"`));
    });
}
