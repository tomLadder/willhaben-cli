import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  registerUrlScheme,
  unregisterUrlScheme,
  isUrlSchemeRegistered,
} from "../../utils/url-scheme.js";

export function registerSetupCommands(program: Command): void {
  const setup = program
    .command("setup")
    .description("Configure willhaben CLI");

  setup
    .command("url-handler")
    .description("Register URL scheme handler for automatic OAuth callback")
    .option("--unregister", "Remove the URL scheme handler")
    .option("--status", "Check if URL handler is registered")
    .action(async (options) => {
      if (options.status) {
        const registered = await isUrlSchemeRegistered();
        if (registered) {
          console.log(chalk.green("URL handler is registered."));
          console.log(chalk.dim("OAuth callbacks will be handled automatically."));
        } else {
          console.log(chalk.yellow("URL handler is not registered."));
          console.log(chalk.dim("Run `willhaben setup url-handler` to enable automatic login."));
        }
        return;
      }

      if (options.unregister) {
        const spinner = ora("Removing URL handler...").start();
        try {
          await unregisterUrlScheme();
          spinner.succeed(chalk.green("URL handler removed."));
        } catch (err) {
          spinner.fail(chalk.red("Failed to remove URL handler"));
          console.error(chalk.red(err instanceof Error ? err.message : String(err)));
          process.exit(1);
        }
        return;
      }

      // Default: register
      const spinner = ora("Registering URL handler...").start();
      try {
        await registerUrlScheme();
        spinner.succeed(chalk.green("URL handler registered successfully!"));
        console.log();
        console.log(chalk.dim("The CLI will now automatically receive OAuth callbacks."));
        console.log(chalk.dim("When you run `willhaben login`, the browser will redirect"));
        console.log(chalk.dim("back to the CLI without manual code entry."));
      } catch (err) {
        spinner.fail(chalk.red("Failed to register URL handler"));
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        console.log();
        console.log(chalk.dim("You can still use the CLI with manual code entry."));
        process.exit(1);
      }
    });

  // Add a top-level shortcut
  program
    .command("setup-login")
    .description("Enable automatic OAuth login handling (shortcut)")
    .action(async () => {
      const isRegistered = await isUrlSchemeRegistered();
      if (isRegistered) {
        console.log(chalk.green("URL handler is already registered."));
        console.log(chalk.dim("OAuth callbacks will be handled automatically."));
        return;
      }

      const spinner = ora("Setting up automatic login...").start();
      try {
        await registerUrlScheme();
        spinner.succeed(chalk.green("Automatic login enabled!"));
        console.log();
        console.log(chalk.dim("Future logins will complete automatically."));
      } catch (err) {
        spinner.fail(chalk.red("Setup failed"));
        console.error(chalk.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}
