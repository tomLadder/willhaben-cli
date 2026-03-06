import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { login, logout, whoami } from "../../api/auth.js";
import { isAuthenticated } from "../../store/config.js";

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Login to your willhaben account")
    .action(async () => {
      // Check if already logged in
      if (await isAuthenticated()) {
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: "You are already logged in. Do you want to re-login?",
          initial: false,
        });
        if (!confirm) return;
      }

      console.log(chalk.cyan("Starting OAuth login flow..."));
      console.log(chalk.dim("A browser window will open for you to login.\n"));

      const spinner = ora("Waiting for login...").start();

      const result = await login();

      if (result.success && result.data) {
        spinner.succeed(chalk.green("Logged in successfully!"));
        console.log(chalk.dim(`Logged in as: ${result.data.user.email}`));
        process.exit(0);
      } else {
        spinner.fail(chalk.red("Login failed"));
        console.error(chalk.red(result.error?.message || "Unknown error occurred"));
        process.exit(1);
      }
    });

  program
    .command("logout")
    .description("Logout from your willhaben account")
    .action(async () => {
      if (!(await isAuthenticated())) {
        console.log(chalk.yellow("You are not logged in."));
        return;
      }

      const spinner = ora("Logging out...").start();

      await logout();

      spinner.succeed(chalk.green("Logged out successfully!"));
    });

  program
    .command("whoami")
    .description("Show current logged in user")
    .action(async () => {
      if (!(await isAuthenticated())) {
        console.log(chalk.yellow("You are not logged in."));
        console.log(chalk.dim("Run `willhaben login` to login."));
        return;
      }

      const spinner = ora("Fetching user info...").start();

      const result = await whoami();

      if (result.success && result.data) {
        spinner.stop();
        console.log(chalk.bold("Logged in as:"));
        console.log(`  Email: ${chalk.cyan(result.data.email)}`);
        console.log(`  ID: ${chalk.dim(result.data.id)}`);
        if (result.data.name) {
          console.log(`  Name: ${result.data.name}`);
        }
      } else {
        spinner.fail(chalk.red("Failed to fetch user info"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
      }
    });
}
